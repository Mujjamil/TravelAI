'use strict';

const PLACE_CATALOG = {
  paris: ['Eiffel Tower', 'Louvre Museum', 'Montmartre', 'Seine River Cruise', 'Le Marais', 'Palace of Versailles'],
  bali: ['Ubud', 'Tegallalang Rice Terraces', 'Tanah Lot', 'Uluwatu Temple', 'Nusa Penida', 'Seminyak Beach'],
  tokyo: ['Senso-ji Temple', 'Shibuya Crossing', 'Meiji Shrine', 'teamLab Borderless', 'Tsukiji Outer Market', 'Tokyo Skytree'],
  dubai: ['Burj Khalifa', 'Dubai Marina', 'Al Fahidi District', 'Desert Safari', 'Palm Jumeirah', 'Museum of the Future'],
  london: ['Tower of London', 'British Museum', 'Westminster', 'Borough Market', 'Notting Hill', 'Greenwich'],
  singapore: ['Gardens by the Bay', 'Marina Bay', 'Sentosa', 'Chinatown', 'Singapore Botanic Gardens', 'Jewel Changi'],
  rome: ['Colosseum', 'Vatican Museums', 'Pantheon', 'Trevi Fountain', 'Trastevere', 'Roman Forum'],
  bangkok: ['Grand Palace', 'Wat Pho', 'Wat Arun', 'Chatuchak Market', 'Chao Phraya River', 'Yaowarat Road'],
  goa: ['Basilica of Bom Jesus', 'Fontainhas', 'Palolem Beach', 'Dudhsagar Falls', 'Anjuna Market', 'Chapora Fort'],
  iceland: ['Golden Circle', 'Blue Lagoon', 'Reykjavik', 'Jokulsarlon Glacier Lagoon', 'South Coast Waterfalls', 'Reynisfjara Beach'],
  'new york': ['Central Park', 'Statue of Liberty', 'Metropolitan Museum of Art', 'Times Square', 'Brooklyn Bridge', 'High Line'],
};

const COLD_DESTINATIONS = new Set(['iceland', 'norway', 'canada', 'alaska', 'finland', 'sweden', 'switzerland']);
const HOT_DESTINATIONS = new Set(['bali', 'dubai', 'bangkok', 'thailand', 'maldives', 'goa', 'singapore', 'zanzibar']);
const RAINY_MONTHS = new Set(['june', 'july', 'august', 'september', 'monsoon', 'rainy season']);
const COLD_MONTHS = new Set(['december', 'january', 'february', 'winter']);
const HOT_MONTHS = new Set(['may', 'june', 'july', 'august', 'summer']);

function getDays(value) {
  const match = String(value || '').match(/(\d+)/);
  if (String(value || '').toLowerCase() === 'weekend') return 2;
  return Math.max(1, Math.min(30, match ? Number(match[1]) : 7));
}

function destinationKey(destination) {
  return String(destination || '').trim().toLowerCase();
}

function getRecommendedPlaces(destination, placeType) {
  const key = destinationKey(destination);
  const typeKey = String(placeType || '').toLowerCase().trim();
  
  const typeTemplates = {
    'hill station': [
      `${destination} Mountain Peak Viewpoint`,
      `Scenic Trekking Trail in ${destination}`,
      `Local Hill Station Pine Forest`,
      `${destination} Nature Park & Botanical Gardens`,
      `Hillside Viewpoint & Tea Garden`,
      `Scenic Valley Day Trip from ${destination}`,
    ],
    'beach': [
      `${destination} Main Beach`,
      `${destination} Hidden Lagoon`,
      `Sunset Viewpoint by the sea in ${destination}`,
      `Snorkeling & Water Sports Spot`,
      `Local Coastal Market`,
      `Beachfront Dining Strip`,
    ],
    'adventure': [
      `${destination} Adventure Sports Camp`,
      `${destination} Hiking & Climbing Trail`,
      `Local Rafting & Ziplining Park`,
      `${destination} Outdoor Exploration Zone`,
      `Thrilling Canyon Tour`,
      `Off-road Safari near ${destination}`,
    ],
    'historical': [
      `${destination} Ancient Temple/Church`,
      `Heritage Museum of ${destination}`,
      `${destination} Historical Fort/Palace`,
      `Old Town Heritage Walk`,
      `Local Archaeological Site`,
      `Historic Library & Cultural Center`,
    ]
  };

  const names = typeTemplates[typeKey] || PLACE_CATALOG[key] || [
    `${destination} historic center`,
    `${destination} main landmark`,
    `${destination} local market`,
    `${destination} museum district`,
    `${destination} scenic viewpoint`,
    `Popular day trip from ${destination}`,
  ];

  return names.map((name, index) => ({
    rank: index + 1,
    name,
    reason: index < 2 ? 'Essential first-time visitor highlight' : index < 4 ? 'Highly recommended local experience' : 'Worth adding when time allows',
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${destination}`)}`,
  }));
}

function getClimate(destination, month) {
  const key = destinationKey(destination);
  const normalizedMonth = String(month || '').toLowerCase();
  if (COLD_DESTINATIONS.has(key) || COLD_MONTHS.has(normalizedMonth)) return 'cold';
  if (HOT_DESTINATIONS.has(key) || HOT_MONTHS.has(normalizedMonth)) return 'hot';
  if (RAINY_MONTHS.has(normalizedMonth)) return 'rainy';
  return 'mild';
}

function buildPackingList({ destination, duration, month, tripType }) {
  const days = getDays(duration);
  const climate = getClimate(destination, month);
  const type = String(tripType || 'general').toLowerCase();
  const tops = Math.min(days, 7);
  const bottoms = Math.max(2, Math.ceil(days / 3));
  const underwear = Math.min(days + 1, 9);

  const sections = [
    {
      title: 'Documents & money',
      items: ['Passport / government ID', 'Travel insurance details', 'Booking confirmations saved offline', 'Payment cards and emergency cash'],
    },
    {
      title: `Clothing for ${days} day${days === 1 ? '' : 's'}`,
      items: [`${tops} breathable tops`, `${bottoms} bottoms`, `${underwear} sets of underwear and socks`, 'Comfortable walking shoes', 'Sleepwear'],
    },
    {
      title: 'Tech & health',
      items: ['Phone charger and power bank', 'Universal travel adapter', 'Prescription medicines for the full trip', 'Small first-aid kit'],
    },
  ];

  const climateItems = {
    cold: ['Insulated waterproof jacket', 'Thermal base layers', 'Warm hat and gloves', 'Water-resistant boots', 'Lip balm and moisturizer'],
    hot: ['High-SPF sunscreen', 'Sun hat and sunglasses', 'Reusable water bottle', 'Lightweight quick-dry clothing', 'Electrolyte sachets'],
    rainy: ['Compact umbrella', 'Light rain jacket', 'Waterproof phone pouch', 'Quick-dry shoes', 'Resealable bags for electronics'],
    mild: ['Light jacket or cardigan', 'Layering pieces', 'Compact umbrella', 'Comfortable day bag'],
  };
  sections.push({ title: `${climate[0].toUpperCase()}${climate.slice(1)} weather`, items: climateItems[climate] });

  const typeItems = {
    adventure: ['Daypack', 'Reusable water bottle', 'Blister care', 'Trail-appropriate footwear'],
    beach: ['Two swimsuits', 'Sandals', 'Beach cover-up', 'Dry bag'],
    honeymoon: ['Smart evening outfit', 'Camera or phone tripod', 'Small day bag', 'Reservation confirmations'],
    family: ['Child medicines and documents', 'Snacks and refillable bottles', 'Compact entertainment', 'Spare outfit in carry-on'],
    business: ['Work clothes', 'Laptop and charger', 'Presentation backup', 'Business cards'],
    solo: ['Portable door lock or alarm', 'Offline maps', 'Emergency contact card', 'Compact cross-body bag'],
    cultural: ['Modest clothing for religious sites', 'Light scarf or wrap', 'Museum reservation confirmations', 'Comfortable walking shoes'],
  };
  if (typeItems[type]) sections.push({ title: `${type[0].toUpperCase()}${type.slice(1)} trip extras`, items: typeItems[type] });

  return { climate, days, sections };
}

function buildItinerary({ destination, duration, budget, tripType, placeType, companion }) {
  const days = getDays(duration);
  const places = getRecommendedPlaces(destination, placeType);
  const dailyBudget = (budget === 'luxury' ? 220 : budget === 'budget' ? 60 : 120) * 83;

  return Array.from({ length: days }, (_, index) => {
    const first = places[(index * 2) % places.length];
    const second = places[(index * 2 + 1) % places.length];
    
    const compKey = String(companion || '').toLowerCase().trim();
    let eveningText = index === days - 1
      ? 'Relax, shop for souvenirs, and prepare for departure.'
      : `Enjoy a well-reviewed neighborhood dinner in ${destination}.`;
      
    if (index !== days - 1) {
      if (compKey === 'family') {
        eveningText = `Enjoy a relaxed, family-friendly dinner at a local child-friendly restaurant in ${destination}.`;
      } else if (compKey === 'friends') {
        eveningText = `Experience the local night scene and have a fun dinner with friends in ${destination}.`;
      } else if (compKey === 'partner') {
        eveningText = `Have a romantic candlelight dinner with your partner at a scenic spot in ${destination}.`;
      } else if (compKey === 'solo') {
        eveningText = `Unwind and enjoy a quiet, cozy dinner at a local café in ${destination}.`;
      }
    }

    let morningText = `Visit ${first.name} early and allow time for photos.`;
    if (compKey === 'family') {
      morningText = `Visit ${first.name} at a comfortable pace with the family. Great spot for photos.`;
    } else if (compKey === 'friends') {
      morningText = `Head to ${first.name} early with the squad for some great group photos and sightseeing.`;
    }

    return {
      day: index + 1,
      title: `${first.name} and ${second.name}`,
      morning: morningText,
      afternoon: `Explore ${second.name}, followed by a local ${tripType || 'food and culture'} experience.`,
      evening: eveningText,
      estimatedDailyBudget: dailyBudget,
    };
  });
}

function buildMediaLinks(destination) {
  const query = `${destination} travel guide`;
  const encoded = encodeURIComponent(query);
  const hashtag = String(destination || 'travel').replace(/[^a-z0-9]/gi, '').toLowerCase();
  return [
    { type: 'video', platform: 'YouTube', label: `${destination} travel guides`, url: `https://www.youtube.com/results?search_query=${encoded}` },
    { type: 'video', platform: 'YouTube', label: `${destination} walking tours`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${destination} 4K walking tour`)}` },
    { type: 'social', platform: 'Instagram', label: `#${hashtag}`, url: `https://www.instagram.com/explore/tags/${hashtag}/` },
    { type: 'photo', platform: 'Unsplash', label: `${destination} travel photos`, url: `https://unsplash.com/s/photos/${encodeURIComponent(destination)}` },
    { type: 'photo', platform: 'Google Images', label: `${destination} inspiration`, url: `https://www.google.com/search?tbm=isch&q=${encoded}` },
  ];
}

function buildTripExtras(params) {
  return {
    itinerary: buildItinerary(params),
    packingList: buildPackingList(params),
    recommendedPlaces: getRecommendedPlaces(params.destination, params.placeType),
    media: buildMediaLinks(params.destination),
  };
}

module.exports = { buildTripExtras, getDays };
