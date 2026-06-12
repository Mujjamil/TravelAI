/**
 * Flight Data Service
 * Sources (priority order):
 *  1. Amadeus API (sandbox — real flight offer structure)
 *  2. SerpAPI / Google Flights scraper
 *  3. Realistic static estimates (always available fallback)
 *
 * Keys in .env:
 *   AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET
 *   SERPAPI_KEY
 */

const axios = require('axios');

// ── Airline name lookup ──────────────────────────────────────
const AIRLINE_NAMES = {
  'EK':'Emirates',           'SQ':'Singapore Airlines', 'QR':'Qatar Airways',
  'AI':'Air India',          '6E':'IndiGo',             'BA':'British Airways',
  'LH':'Lufthansa',          'AF':'Air France',          'KL':'KLM',
  'TK':'Turkish Airlines',   'EY':'Etihad Airways',     'UA':'United Airlines',
  'AA':'American Airlines',  'DL':'Delta',               'NH':'ANA',
  'JL':'Japan Airlines',     'MH':'Malaysia Airlines',   'TG':'Thai Airways',
  'CX':'Cathay Pacific',     'OZ':'Asiana Airlines',     'SG':'SpiceJet',
  'UK':'Vistara',            'WY':'Oman Air',            'MS':'EgyptAir',
  'ET':'Ethiopian Airlines', 'QF':'Qantas',              'NZ':'Air New Zealand',
  'AC':'Air Canada',         'WS':'WestJet',             'IB':'Iberia',
  'VY':'Vueling',            'FR':'Ryanair',             'U2':'easyJet',
  'W6':'Wizz Air',           'AY':'Finnair',             'SK':'SAS',
  'LX':'Swiss',              'OS':'Austrian Airlines',   'SN':'Brussels Airlines',
  'TP':'TAP Air Portugal',   'AZ':'ITA Airways',         'UX':'Air Europa',
  'VN':'Vietnam Airlines',   'BX':'Air Busan',           'FD':'Thai AirAsia',
  'AK':'AirAsia',            'QZ':'Indonesia AirAsia',   'OD':'Malindo Air',
  'MU':'China Eastern',      'CZ':'China Southern',      'CA':'Air China',
  'HU':'Hainan Airlines',    'G9':'Air Arabia',          'FZ':'flydubai',
  'WB':'RwandAir',           'KQ':'Kenya Airways',       'SA':'South African',
};

// ── IATA city codes ──────────────────────────────────────────
const IATA = {
  // Major global hubs
  'paris':'CDG',        'london':'LHR',       'tokyo':'NRT',        'dubai':'DXB',
  'new york':'JFK',     'nyc':'JFK',          'singapore':'SIN',    'bangkok':'BKK',
  'bali':'DPS',         'rome':'FCO',         'amsterdam':'AMS',    'barcelona':'BCN',
  'sydney':'SYD',       'toronto':'YYZ',      'los angeles':'LAX',  'miami':'MIA',
  'chicago':'ORD',      'frankfurt':'FRA',    'istanbul':'IST',     'hong kong':'HKG',
  'seoul':'ICN',        'beijing':'PEK',      'shanghai':'PVG',     'kuala lumpur':'KUL',
  'cairo':'CAI',        'nairobi':'NBO',      'johannesburg':'JNB', 'mexico city':'MEX',
  'sao paulo':'GRU',    'buenos aires':'EZE', 'lima':'LIM',
  'auckland':'AKL',     'new zealand':'AKL',  'reykjavik':'KEF',    'iceland':'KEF',
  'prague':'PRG',       'vienna':'VIE',       'zurich':'ZRH',       'milan':'MXP',
  'lisbon':'LIS',       'madrid':'MAD',       'athens':'ATH',       'santorini':'JTR',
  'cancun':'CUN',       'las vegas':'LAS',    'orlando':'MCO',      'boston':'BOS',
  'seattle':'SEA',      'san francisco':'SFO','washington':'IAD',   'berlin':'BER',
  // India
  'mumbai':'BOM',       'delhi':'DEL',        'bangalore':'BLR',    'goa':'GOI',
  'hyderabad':'HYD',    'chennai':'MAA',      'kolkata':'CCU',      'kathmandu':'KTM',
  'colombo':'CMB',      'dhaka':'DAC',        'jaipur':'JAI',       'kochi':'COK',
  'pune':'PNQ',         'ahmedabad':'AMD',    'varanasi':'VNS',     'amritsar':'ATQ',
  'lucknow':'LKO',      'nagpur':'NAG',       'indore':'IDR',       'bhopal':'BHO',
  // SE Asia + Pacific
  'maldives':'MLE',     'phuket':'HKT',       'hanoi':'HAN',        'ho chi minh':'SGN',
  'saigon':'SGN',       'taipei':'TPE',       'manila':'MNL',       'jakarta':'CGK',
  'osaka':'KIX',        'sapporo':'CTS',
  // Middle East + Africa
  'doha':'DOH',         'abu dhabi':'AUH',    'riyadh':'RUH',       'tel aviv':'TLV',
  'cape town':'CPT',    'casablanca':'CMN',   'muscat':'MCT',       'kuwait city':'KWI',
};

function getIATA(city) {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  return IATA[key] || city.toUpperCase().slice(0, 3);
}

// ── Duration formatter ───────────────────────────────────────
function formatDuration(pt) {
  if (!pt) return 'N/A';
  const h = parseInt(pt.match(/(\d+)H/)?.[1] || 0, 10);
  const m = parseInt(pt.match(/(\d+)M/)?.[1] || 0, 10);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return 'N/A';
}

// ── Time normalizer for SerpAPI "HH:MM" strings ──────────────
function toISO(dateStr, timeStr) {
  if (!timeStr) return '';
  if (timeStr.includes('T')) return timeStr;
  // SerpAPI returns "2024-06-15 08:30" or just "08:30"
  if (timeStr.includes(' ') && timeStr.length > 10) {
    return timeStr.replace(' ', 'T') + ':00';
  }
  return `${dateStr}T${timeStr}:00`;
}

// ── Amadeus token cache ──────────────────────────────────────
let amadeusToken = null;
let amadeusTokenExpiry = 0;

async function getAmadeusToken() {
  if (amadeusToken && Date.now() < amadeusTokenExpiry) return amadeusToken;
  if (!process.env.AMADEUS_CLIENT_ID) return null;
  try {
    const res = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
    );
    amadeusToken = res.data.access_token;
    amadeusTokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    return amadeusToken;
  } catch (e) {
    console.error('[Amadeus Auth]', e.message);
    return null;
  }
}

// ── Source 1: Amadeus Flight Search ─────────────────────────
async function searchAmadeusFlights(origin, destination, date, adults = 1) {
  const token = await getAmadeusToken();
  if (!token) return null;
  const orig = getIATA(origin);
  const dest = getIATA(destination);
  if (!orig || !dest) return null;
  try {
    const res = await axios.get('https://test.api.amadeus.com/v2/shopping/flight-offers', {
      headers: { Authorization: `Bearer ${token}` },
      params: { originLocationCode: orig, destinationLocationCode: dest, departureDate: date, adults, max: 8, currencyCode: 'USD' },
      timeout: 10000,
    });
    const offers = res.data.data || [];
    if (!offers.length) return null;
    return offers.slice(0, 6).map(o => {
      const itin = o.itineraries?.[0];
      const segs = itin?.segments || [];
      const stops = segs.length - 1;
      const code = o.validatingAirlineCodes?.[0] || 'Various';
      return {
        source: 'Amadeus',
        airline: code,
        airlineName: AIRLINE_NAMES[code] || code,
        flightNumber: segs[0]?.carrierCode && segs[0]?.number ? `${segs[0].carrierCode}${segs[0].number}` : undefined,
        price: parseFloat(o.price.total) * 83,
        currency: 'INR',
        duration: formatDuration(itin?.duration),
        stops,
        stopLabel: stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`,
        departure: segs[0]?.departure?.at || `${date}T00:00:00`,
        arrival: segs[segs.length - 1]?.arrival?.at || `${date}T00:00:00`,
        cabin: o.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY',
        origin: orig,
        destination: dest,
        bookingUrl: `https://www.google.com/flights?hl=en#flt=${orig}.${dest}.${date}`,
      };
    });
  } catch (e) {
    console.error('[Amadeus Flights]', e.response?.status || '', e.message);
    return null;
  }
}

// ── Source 2: SerpAPI / Google Flights ───────────────────────
async function searchSerpAPIFlights(origin, destination, date) {
  if (!process.env.SERPAPI_KEY) return null;
  const orig = getIATA(origin);
  const dest = getIATA(destination);
  try {
    const res = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_flights',
        api_key: process.env.SERPAPI_KEY,
        departure_id: orig,
        arrival_id: dest,
        outbound_date: date,
        currency: 'USD',
        hl: 'en',
      },
      timeout: 12000,
    });
    const offers = [
      ...(res.data.best_flights || []),
      ...(res.data.other_flights || []),
    ];
    if (!offers.length) return null;
    return offers.slice(0, 6).map(f => {
      const stops = (f.flights?.length || 1) - 1;
      const firstFlight = f.flights?.[0];
      const lastFlight = f.flights?.slice(-1)[0];
      const airlineCode = firstFlight?.airline_logo
        ? firstFlight.airline_logo.split('/').pop()?.replace('.png', '').replace('.svg', '').toUpperCase()
        : null;
      const airlineName = AIRLINE_NAMES[airlineCode] || firstFlight?.airline || 'Various Airlines';
      return {
        source: 'Google Flights',
        airline: airlineCode || 'XX',
        airlineName,
        price: f.price ? f.price * 83 : null,
        currency: 'INR',
        duration: f.total_duration ? `${Math.floor(f.total_duration / 60)}h ${f.total_duration % 60}m` : 'N/A',
        stops,
        stopLabel: stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`,
        departure: toISO(date, firstFlight?.departure_airport?.time),
        arrival: toISO(date, lastFlight?.arrival_airport?.time),
        origin: orig,
        destination: dest,
        cabin: 'ECONOMY',
        bookingUrl: `https://www.google.com/flights?hl=en#flt=${orig}.${dest}.${date}`,
      };
    });
  } catch (e) {
    console.error('[SerpAPI Flights]', e.response?.status || '', e.message);
    return null;
  }
}

// ── Source 3: Realistic estimates (always-available fallback) ─
function generateFlightEstimates(origin, destination, date) {
  const orig = getIATA(origin);
  const dest = getIATA(destination);

  const SHORT_HAUL = ['GOI','BOM','DEL','HYD','MAA','CCU','BLR','CMB','DAC','KTM',
                      'JAI','COK','PNQ','AMD','VNS','ATQ','LKO','GOA'];
  const LONG_HAUL  = ['JFK','LAX','SYD','AKL','GRU','EZE','LIM','YYZ','SEA','SFO'];
  const isShort = SHORT_HAUL.includes(orig) || SHORT_HAUL.includes(dest);
  const isLong  = LONG_HAUL.includes(dest)  || LONG_HAUL.includes(orig);

  const baseEconomy  = isShort ? 120 : isLong ? 850 : 450;
  const baseBusiness = baseEconomy * 3.5;

  const airlines = [
    { airline:'EK', name:'Emirates',          mult:1.15 },
    { airline:'SQ', name:'Singapore Airlines', mult:1.20 },
    { airline:'QR', name:'Qatar Airways',      mult:1.10 },
    { airline:'AI', name:'Air India',          mult:0.85 },
    { airline:'6E', name:'IndiGo',             mult:0.75 },
    { airline:'BA', name:'British Airways',    mult:1.12 },
    { airline:'LH', name:'Lufthansa',          mult:1.08 },
  ];

  return airlines.map((a, i) => {
    const isNonStop = i < 3;
    const stops     = isNonStop ? 0 : 1;
    const price     = Math.round(baseEconomy * a.mult * (isNonStop ? 1.1 : 1.0));
    const hrs       = isShort ? (3 + i * 0.5) : isLong ? (14 + i) : (7 + i);
    const hh        = Math.floor(hrs);
    const mm        = Math.round((hrs % 1) * 60);
    const depHour   = (6 + i * 2) % 24;
    const arrHour   = (depHour + hh) % 24;
    return {
      source: 'Estimated',
      airline: a.airline,
      airlineName: a.name,
      price: price * 83,
      priceBusiness: Math.round(baseBusiness * a.mult) * 83,
      currency: 'INR',
      duration: mm > 0 ? `${hh}h ${mm}m` : `${hh}h`,
      stops,
      stopLabel: stops === 0 ? 'Non-stop' : '1 stop',
      departure: `${date}T${String(depHour).padStart(2, '0')}:00:00`,
      arrival:   `${date}T${String(arrHour).padStart(2, '0')}:${mm > 0 ? String(mm).padStart(2,'0') : '00'}:00`,
      origin: orig,
      destination: dest,
      cabin: 'ECONOMY',
      bookingUrl: `https://www.google.com/flights?hl=en#flt=${orig}.${dest}.${date};c:USD;e:1;sd:1;t:f`,
      skyscannerUrl: `https://www.skyscanner.com/transport/flights/${orig.toLowerCase()}/${dest.toLowerCase()}/${date.replace(/-/g, '').slice(2)}/`,
    };
  });
}

// ── Airport coordinate map ───────────────────────────────────
const AIRPORT_COORDS = {
  'CDG':{ lat:49.0097,  lng:2.5479  }, 'LHR':{ lat:51.4700,  lng:-0.4543  },
  'NRT':{ lat:35.7720,  lng:140.3929}, 'DXB':{ lat:25.2532,  lng:55.3657  },
  'JFK':{ lat:40.6413,  lng:-73.7781}, 'SIN':{ lat:1.3644,   lng:103.9915 },
  'BKK':{ lat:13.6811,  lng:100.7474}, 'DPS':{ lat:-8.7482,  lng:115.1670 },
  'FCO':{ lat:41.8003,  lng:12.2389 }, 'AMS':{ lat:52.3086,  lng:4.7639   },
  'BOM':{ lat:19.0896,  lng:72.8656 }, 'DEL':{ lat:28.5665,  lng:77.1031  },
  'BLR':{ lat:13.1986,  lng:77.7066 }, 'GOI':{ lat:15.3808,  lng:73.8314  },
  'MLE':{ lat:4.1917,   lng:73.5290 }, 'HYD':{ lat:17.2403,  lng:78.4294  },
  'MAA':{ lat:12.9941,  lng:80.1709 }, 'CCU':{ lat:22.6520,  lng:88.4463  },
  'SYD':{ lat:-33.9399, lng:151.1753}, 'LAX':{ lat:33.9425,  lng:-118.4081},
  'ORD':{ lat:41.9742,  lng:-87.9073}, 'FRA':{ lat:50.0379,  lng:8.5622   },
  'IST':{ lat:40.9769,  lng:28.8146 }, 'HKG':{ lat:22.3080,  lng:113.9185 },
  'ICN':{ lat:37.4602,  lng:126.4407}, 'PEK':{ lat:40.0799,  lng:116.6031 },
  'KUL':{ lat:2.7456,   lng:101.7099}, 'CAI':{ lat:30.1219,  lng:31.4056  },
  'JNB':{ lat:-26.1392, lng:28.2460 }, 'GRU':{ lat:-23.4356, lng:-46.4731 },
  'AKL':{ lat:-37.0082, lng:174.7850}, 'KEF':{ lat:63.9850,  lng:-22.6056 },
  'PRG':{ lat:50.1008,  lng:14.2600 }, 'VIE':{ lat:48.1103,  lng:16.5697  },
  'ZRH':{ lat:47.4647,  lng:8.5492  }, 'MXP':{ lat:45.6306,  lng:8.7231   },
  'LIS':{ lat:38.7742,  lng:-9.1342 }, 'MAD':{ lat:40.4839,  lng:-3.5680  },
  'ATH':{ lat:37.9364,  lng:23.9445 }, 'CUN':{ lat:21.0365,  lng:-86.8771 },
  'LAS':{ lat:36.0840,  lng:-115.1537},'MCO':{ lat:28.4312,  lng:-81.3081 },
  'SFO':{ lat:37.6213,  lng:-122.3790},'BER':{ lat:52.3667,  lng:13.5033  },
  'BCN':{ lat:41.2974,  lng:2.0833  }, 'YYZ':{ lat:43.6777,  lng:-79.6248 },
  'DOH':{ lat:25.2609,  lng:51.6138 }, 'AUH':{ lat:24.4330,  lng:54.6511  },
  'HKT':{ lat:8.1132,   lng:98.3169 }, 'SGN':{ lat:10.8188,  lng:106.6519 },
  'HAN':{ lat:21.2212,  lng:105.8072}, 'TPE':{ lat:25.0777,  lng:121.2327 },
  'MNL':{ lat:14.5086,  lng:121.0194}, 'CGK':{ lat:-6.1256,  lng:106.6559 },
  'KIX':{ lat:34.4347,  lng:135.2440}, 'CPT':{ lat:-33.9648, lng:18.6017  },
  'JAI':{ lat:26.8242,  lng:75.8122 }, 'COK':{ lat:10.1520,  lng:76.4019  },
  'PNQ':{ lat:18.5822,  lng:73.9197 }, 'AMD':{ lat:23.0772,  lng:72.6347  },
  'KTM':{ lat:27.6966,  lng:85.3591 }, 'CMB':{ lat:7.1808,   lng:79.8841  },
};

// ── Date guard — reject past dates ───────────────────────────
function safeDate(date) {
  const today = new Date().toISOString().slice(0, 10);
  if (!date || date < today) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }
  return date;
}

async function searchRapidAPIFlights(origin, destination, date) {
  if (!process.env.RAPIDAPI_KEY) return null;
  const key = process.env.RAPIDAPI_KEY;
  const host = process.env.RAPIDAPI_FLIGHTS_HOST || 'sky-scrapper.p.rapidapi.com';

  try {
    // 1. Resolve Origin Airport Info
    const originRes = await axios.get(`https://${host}/api/v1/flights/searchAirport`, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host
      },
      params: {
        query: origin,
        locale: 'en-US'
      },
      timeout: 8000
    });

    const originData = originRes.data?.data;
    if (!originData || !originData.length) return null;
    const originSkyId = originData[0].skyId;
    const originEntityId = originData[0].entityId;

    // 2. Resolve Destination Airport Info
    const destRes = await axios.get(`https://${host}/api/v1/flights/searchAirport`, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host
      },
      params: {
        query: destination,
        locale: 'en-US'
      },
      timeout: 8000
    });

    const destData = destRes.data?.data;
    if (!destData || !destData.length) return null;
    const destSkyId = destData[0].skyId;
    const destEntityId = destData[0].entityId;

    // 3. Search Flights
    const searchRes = await axios.get(`https://${host}/api/v1/flights/searchFlights`, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host
      },
      params: {
        originSkyId,
        destinationSkyId,
        originEntityId,
        destinationEntityId,
        date,
        cabinClass: 'economy',
        currency: 'INR',
        market: 'en-US',
        countryCode: 'US'
      },
      timeout: 15000
    });

    const itineraries = searchRes.data?.data?.itineraries || [];
    if (!itineraries.length) return null;

    return itineraries.slice(0, 6).map(itin => {
      const price = itin.price?.raw || 0;
      const leg = itin.legs?.[0];
      const stops = leg?.stopCount || 0;
      const carrier = leg?.carriers?.marketing?.[0] || {};
      const carrierName = carrier.name || 'Various Airlines';
      const carrierCode = carrier.alternateId || 'XX';
      
      const durationHrs = leg?.durationInMinutes ? Math.floor(leg.durationInMinutes / 60) : 0;
      const durationMins = leg?.durationInMinutes ? leg.durationInMinutes % 60 : 0;
      const durationLabel = durationHrs > 0 ? `${durationHrs}h ${durationMins}m` : `${durationMins}m`;

      return {
        source: 'Sky-Scrapper (RapidAPI)',
        airline: carrierCode,
        airlineName: carrierName,
        price: price,
        currency: 'INR',
        duration: durationLabel,
        stops,
        stopLabel: stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`,
        departure: leg?.departure || `${date}T00:00:00`,
        arrival: leg?.arrival || `${date}T00:00:00`,
        origin: leg?.origin?.displayCode || originSkyId,
        destination: leg?.destination?.displayCode || destSkyId,
        cabin: 'ECONOMY',
        bookingUrl: `https://www.google.com/flights?hl=en#flt=${originSkyId}.${destSkyId}.${date}`,
        skyscannerUrl: `https://www.skyscanner.com/transport/flights/${originSkyId.toLowerCase()}/${destSkyId.toLowerCase()}/${date.replace(/-/g, '').slice(2)}/`,
      };
    });

  } catch (error) {
    console.error('[RapidAPI Sky-Scrapper Flights]', error.response?.status || '', error.message);
    return null;
  }
}

// ── Main entry point ─────────────────────────────────────────
async function getFlights(origin, destination, date) {
  date = safeDate(date);

  let flights = await searchRapidAPIFlights(origin, destination, date);
  if (!flights) flights = await searchAmadeusFlights(origin, destination, date);
  if (!flights) flights = await searchSerpAPIFlights(origin, destination, date);

  const isEstimated = !flights;
  if (!flights) flights = generateFlightEstimates(origin, destination, date);

  const orig = getIATA(origin);
  const dest = getIATA(destination);

  return {
    flights,
    isEstimated,
    route: {
      origin:      { iata: orig, city: origin, coords: AIRPORT_COORDS[orig] || null },
      destination: { iata: dest, city: destination, coords: AIRPORT_COORDS[dest] || null },
      date,
    },
  };
}

module.exports = { getFlights, getIATA };
