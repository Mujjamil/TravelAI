/**
 * Hotel Data Service
 * Sources (priority order):
 *  1. Amadeus Hotel Search (free sandbox)
 *  2. Foursquare Places API (free tier — real names, no prices)
 *  3. OpenTripMap API (free — POIs + hotels, no prices)
 *  4. Curated realistic data (always-available fallback)
 *
 * Keys in .env:
 *   AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET
 *   FOURSQUARE_API_KEY
 *   OPENTRIPMAP_API_KEY
 */

const axios = require('axios');

// ── City coordinates (for geocode-based search) ──────────────
const CITY_COORDS = {
  paris:          { lat:48.8566,  lng:2.3522   },
  london:         { lat:51.5074,  lng:-0.1278  },
  tokyo:          { lat:35.6762,  lng:139.6503 },
  dubai:          { lat:25.2048,  lng:55.2708  },
  'new york':     { lat:40.7128,  lng:-74.0060 },
  singapore:      { lat:1.3521,   lng:103.8198 },
  bali:           { lat:-8.3405,  lng:115.0920 },
  rome:           { lat:41.9028,  lng:12.4964  },
  bangkok:        { lat:13.7563,  lng:100.5018 },
  amsterdam:      { lat:52.3676,  lng:4.9041   },
  barcelona:      { lat:41.3851,  lng:2.1734   },
  maldives:       { lat:3.2028,   lng:73.2207  },
  istanbul:       { lat:41.0082,  lng:28.9784  },
  prague:         { lat:50.0755,  lng:14.4378  },
  sydney:         { lat:-33.8688, lng:151.2093 },
  vienna:         { lat:48.2082,  lng:16.3738  },
  lisbon:         { lat:38.7223,  lng:-9.1393  },
  seoul:          { lat:37.5665,  lng:126.9780 },
  'hong kong':    { lat:22.3193,  lng:114.1694 },
  santorini:      { lat:36.3932,  lng:25.4615  },
  iceland:        { lat:64.1355,  lng:-21.8954 },
  goa:            { lat:15.2993,  lng:74.1240  },
  delhi:          { lat:28.7041,  lng:77.1025  },
  mumbai:         { lat:19.0760,  lng:72.8777  },
  'kuala lumpur': { lat:3.1390,   lng:101.6869 },
  phuket:         { lat:7.8804,   lng:98.3923  },
  'new zealand':  { lat:-36.8485, lng:174.7633 },
  auckland:       { lat:-36.8485, lng:174.7633 },
  cancun:         { lat:21.1619,  lng:-86.8515 },
  'los angeles':  { lat:34.0522,  lng:-118.2437},
  miami:          { lat:25.7617,  lng:-80.1918 },
  doha:           { lat:25.2854,  lng:51.5310  },
  'abu dhabi':    { lat:24.4539,  lng:54.3773  },
};

function getCoords(city) {
  const key = city?.toLowerCase().trim() || '';
  return CITY_COORDS[key] || null;
}

// ── Estimated price by budget tier ──────────────────────────
const TIER_PRICE_EST = { budget: 55, 'mid-range': 140, luxury: 380 };

function estimatePrice(budgetTier) {
  const base = TIER_PRICE_EST[budgetTier] || 140;
  return base + Math.round((Math.random() * 30 - 15));
}

function buildHotelLinks(name, city, checkIn, checkOut) {
  const destination = `${name} ${city}`.trim();
  const dateParams = checkIn && checkOut
    ? `&checkin=${encodeURIComponent(checkIn)}&checkout=${encodeURIComponent(checkOut)}`
    : '';
  const agodaDates = checkIn && checkOut
    ? `&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
    : '';

  return {
    bookingUrl: `https://www.booking.com/search.html?ss=${encodeURIComponent(destination)}${dateParams}&group_adults=2&no_rooms=1`,
    agodaUrl: `https://www.agoda.com/search?textToSearch=${encodeURIComponent(destination)}${agodaDates}&rooms=1&adults=2`,
  };
}

// ── Amadeus token cache ──────────────────────────────────────
let _amadeusToken = null, _amadeusExpiry = 0;
async function getAmadeusToken() {
  if (_amadeusToken && Date.now() < _amadeusExpiry) return _amadeusToken;
  if (!process.env.AMADEUS_CLIENT_ID) return null;
  try {
    const res = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.AMADEUS_CLIENT_ID, client_secret: process.env.AMADEUS_CLIENT_SECRET }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
    );
    _amadeusToken = res.data.access_token;
    _amadeusExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    return _amadeusToken;
  } catch (e) { console.error('[Hotel Amadeus Auth]', e.message); return null; }
}

// ── Source 1: Amadeus Hotel Search ───────────────────────────
async function searchAmadeusHotels(city, checkIn, checkOut, budget) {
  const token = await getAmadeusToken();
  if (!token) return null;
  const coords = getCoords(city);
  if (!coords) return null;
  const { lat, lng } = coords;
  const priceMap = { budget: '100', 'mid-range': '300', luxury: '9999' };
  const maxPrice = priceMap[budget] || '300';
  try {
    const listRes = await axios.get('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode', {
      headers: { Authorization: `Bearer ${token}` },
      params: { latitude: lat, longitude: lng, radius: 5, radiusUnit: 'KM', hotelSource: 'ALL' },
      timeout: 10000,
    });
    const hotelIds = (listRes.data.data || []).slice(0, 20).map(h => h.hotelId);
    if (!hotelIds.length) return null;

    const offRes = await axios.get('https://test.api.amadeus.com/v3/shopping/hotel-offers', {
      headers: { Authorization: `Bearer ${token}` },
      params: { hotelIds: hotelIds.join(','), checkInDate: checkIn, checkOutDate: checkOut, adults: 2, currency: 'USD', bestRateOnly: true },
      timeout: 12000,
    });
    const results = (offRes.data.data || []).slice(0, 8).map(h => ({
      source: 'Amadeus',
      id: h.hotel.hotelId,
      name: h.hotel.name,
      rating: h.hotel.rating ? parseFloat(h.hotel.rating) : null,
      stars: h.hotel.rating ? parseInt(h.hotel.rating, 10) : null,
      price: (parseFloat(h.offers?.[0]?.price?.total || 0) || null) ? (parseFloat(h.offers?.[0]?.price?.total || 0) * 83) : null,
      pricePerNight: (parseFloat(h.offers?.[0]?.price?.base || 0) || null) ? (parseFloat(h.offers?.[0]?.price?.base || 0) * 83) : null,
      priceEstimated: false,
      currency: 'INR',
      address: h.hotel.address?.lines?.join(', ') || city,
      area: null,
      lat: h.hotel.latitude || lat,
      lng: h.hotel.longitude || lng,
      checkIn, checkOut,
      amenities: h.hotel.amenities?.slice(0, 5) || [],
      bookingUrl: `https://www.booking.com/search.html?ss=${encodeURIComponent(h.hotel.name + ' ' + city)}`,
      agodaUrl: `https://www.agoda.com/search?city=${encodeURIComponent(city)}`,
    }));
    return results.length >= 2 ? results : null;
  } catch (e) { console.error('[Amadeus Hotels]', e.response?.status || '', e.message); return null; }
}

// ── Source 2: Foursquare Places API ─────────────────────────
async function searchFoursquareHotels(city, budgetTier) {
  if (!process.env.FOURSQUARE_API_KEY) return null;
  const coords = getCoords(city);
  if (!coords) return null;
  const { lat, lng } = coords;
  try {
    const res = await axios.get('https://api.foursquare.com/v3/places/search', {
      headers: { Authorization: process.env.FOURSQUARE_API_KEY, Accept: 'application/json' },
      params: { query: 'hotel', ll: `${lat},${lng}`, limit: 10, categories: '19014' },
      timeout: 8000,
    });
    const places = res.data.results || [];
    if (!places.length) return null;
    return places.slice(0, 8).map(p => ({
      source: 'Foursquare',
      id: p.fsq_id,
      name: p.name,
      rating: p.rating || null,
      stars: null,
      price: estimatePrice(budgetTier) * 83,
      pricePerNight: estimatePrice(budgetTier) * 83,
      priceEstimated: true,
      currency: 'INR',
      address: p.location?.formatted_address || city,
      area: p.location?.neighborhood?.[0] || null,
      lat: p.geocodes?.main?.latitude || lat,
      lng: p.geocodes?.main?.longitude || lng,
      amenities: ['WiFi'],
      bookingUrl: `https://www.booking.com/search.html?ss=${encodeURIComponent(p.name + ' ' + city)}`,
      agodaUrl: `https://www.agoda.com/search?city=${encodeURIComponent(city)}`,
    }));
  } catch (e) { console.error('[Foursquare]', e.response?.status || '', e.message); return null; }
}

// ── Source 3: OpenTripMap ────────────────────────────────────
async function searchOpenTripMapHotels(city, budgetTier) {
  if (!process.env.OPENTRIPMAP_API_KEY) return null;
  const coords = getCoords(city);
  if (!coords) return null;
  const { lat, lng } = coords;
  try {
    const res = await axios.get('https://api.opentripmap.com/0.1/en/places/radius', {
      params: { radius: 3000, lon: lng, lat, kinds: 'accomodations', limit: 10, format: 'json', apikey: process.env.OPENTRIPMAP_API_KEY },
      timeout: 8000,
    });
    const places = (res.data || []).filter(p => p.name);
    if (!places.length) return null;
    return places.slice(0, 8).map(p => ({
      source: 'OpenTripMap',
      id: p.xid,
      name: p.name,
      rating: p.rate || null,
      stars: null,
      price: estimatePrice(budgetTier) * 83,
      pricePerNight: estimatePrice(budgetTier) * 83,
      priceEstimated: true,
      currency: 'INR',
      address: city,
      area: null,
      lat: p.point?.lat || lat,
      lng: p.point?.lon || lng,
      amenities: ['WiFi'],
      bookingUrl: `https://www.booking.com/search.html?ss=${encodeURIComponent(p.name + ' ' + city)}`,
      agodaUrl: `https://www.agoda.com/search?city=${encodeURIComponent(city)}`,
    }));
  } catch (e) { console.error('[OpenTripMap]', e.message); return null; }
}

// ── Source 4: Curated realistic hotel data ───────────────────
const CURATED = {
  paris: [
    { name:'Hôtel de Crillon',        stars:5, price:850,  area:'Place de la Concorde',  rating:9.4 },
    { name:'Le Bristol Paris',         stars:5, price:720,  area:'Faubourg Saint-Honoré', rating:9.2 },
    { name:'Hôtel Plaza Athénée',      stars:5, price:690,  area:'Avenue Montaigne',      rating:9.1 },
    { name:'Hôtel Monge',              stars:4, price:180,  area:'Latin Quarter',         rating:8.8 },
    { name:'Hotel Fabric',             stars:4, price:160,  area:'Oberkampf',             rating:8.7 },
    { name:'Generator Paris',          stars:2, price:45,   area:'République',            rating:7.8 },
    { name:"St Christopher's Paris",   stars:2, price:35,   area:'Gare du Nord',          rating:7.5 },
  ],
  bali: [
    { name:'Four Seasons Jimbaran Bay',stars:5, price:680,  area:'Jimbaran',              rating:9.5 },
    { name:'Viceroy Bali',             stars:5, price:450,  area:'Ubud',                  rating:9.3 },
    { name:'COMO Uma Ubud',            stars:5, price:390,  area:'Ubud',                  rating:9.2 },
    { name:'Katamama Hotel',           stars:5, price:320,  area:'Seminyak',              rating:9.0 },
    { name:'Alaya Resort Ubud',        stars:4, price:120,  area:'Ubud',                  rating:8.8 },
    { name:'Kuta Beach Club Hotel',    stars:3, price:55,   area:'Kuta',                  rating:7.9 },
    { name:'The Bali Dream Villa',     stars:3, price:40,   area:'Seminyak',              rating:7.7 },
  ],
  tokyo: [
    { name:'The Peninsula Tokyo',      stars:5, price:750,  area:'Hibiya',                rating:9.4 },
    { name:'Aman Tokyo',               stars:5, price:980,  area:'Otemachi',              rating:9.6 },
    { name:'Park Hyatt Tokyo',         stars:5, price:580,  area:'Shinjuku',              rating:9.2 },
    { name:'Shinjuku Granbell Hotel',  stars:4, price:180,  area:'Shinjuku',              rating:8.6 },
    { name:'Sotetsu Fresa Inn',        stars:3, price:90,   area:'Hakata',                rating:8.3 },
    { name:'Khaosan Tokyo Origami',    stars:2, price:35,   area:'Asakusa',               rating:8.0 },
  ],
  dubai: [
    { name:'Burj Al Arab',             stars:7, price:1800, area:'Jumeirah Beach',        rating:9.7 },
    { name:'Atlantis The Palm',        stars:5, price:650,  area:'Palm Jumeirah',         rating:9.0 },
    { name:'Armani Hotel Dubai',       stars:5, price:580,  area:'Burj Khalifa',          rating:9.1 },
    { name:'JW Marriott Marquis',      stars:5, price:280,  area:'Business Bay',          rating:8.9 },
    { name:'Rove Downtown Dubai',      stars:3, price:95,   area:'Downtown',              rating:8.5 },
    { name:'Ibis Styles Dubai',        stars:3, price:60,   area:'Jumeirah',              rating:7.8 },
  ],
  london: [
    { name:'The Savoy',                stars:5, price:680,  area:'Strand',                rating:9.3 },
    { name:"Claridge's",               stars:5, price:720,  area:'Mayfair',               rating:9.4 },
    { name:'The Ritz London',          stars:5, price:800,  area:'Piccadilly',            rating:9.2 },
    { name:'The Hoxton Shoreditch',    stars:4, price:180,  area:'Shoreditch',            rating:8.7 },
    { name:'citizenM Tower of London', stars:4, price:140,  area:'Tower Hill',            rating:8.8 },
    { name:"St Christopher's London",  stars:2, price:35,   area:'London Bridge',         rating:7.6 },
  ],
  singapore: [
    { name:'Marina Bay Sands',         stars:5, price:550,  area:'Marina Bay',            rating:9.1 },
    { name:'Raffles Singapore',        stars:5, price:800,  area:'City Hall',             rating:9.5 },
    { name:'The Fullerton Hotel',      stars:5, price:380,  area:'Fullerton',             rating:9.2 },
    { name:'Naumi Hotel',              stars:4, price:200,  area:'City Centre',           rating:8.9 },
    { name:'Ibis Singapore',           stars:3, price:90,   area:'Novena',                rating:8.0 },
  ],
  goa: [
    { name:'Taj Exotica Resort & Spa', stars:5, price:480,  area:'Benaulim Beach',        rating:9.3 },
    { name:'W Goa',                    stars:5, price:350,  area:'Vagator',               rating:9.1 },
    { name:'Alila Diwa Goa',           stars:5, price:280,  area:'Majorda',               rating:9.0 },
    { name:'The Park Calangute',       stars:4, price:120,  area:'Calangute',             rating:8.5 },
    { name:'Cidade de Goa',            stars:4, price:100,  area:'Panaji',                rating:8.3 },
    { name:'Zostel Goa',               stars:2, price:25,   area:'Anjuna',                rating:8.0 },
    { name:'Airlie Beach Hostel Goa',  stars:2, price:20,   area:'Baga',                  rating:7.7 },
  ],
  rome: [
    { name:'Hotel Hassler Roma',       stars:5, price:720,  area:'Spanish Steps',         rating:9.3 },
    { name:'The St. Regis Rome',       stars:5, price:680,  area:'Via Vittorio Veneto',   rating:9.2 },
    { name:'Palazzo Dama',             stars:5, price:420,  area:'Prati',                 rating:9.0 },
    { name:'Hotel Indigo Rome',        stars:4, price:190,  area:'St. Peter\'s',          rating:8.7 },
    { name:'The Beehive',              stars:3, price:70,   area:'Termini',               rating:8.4 },
    { name:'Generator Rome',           stars:2, price:32,   area:'Garbatella',            rating:7.9 },
  ],
  amsterdam: [
    { name:'Conservatorium Hotel',     stars:5, price:650,  area:'Museum Quarter',        rating:9.4 },
    { name:'Hotel V Nesplein',         stars:4, price:210,  area:'City Centre',           rating:8.9 },
    { name:'Kimpton De Witt',          stars:4, price:280,  area:'Dam Square',            rating:9.1 },
    { name:'Hotel Notting Hill',       stars:4, price:170,  area:'Vondelpark',            rating:8.7 },
    { name:'Stayokay Amsterdam',       stars:2, price:40,   area:'Vondelpark',            rating:8.0 },
    { name:'ClinkNOORD Hostel',        stars:2, price:30,   area:'NDSM Wharf',            rating:7.8 },
  ],
  barcelona: [
    { name:'Hotel Arts Barcelona',     stars:5, price:560,  area:'Barceloneta',           rating:9.2 },
    { name:'Mandarin Oriental Barcelona', stars:5, price:620, area:'Passeig de Gràcia',  rating:9.4 },
    { name:'Hotel Catalonia Atenas',   stars:4, price:180,  area:'Eixample',              rating:8.6 },
    { name:'Hotel 1898',               stars:5, price:320,  area:'La Rambla',             rating:9.0 },
    { name:'Sant Jordi Hostel Gracia', stars:2, price:35,   area:'Gràcia',                rating:8.2 },
    { name:'Generator Barcelona',      stars:2, price:28,   area:'Gràcia',                rating:8.0 },
  ],
  sydney: [
    { name:'Park Hyatt Sydney',        stars:5, price:780,  area:'The Rocks',             rating:9.5 },
    { name:'Four Seasons Sydney',      stars:5, price:620,  area:'The Rocks',             rating:9.2 },
    { name:'QT Sydney',                stars:5, price:480,  area:'CBD',                   rating:9.0 },
    { name:'Ovolo Woolloomooloo',      stars:4, price:280,  area:'Woolloomooloo',         rating:8.8 },
    { name:'YHA Sydney Central',       stars:2, price:45,   area:'Central Station',       rating:8.1 },
  ],
  istanbul: [
    { name:'Four Seasons Bosphorus',   stars:5, price:690,  area:'Beşiktaş',             rating:9.5 },
    { name:'Çırağan Palace Kempinski', stars:5, price:750,  area:'Beşiktaş',             rating:9.4 },
    { name:'Shangri-La Istanbul',      stars:5, price:540,  area:'Beşiktaş',             rating:9.2 },
    { name:'Georges Hotel Galata',     stars:4, price:180,  area:'Galata',                rating:8.9 },
    { name:'World House Hostel',       stars:2, price:30,   area:'Sultanahmet',           rating:8.3 },
  ],
  prague: [
    { name:'Four Seasons Prague',      stars:5, price:520,  area:'Old Town',              rating:9.4 },
    { name:'Mandarin Oriental Prague', stars:5, price:480,  area:'Malá Strana',           rating:9.3 },
    { name:'Hotel Josef',              stars:4, price:180,  area:'Old Town',              rating:8.8 },
    { name:'Hotel Kings Court',        stars:5, price:320,  area:'Old Town Square',       rating:9.0 },
    { name:'Sophie\'s Hostel',         stars:2, price:22,   area:'Nové Město',            rating:8.4 },
    { name:'Czech Inn Hostel',         stars:2, price:18,   area:'Vinohrady',             rating:8.1 },
  ],
  maldives: [
    { name:'Soneva Jani',              stars:5, price:2800, area:'Noonu Atoll',           rating:9.8 },
    { name:'Gili Lankanfushi',         stars:5, price:2200, area:'North Malé Atoll',      rating:9.7 },
    { name:'Conrad Maldives',          stars:5, price:1800, area:'Rangali Island',        rating:9.6 },
    { name:'Coco Bodu Hithi',          stars:5, price:1200, area:'North Malé Atoll',      rating:9.4 },
    { name:'Atmosphere Kanifushi',     stars:5, price:650,  area:'Lhaviyani Atoll',       rating:9.2 },
  ],
  bangkok: [
    { name:'Mandarin Oriental Bangkok',stars:5, price:680,  area:'Chao Phraya',           rating:9.5 },
    { name:'The Peninsula Bangkok',    stars:5, price:620,  area:'Chao Phraya',           rating:9.4 },
    { name:'137 Pillars Suites',       stars:5, price:480,  area:'Thonglor',              rating:9.2 },
    { name:'Novotel Bangkok Silom',    stars:4, price:120,  area:'Silom',                 rating:8.5 },
    { name:'Lub d Bangkok Silom',      stars:2, price:28,   area:'Silom',                 rating:8.2 },
    { name:'NapPark Hostel',           stars:2, price:22,   area:'Khaosan Road',          rating:7.9 },
  ],
  'new york': [
    { name:'The Plaza Hotel',          stars:5, price:950,  area:'Midtown',               rating:9.3 },
    { name:'The St. Regis New York',   stars:5, price:880,  area:'Midtown',               rating:9.4 },
    { name:'1 Hotel Brooklyn Bridge',  stars:5, price:680,  area:'Brooklyn',              rating:9.2 },
    { name:'Arlo Midtown',             stars:4, price:280,  area:'Midtown',               rating:8.6 },
    { name:'Pod 51',                   stars:3, price:130,  area:'Midtown East',          rating:8.2 },
    { name:'HI NYC Hostel',            stars:2, price:55,   area:'Upper West Side',       rating:7.8 },
  ],
  mumbai: [
    { name:'Taj Mahal Palace',         stars:5, price:680,  area:'Colaba',                rating:9.4 },
    { name:'The Oberoi Mumbai',        stars:5, price:580,  area:'Nariman Point',         rating:9.3 },
    { name:'Four Seasons Mumbai',      stars:5, price:520,  area:'Worli',                 rating:9.1 },
    { name:'The Lalit Mumbai',         stars:5, price:280,  area:'CST',                   rating:8.8 },
    { name:'Hotel Sahil',              stars:3, price:70,   area:'Marine Lines',          rating:8.0 },
    { name:'Backpacker Panda',         stars:2, price:18,   area:'Colaba',                rating:7.8 },
  ],
  delhi: [
    { name:'The Leela Palace New Delhi',stars:5, price:680, area:'Chanakyapuri',          rating:9.5 },
    { name:'ITC Maurya',               stars:5, price:580,  area:'Chanakyapuri',          rating:9.3 },
    { name:'The Imperial New Delhi',   stars:5, price:520,  area:'Connaught Place',       rating:9.2 },
    { name:'Hyatt Regency Delhi',      stars:5, price:280,  area:'Bhikaji Cama Place',    rating:8.8 },
    { name:'Hotel Palace Heights',     stars:3, price:65,   area:'Connaught Place',       rating:8.2 },
    { name:'Zostel Delhi',             stars:2, price:18,   area:'Paharganj',             rating:7.9 },
  ],
  'kuala lumpur': [
    { name:'The Ritz-Carlton KL',      stars:5, price:520,  area:'KLCC',                  rating:9.3 },
    { name:'Mandarin Oriental KL',     stars:5, price:480,  area:'KLCC',                  rating:9.2 },
    { name:'Hotel Maya KL',            stars:4, price:180,  area:'KLCC',                  rating:8.7 },
    { name:'Travelodge KL City Centre',stars:3, price:60,   area:'Bukit Bintang',         rating:8.0 },
    { name:'Reggae Mansion Hostel',    stars:2, price:20,   area:'Chinatown',             rating:8.1 },
  ],
  seoul: [
    { name:'The Shilla Seoul',         stars:5, price:580,  area:'Jangchung-dong',        rating:9.4 },
    { name:'Park Hyatt Seoul',         stars:5, price:520,  area:'Gangnam',               rating:9.2 },
    { name:'Lotte Hotel Seoul',        stars:5, price:480,  area:'Myeong-dong',           rating:9.1 },
    { name:'Ibis Ambassador Seoul',    stars:3, price:90,   area:'Insadong',              rating:8.3 },
    { name:'Kim\'s Guesthouse',        stars:2, price:30,   area:'Hongdae',               rating:8.0 },
  ],
  'hong kong': [
    { name:'The Peninsula Hong Kong',  stars:5, price:980,  area:'Tsim Sha Tsui',         rating:9.6 },
    { name:'Four Seasons Hong Kong',   stars:5, price:850,  area:'Central',               rating:9.4 },
    { name:'Mandarin Oriental HK',     stars:5, price:780,  area:'Central',               rating:9.3 },
    { name:'Hotel ICON',               stars:4, price:280,  area:'Tsim Sha Tsui',         rating:9.0 },
    { name:'Mei Ho House Youth Hostel',stars:2, price:45,   area:'Sham Shui Po',          rating:8.0 },
  ],
};

// ── Generic fallback for unknown cities ──────────────────────
function generateGenericHotels(city, budgetTier) {
  const displayCity = city ? city.charAt(0).toUpperCase() + city.slice(1) : 'City';
  const templates = [
    { name:`Grand ${displayCity} Hotel`,       stars:5, priceMult:1.8,  rating:8.8 },
    { name:`${displayCity} Palace Suites`,     stars:5, priceMult:1.6,  rating:8.7 },
    { name:`The ${displayCity} Boutique`,      stars:4, priceMult:1.0,  rating:8.5 },
    { name:`${displayCity} City Hotel`,        stars:4, priceMult:0.9,  rating:8.3 },
    { name:`Comfort Inn ${displayCity}`,       stars:3, priceMult:0.6,  rating:8.0 },
    { name:`Budget Stay ${displayCity}`,       stars:2, priceMult:0.35, rating:7.7 },
    { name:`${displayCity} Central Hostel`,    stars:2, priceMult:0.25, rating:7.5 },
  ];
  const base = TIER_PRICE_EST[budgetTier] || 140;
  return templates.map(t => ({
    name: t.name,
    stars: t.stars,
    price: Math.round(base * t.priceMult),
    area: 'City Centre',
    rating: t.rating,
  }));
}

// ── Budget price filter ──────────────────────────────────────
const PRICE_FILTER = {
  budget:      h => h.price < 80,
  'mid-range': h => h.price >= 80  && h.price < 300,
  luxury:      h => h.price >= 300,
};

function getCuratedHotels(city, budgetTier, checkIn, checkOut) {
  const coords = getCoords(city) || { lat: 0, lng: 0 };
  const cityKey = city?.toLowerCase().trim() || '';
  const rawData = CURATED[cityKey] || generateGenericHotels(city, budgetTier);

  const filterFn = PRICE_FILTER[budgetTier] || (() => true);
  const filtered = rawData.filter(filterFn);
  const list = filtered.length >= 3 ? filtered : rawData;

  return list.slice(0, 8).map((h, i) => {
    const links = buildHotelLinks(h.name, city, checkIn, checkOut);
    return {
      source: 'Curated',
      id: `curated-${cityKey}-${i}`,
      name: h.name,
      stars: h.stars,
      rating: h.rating,
      price: h.price * 83,
      pricePerNight: h.price * 83,
      priceEstimated: false,
      currency: 'INR',
      area: h.area,
      address: `${h.area}, ${city}`,
      lat: coords.lat + (Math.random() - 0.5) * 0.04,
      lng: coords.lng + (Math.random() - 0.5) * 0.04,
      amenities: ['WiFi', 'Air Conditioning', 'Breakfast Available'],
      checkIn,
      checkOut,
      ...links,
    };
  });
}

const REVIEW_TEMPLATES = [
  { text: "Exceptional service, incredibly clean rooms, and perfect location!", author: "Sarah M." },
  { text: "Very friendly staff and comfortable beds. Breakfast was fantastic.", author: "David K." },
  { text: "Great value for money. Minor noise from the street, but otherwise perfect.", author: "Emily R." },
  { text: "Stunning views and top-notch amenities. Highly recommended!", author: "Michael B." },
  { text: "Boutique feel, super cozy, and very close to major attractions.", author: "Jessica T." },
  { text: "Clean and tidy. Check-in was fast and easy. Excellent Wi-Fi.", author: "James L." },
  { text: "Stunning room design, delicious dining options, and extremely attentive staff.", author: "Elena R." },
  { text: "A wonderful stay. The concierge was extremely helpful in booking local tours.", author: "Liam O." },
  { text: "Superb location and beautiful views. Room service was prompt.", author: "Sophia W." },
];

function getReviewsForHotel(name, rating) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index1 = Math.abs(hash) % REVIEW_TEMPLATES.length;
  const index2 = Math.abs(hash + 1) % REVIEW_TEMPLATES.length;
  
  const r1 = Math.min(10, Math.max(7, rating ? rating + 0.2 : 8.5)).toFixed(1);
  const r2 = Math.min(10, Math.max(6.5, rating ? rating - 0.4 : 8.1)).toFixed(1);
  
  return [
    { ...REVIEW_TEMPLATES[index1], rating: parseFloat(r1) },
    { ...REVIEW_TEMPLATES[index2], rating: parseFloat(r2) }
  ];
}

async function searchRapidAPIHotels(city, checkIn, checkOut, budgetTier) {
  if (!process.env.RAPIDAPI_KEY) return null;
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_HOST || 'booking-com.p.rapidapi.com';

  try {
    // 1. Resolve location name to dest_id and dest_type
    const locRes = await axios.get(`https://${host}/v1/hotels/locations`, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host
      },
      params: {
        name: city,
        locale: 'en-gb'
      },
      timeout: 8000
    });

    const locations = locRes.data || [];
    if (!locations.length) return null;
    const dest = locations[0];
    const destId = dest.dest_id;
    const destType = dest.dest_type;
    if (!destId || !destType) return null;

    // 2. Search hotels using destId and destType
    const searchRes = await axios.get(`https://${host}/v1/hotels/search`, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host
      },
      params: {
        dest_id: destId,
        dest_type: destType,
        checkin_date: checkIn,
        checkout_date: checkOut,
        adults_number: 2,
        room_number: 1,
        units: 'metric',
        order_by: 'popularity',
        locale: 'en-gb',
        currency: 'INR'
      },
      timeout: 12000
    });

    const results = searchRes.data?.result || searchRes.data || [];
    if (!Array.isArray(results) || !results.length) return null;

    return results.slice(0, 8).map(h => {
      const price = h.min_total_price || (h.price_breakdown ? parseFloat(h.price_breakdown.gross_amount) : estimatePrice(budgetTier) * 83);
      const lat = h.latitude ? parseFloat(h.latitude) : (getCoords(city)?.lat || 0);
      const lng = h.longitude ? parseFloat(h.longitude) : (getCoords(city)?.lng || 0);

      return {
        source: 'Booking.com (RapidAPI)',
        id: h.hotel_id ? String(h.hotel_id) : `rapidapi-${Math.random()}`,
        name: h.hotel_name || h.name || 'Hotel',
        stars: h.class ? parseInt(h.class, 10) : null,
        rating: h.review_score ? parseFloat(h.review_score) : null,
        price: price,
        pricePerNight: price,
        priceEstimated: !h.min_total_price && !h.price_breakdown,
        currency: 'INR',
        address: h.address || city,
        area: h.district || h.city_trans || null,
        lat,
        lng,
        amenities: ['WiFi', 'Air Conditioning', 'Breakfast Available'],
        checkIn,
        checkOut,
      };
    });

  } catch (error) {
    console.error('[RapidAPI Booking.com Hotels]', error.response?.status || '', error.message);
    return null;
  }
}

// ── Main entry point ─────────────────────────────────────────
async function getHotels(city, checkIn, checkOut, budgetTier = 'mid-range') {
  const today = new Date();
  if (!checkIn) {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    checkIn = d.toISOString().slice(0, 10);
  }
  if (!checkOut) {
    const d = new Date(checkIn);
    d.setDate(d.getDate() + 7);
    checkOut = d.toISOString().slice(0, 10);
  }

  let hotels = await searchRapidAPIHotels(city, checkIn, checkOut, budgetTier);
  if (!hotels || hotels.length < 2) hotels = await searchAmadeusHotels(city, checkIn, checkOut, budgetTier);
  if (!hotels || hotels.length < 2) hotels = await searchFoursquareHotels(city, budgetTier);
  if (!hotels || hotels.length < 2) hotels = await searchOpenTripMapHotels(city, budgetTier);

  const isEstimated = !hotels || hotels.length < 2;
  if (isEstimated) hotels = getCuratedHotels(city, budgetTier, checkIn, checkOut);

  hotels = hotels.map((hotel) => {
    const rating = hotel.rating || (hotel.stars ? hotel.stars * 2 : 8.0);
    return {
      ...hotel,
      rating: hotel.rating || rating,
      reviews: getReviewsForHotel(hotel.name, rating),
      checkIn: hotel.checkIn || checkIn,
      checkOut: hotel.checkOut || checkOut,
      ...buildHotelLinks(hotel.name, city, checkIn, checkOut),
    };
  });

  const coords = getCoords(city) || { lat: 0, lng: 0 };
  return { hotels, isEstimated, city, coords, checkIn, checkOut };
}

module.exports = { getHotels, getCoords };
