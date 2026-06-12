/**
 * Response Engine
 * Generates structured, formatted bot responses for every intent.
 * All response logic lives here — clean, maintainable, and easy to extend.
 */

'use strict';

// ── Itinerary Data ─────────────────────────────────────────
const ITINERARY = {
  paris:     ['Eiffel Tower','Louvre Museum','Montmartre & Sacré-Cœur','Notre Dame','Musée d\'Orsay','Versailles','Seine River Cruise','Champs-Élysées','Arc de Triomphe','Luxembourg Gardens'],
  bali:      ['Ubud Monkey Forest','Tanah Lot Temple','Tegallalang Rice Terraces','Uluwatu Temple','Seminyak Beach','Mount Batur Trek','Tirta Empul Spring','Nusa Penida Island','Kuta Beach','Besakih Temple'],
  tokyo:     ['Senso-ji Temple','Shibuya Crossing','Tokyo Skytree','Meiji Shrine','Akihabara','Shinjuku Gyoen','teamLab Borderless','Tsukiji Market','Harajuku','Odaiba Waterfront'],
  dubai:     ['Burj Khalifa Deck','Dubai Mall','Palm Jumeirah','Gold Souk','Desert Safari','Dubai Frame','Jumeirah Mosque','Dubai Marina','Miracle Garden','Burj Al Arab'],
  london:    ['Tower of London','British Museum','Buckingham Palace','Big Ben','Borough Market','Tate Modern','Hyde Park','The Shard','Notting Hill','Covent Garden'],
  singapore: ['Gardens by the Bay','Marina Bay Sands','Sentosa Island','Chinatown','Little India','Clarke Quay','Universal Studios','Singapore Zoo','Orchard Road','Merlion Park'],
  maldives:  ['Snorkeling in lagoon','Overwater bungalow sunset','Dolphin cruise','Submarine excursion','Local island visit','Water sports','Spa day','Coral reef dive','Night fishing','Beach picnic'],
  iceland:   ['Golden Circle tour','Blue Lagoon','Northern Lights hunt','Jökulsárlón Glacier','Reykjavik Old Town','Waterfalls (Seljalandsfoss)','Geysir','Black Sand Beach','Whale watching','Lava caves'],
  rome:      ['Colosseum','Vatican Museums','Sistine Chapel','Trevi Fountain','Spanish Steps','Borghese Gallery','Pantheon','Trastevere','Campo de\' Fiori','Day trip to Pompeii'],
  bangkok:   ['Grand Palace','Wat Pho','Chatuchak Market','Khao San Road','Chao Phraya boat','Floating Markets','Jim Thompson House','Wat Arun','Night market','MBK Center'],
  default:   ['City Center Tour','National Museum','Historic Old Town','Local Market','Famous Landmark','Cultural District','Waterfront Walk','Popular Street Food Area','Scenic Viewpoint','Day Trip Nearby']
};

const TIPS = {
  paris: 'Buy a Paris Museum Pass to skip queues. Book Eiffel Tower tickets weeks in advance.',
  bali: 'Always carry a sarong for temple visits. Rent a scooter for easy local transport.',
  tokyo: 'Get a Suica/Pasmo IC card for all metro travel. Download Google Translate with Japanese offline.',
  dubai: 'Visit outdoor attractions before 10am or after 6pm to avoid peak heat.',
  london: 'Get an Oyster card for transport. Most major museums are completely free!',
  default: 'Research local customs before you go. Always carry some local cash.'
};

// ── Budget Data ────────────────────────────────────────────
const BUDGET = {
  budget:      { hotel: 30,  food: 20, activities: 15, transport: 10, flight: { short: 150, long: 450 } },
  'mid-range': { hotel: 100, food: 50, activities: 40, transport: 25, flight: { short: 250, long: 750 } },
  luxury:      { hotel: 300, food: 150, activities: 100, transport: 60, flight: { short: 500, long: 1800 } },
};

const DAYS_MAP = { weekend: 2, '3-days': 3, '7-days': 7, '14-days': 14, '30-days': 30 };

function getDays(dur) {
  if (!dur) return 7;
  if (DAYS_MAP[dur]) return DAYS_MAP[dur];
  const m = dur.match(/(\d+)/);
  return m ? parseInt(m[1]) : 7;
}

// ── Hotel Data ─────────────────────────────────────────────
const HOTEL_TIERS = {
  budget:      { label: '$20–60/night', types: ['Hostels', 'Guesthouses', 'Budget hotels'], tip: 'Book with free cancellation. Read recent reviews.' },
  'mid-range': { label: '$80–180/night', types: ['3-4 star hotels', 'Boutique hotels', 'Airbnb apartments'], tip: 'Look for hotels with free breakfast included.' },
  luxury:      { label: '$200+/night', types: ['5-star hotels', 'Luxury resorts', 'Private villas'], tip: 'Book direct with hotel for best rates and upgrades.' },
};

// ── Packing Data ───────────────────────────────────────────
const PACKING_ESSENTIALS = ['✅ Passport & ID copies', '✅ Travel insurance', '✅ Phone + charger + power bank', '✅ Cards & local currency', '✅ Medications'];
const PACKING_BY_TYPE = {
  adventure: ['🥾 Trekking boots', '🎒 Daypack (20–30L)', '🩹 First aid kit', '💦 Water purification tablets', '🔦 Headlamp'],
  beach:     ['👙 Swimsuits (2–3)', '🩴 Flip flops', '☀️ Sunscreen SPF50+', '🏖️ Beach towel', '🤿 Snorkel gear'],
  business:  ['👔 Formal wear (4 sets)', '💼 Laptop + charger', '📇 Business cards', '🖊️ Pen & notepad'],
  honeymoon: ['👗 Elegant evening wear', '📷 Camera', '🕯️ Romantic accessories', '💑 Couple outfits'],
  family:    ['🧸 Kids entertainment', '🩹 Children\'s medications', '🎒 Kids\' backpacks', '🧴 Children\'s sunscreen'],
  cultural:  ['👘 Modest clothing for temples', '📚 Guidebook', '📓 Travel journal', '📸 Camera'],
  general:   ['👕 Clothes (5–7 sets)', '👟 Walking shoes', '🧥 Light jacket', '🧴 Toiletries (travel size)'],
};

// ── Recommendations Data ───────────────────────────────────
const RECS = {
  beach:     ['🏖️ Bali, Indonesia', '🏝️ Maldives', '🌊 Phuket, Thailand', '🌴 Goa, India', '🤿 Zanzibar'],
  adventure: ['🏔️ Nepal (Himalayas)', '🦁 Kenya (Safari)', '🧗 Patagonia', '🌋 Iceland', '🏕️ New Zealand'],
  honeymoon: ['🗼 Paris, France', '🌹 Santorini, Greece', '🏝️ Maldives', '🌺 Bali', '🍷 Tuscany, Italy'],
  cultural:  ['🏛️ Rome, Italy', '🎌 Kyoto, Japan', '🕌 Istanbul, Turkey', '🏯 Rajasthan, India', '🎭 Vienna'],
  budget:    ['🌴 Bali', '🌏 Vietnam', '🐘 Thailand', '🏙️ Georgia (Tbilisi)', '🇵🇹 Portugal'],
  luxury:    ['🏙️ Dubai', '🇫🇷 French Riviera', '🏝️ Seychelles', '🗼 Tokyo', '🍷 Amalfi Coast'],
  solo:      ['🎌 Japan', '🇵🇹 Portugal', '🌏 Vietnam', '🏳️ New Zealand', '🌆 Taiwan'],
  family:    ['🏰 Orlando (Disney)', '🇸🇬 Singapore', '🏖️ Phuket', '🎢 Tokyo', '🏛️ Rome'],
  general:   ['🌍 Bali, Indonesia', '🗼 Paris, France', '🎌 Tokyo, Japan', '🏝️ Maldives', '🏙️ Singapore'],
};

// ── Response Generators ─────────────────────────────────────

function getLang(locale) {
  const value = String(locale || '').toLowerCase().trim()
  if (value.startsWith('fr')) return 'fr'
  if (value.startsWith('hi')) return 'hi'
  if (value.startsWith('mr')) return 'mr'
  if (value.startsWith('kn')) return 'kn'
  return 'en'
}

const getWelcome = (locale = 'en') => {
  const lang = getLang(locale)
  if (lang === 'fr') {
    return `👋 Bienvenue sur Travel Planner AI !

Je peux vous aider pour :
✈️  Recherche de vols & conseils de réservation
🏨  Recommandations d’hôtels
🗺️  Itinéraires jour par jour
💰  Estimations de budget
🎒  Listes de bagages
🌤️  Météo & meilleure période
📍  Recommandations de destinations

Dites-moi où vous souhaitez aller — ou posez une question voyage ! 🌍`
  }
  if (lang === 'hi') {
    return `👋 Travel Planner AI में आपका स्वागत है!

मैं आपकी मदद कर सकता हूँ:
✈️  फ्लाइट सर्च व बुकिंग टिप्स
🏨  होटल सुझाव
🗺️  दिन-दर-दिन itinerary
💰  ट्रिप बजट अनुमान
🎒  packing list
🌤️  मौसम व best time
📍  destination recommendations

बस बताइए आप कहाँ जाना चाहते हैं — या कोई भी travel सवाल पूछिए! 🌍`
  }
  if (lang === 'mr') {
    return `👋 Travel Planner AI मध्ये स्वागत आहे!

मी मदत करू शकतो:
✈️  फ्लाइट शोध व बुकिंग टिप्स
🏨  हॉटेल शिफारसी
🗺️  दिवसागणिक itinerary
💰  बजेट अंदाज
🎒  packing list
🌤️  हवामान व best time
📍  destination recommendations

कुठे जायचं आहे ते सांगा — किंवा कोणताही travel प्रश्न विचारा! 🌍`
  }
  if (lang === 'kn') {
    return `👋 Travel Planner AI ಗೆ ಸ್ವಾಗತ!

ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ:
✈️  ವಿಮಾನ ಹುಡುಕಾಟ & ಬುಕಿಂಗ್ ಸಲಹೆಗಳು
🏨  ಹೋಟೆಲ್ ಶಿಫಾರಸುಗಳು
🗺️  ದಿನದಿಂದ-ದಿನಕ್ಕೆ itinerary
💰  ಬಜೆಟ್ ಅಂದಾಜು
🎒  packing list
🌤️  ಹವಾಮಾನ & best time
📍  destination recommendations

ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು ಎಂದು ಹೇಳಿ — ಅಥವಾ ಯಾವುದೇ travel ಪ್ರಶ್ನೆ ಕೇಳಿ! 🌍`
  }
  return `👋 Welcome to Travel Planner AI!

I can help you with:
✈️  Flight search & booking guidance
🏨  Hotel recommendations  
🗺️  Day-by-day itinerary planning
💰  Full trip budget estimates
🎒  Smart packing lists
🌤️  Weather & best time to visit
📍  Destination recommendations

Just tell me where you'd like to go — or ask anything about travel! 🌍`;
}


function tripPlan(e, locale = 'en') {
  const dest = e.destination || 'your destination';
  const dur  = e['trip-duration'] || '1 week';
  const bud  = e['budget-range'] || 'mid-range';
  const type = e['trip-type'] || 'General';
  const mon  = e['travel-month'] || '';

  const lang = getLang(locale)

  if (lang === 'fr') {
    return `🌍 Aperçu du voyage : ${dest}
${'─'.repeat(32)}
📍 Destination : ${dest}
📅 Durée :       ${dur}
💰 Budget :      ${bud}
🎯 Type :        ${type}
${mon ? `🗓️  Période :     ${mon}\n` : ''}
Je peux vous aider à :
1️⃣  "Créer un itinéraire" → Programme jour par jour
2️⃣  "Estimer le budget"   → Détail des coûts
3️⃣  "Trouver des vols"    → Options & conseils
4️⃣  "Trouver des hôtels"  → Hébergements
5️⃣  "Liste de bagages"    → Quoi emporter

Par quoi voulez-vous commencer ? 🗺️`;
  }
  if (lang === 'hi') {
    return `🌍 ट्रिप ओवरव्यू: ${dest}
${'─'.repeat(32)}
📍 डेस्टिनेशन: ${dest}
📅 अवधि:      ${dur}
💰 बजट:       ${bud}
🎯 ट्रिप टाइप: ${type}
${mon ? `🗓️  ट्रैवल:     ${mon}\n` : ''}
मैं इसमें मदद कर सकता हूँ:
1️⃣  "Itinerary बनाओ"  → Day-by-day plan
2️⃣  "Budget estimate" → Cost breakdown
3️⃣  "Flights ढूँढो"   → Options & tips
4️⃣  "Hotels ढूँढो"    → Stays
5️⃣  "Packing list"    → क्या पैक करें

आप किससे शुरू करना चाहेंगे? 🗺️`
  }
  if (lang === 'mr') {
    return `🌍 ट्रिप ओव्हरव्ह्यू: ${dest}
${'─'.repeat(32)}
📍 डेस्टिनेशन: ${dest}
📅 कालावधी:    ${dur}
💰 बजेट:       ${bud}
🎯 ट्रिप टाइप: ${type}
${mon ? `🗓️  ट्रॅव्हल:   ${mon}\n` : ''}
मी यात मदत करू शकतो:
1️⃣  "Itinerary तयार करा" → दिवसागणिक प्लॅन
2️⃣  "Budget estimate"    → खर्चाचे तपशील
3️⃣  "Flights शोधा"       → पर्याय & टिप्स
4️⃣  "Hotels शोधा"        → स्टे
5️⃣  "Packing list"       → काय पॅक करावे

कशापासून सुरू करूया? 🗺️`
  }
  if (lang === 'kn') {
    return `🌍 ಟ್ರಿಪ್ ಒವರ್‌ವ್ಯೂ: ${dest}
${'─'.repeat(32)}
📍 ಡೆಸ್ಟಿನೇಷನ್: ${dest}
📅 ಅವಧಿ:        ${dur}
💰 ಬಜೆಟ್:       ${bud}
🎯 ಟ್ರಿಪ್ ಟೈಪ್: ${type}
${mon ? `🗓️  ಟ್ರಾವೆಲ್:   ${mon}\n` : ''}
ನಾನು ಇದರಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಹುದು:
1️⃣  "Itinerary"      → ದಿನದಿಂದ-ದಿನಕ್ಕೆ ಪ್ಲ್ಯಾನ್
2️⃣  "Budget estimate"→ ವೆಚ್ಚ ವಿವರ
3️⃣  "Flights"        → ಆಯ್ಕೆಗಳು & ಟಿಪ್ಸ್
4️⃣  "Hotels"         → ವಾಸ್ತವ್ಯ
5️⃣  "Packing list"   → ಏನು ಪ್ಯಾಕ್ ಮಾಡಬೇಕು

ಯಾವುದರಿಂದ ಆರಂಭಿಸೋಣ? 🗺️`
  }

  return `🌍 Trip Overview: ${dest}
${'─'.repeat(32)}
📍 Destination: ${dest}
📅 Duration:    ${dur}
💰 Budget:      ${bud}
🎯 Trip Type:   ${type}
${mon ? `🗓️  Travel:      ${mon}\n` : ''}
Your complete plan is being prepared with:
✈️ Flights and booking options
🏨 Hotels and stays
🚗 Local ride options
📅 A day-by-day itinerary
🎒 A ${dur}-specific packing list
📍 Top recommended places
📷 Photo, YouTube and Instagram links

Open the results panel to explore everything. 🗺️`;
}


function itinerary(e, locale = 'en') {
  const dest = e.destination || 'your destination';
  const days = getDays(e['trip-duration']);
  const type = e['trip-type'] || 'general';
  const key  = dest.toLowerCase().replace(/\s+/g, '');
  const attractions = [...(ITINERARY[key] || ITINERARY.default)];
  const tip  = TIPS[key] || TIPS.default;

  const lang = getLang(locale)
  let out = lang === 'fr'
    ? `🗺️ Itinéraire ${dest} (${days} jours)\n${'─'.repeat(32)}\n\n`
    : lang === 'hi'
    ? `🗺️ ${dest} Itinerary (${days} दिन)\n${'─'.repeat(32)}\n\n`
    : lang === 'mr'
    ? `🗺️ ${dest} Itinerary (${days} दिवस)\n${'─'.repeat(32)}\n\n`
    : lang === 'kn'
    ? `🗺️ ${dest} Itinerary (${days} ದಿನಗಳು)\n${'─'.repeat(32)}\n\n`
    : `🗺️ ${days}-Day ${dest} Itinerary\n${'─'.repeat(32)}\n\n`;

  for (let d = 1; d <= Math.min(days, 7); d++) {
    const morning   = attractions.shift() || (lang === 'fr' ? 'Explorer le quartier' : lang === 'hi' ? 'लोकल एरिया एक्सप्लोर' : lang === 'mr' ? 'लोकल एरिया एक्सप्लोर' : lang === 'kn' ? 'ಲೋಕಲ್ ಏರಿಯಾ ಎಕ್ಸ್‌ಪ್ಲೋರ್' : 'Explore local neighbourhood');
    const afternoon = attractions.shift() || (lang === 'fr' ? 'Shopping / Temps libre' : lang === 'hi' ? 'शॉपिंग / फ्री टाइम' : lang === 'mr' ? 'शॉपिंग / फ्री टाइम' : lang === 'kn' ? 'ಶಾಪಿಂಗ್ / ಫ್ರೀ ಟೈಮ್' : 'Shopping / Free time');
    const evening   = d === 1
      ? (lang === 'fr' ? 'Dîner de bienvenue dans un restaurant local' : lang === 'hi' ? 'लोकल रेस्टोरेंट में वेलकम डिनर' : lang === 'mr' ? 'लोकल रेस्टॉरंटमध्ये वेलकम डिनर' : lang === 'kn' ? 'ಲೋಕಲ್ ರೆಸ್ಟೋರೆಂಟ್‌ನಲ್ಲಿ ವೆಲ್ಕಮ್ ಡಿನ್ನರ್' : 'Welcome dinner at local restaurant')
      : d === days
      ? (lang === 'fr' ? 'Dîner de fin de séjour & souvenirs' : lang === 'hi' ? 'फेयरवेल डिनर और सॉवेनिर शॉपिंग' : lang === 'mr' ? 'फेअरवेल डिनर आणि सॉव्हेनिर शॉपिंग' : lang === 'kn' ? 'ಫೇರ್‌ವೆಲ್ ಡಿನ್ನರ್ & ಸೌವೆನಿರ್ ಶಾಪಿಂಗ್' : 'Farewell dinner & souvenir shopping')
      : (lang === 'fr' ? 'Dîner & balade en soirée' : lang === 'hi' ? 'डिनर और शाम की सैर' : lang === 'mr' ? 'डिनर आणि संध्याकाळची फेरफटका' : lang === 'kn' ? 'ಡಿನ್ನರ್ & ಸಂಜೆ ವಾಕ್' : 'Dinner & evening stroll');
    out += lang === 'fr'
      ? `📅 Jour ${d}\n  🌅 Matin   → ${morning}\n  ☀️  Après-midi → ${afternoon}\n  🌙 Soir    → ${evening}\n\n`
      : lang === 'hi'
      ? `📅 दिन ${d}\n  🌅 सुबह   → ${morning}\n  ☀️  दोपहर → ${afternoon}\n  🌙 शाम    → ${evening}\n\n`
      : lang === 'mr'
      ? `📅 दिवस ${d}\n  🌅 सकाळ  → ${morning}\n  ☀️  दुपार → ${afternoon}\n  🌙 संध्याकाळ → ${evening}\n\n`
      : lang === 'kn'
      ? `📅 ದಿನ ${d}\n  🌅 ಬೆಳಿಗ್ಗೆ → ${morning}\n  ☀️  ಮಧ್ಯಾಹ್ನ → ${afternoon}\n  🌙 ಸಂಜೆ → ${evening}\n\n`
      : `📅 Day ${d}\n  🌅 Morning   → ${morning}\n  ☀️  Afternoon → ${afternoon}\n  🌙 Evening   → ${evening}\n\n`;
  }

  if (days > 7) out += lang === 'fr'
    ? `📅 Jours 8–${days}\n  → Excursions autour\n  → Revoir vos lieux préférés\n  → Détente & exploration\n\n`
    : lang === 'hi'
    ? `📅 दिन 8–${days}\n  → पास के शहरों की day trips\n  → पसंदीदा जगहों पर फिर जाएँ\n  → आराम और leisurely exploration\n\n`
    : lang === 'mr'
    ? `📅 दिवस 8–${days}\n  → जवळच्या ठिकाणांचे day trips\n  → आवडत्या ठिकाणी पुन्हा भेट\n  → आराम & leisurely exploration\n\n`
    : lang === 'kn'
    ? `📅 ದಿನ 8–${days}\n  → ಹತ್ತಿರದ ಸ್ಥಳಗಳಿಗೆ day trips\n  → ಇಷ್ಟವಾದ ಜಾಗಗಳಿಗೆ ಮತ್ತೆ ಭೇಟಿ\n  → ವಿಶ್ರಾಂತಿ & leisurely exploration\n\n`
    : `📅 Days 8–${days}\n  → Day trips to nearby towns\n  → Revisit favourite spots\n  → Relax & explore at leisure\n\n`;

  out += lang === 'fr'
    ? `💡 Astuce : ${tip}\n\nVous voulez des hôtels ou une estimation de budget ? 🏨`
    : lang === 'hi'
    ? `💡 टिप: ${tip}\n\nHotels या budget estimate चाहिए? 🏨`
    : lang === 'mr'
    ? `💡 टिप: ${tip}\n\nHotels किंवा budget estimate हवे आहे का? 🏨`
    : lang === 'kn'
    ? `💡 Tip: ${tip}\n\nHotels ಅಥವಾ budget estimate ಬೇಕಾ? 🏨`
    : `💡 Pro Tip: ${tip}\n\nWant hotel suggestions or budget estimate? Just ask! 🏨`;
  return out;
}


function budget(e, locale = 'en') {
  const dest = e.destination || 'your destination';
  const days = getDays(e['trip-duration']);
  const tier = e['budget-range'] || 'mid-range';
  const b    = BUDGET[tier] || BUDGET['mid-range'];
  const isLong = ['paris','london','tokyo','dubai','singapore','maldives'].includes(dest.toLowerCase());
  const flight  = isLong ? b.flight.long : b.flight.short;

  const hotel = b.hotel * days;
  const food  = b.food  * days;
  const acts  = b.activities * days;
  const trans = b.transport * days;
  const total = hotel + food + acts + trans + flight;
  const perDay = Math.round((hotel + food + acts + trans) / days);

  const lang = getLang(locale)
  if (lang === 'fr') {
    return `💰 Estimation du budget : ${dest}
${'─'.repeat(32)}
📋 Niveau : ${tier} | 📅 ${days} jours

✈️  Vols (aller-retour) :   ~$${flight}
🏨  Hébergement :           ~$${hotel}  ($${b.hotel}/nuit)
🍽️   Repas :                ~$${food}  ($${b.food}/jour)
🎡  Activités :             ~$${acts}  ($${b.activities}/jour)
🚕  Transports locaux :     ~$${trans}  ($${b.transport}/jour)
${'─'.repeat(32)}
💵  TOTAL :                 ~$${total}
📊  Moyenne / jour :        ~$${perDay}/jour (hors vols)

💡 Pour économiser :
• Réserver 6–8 semaines à l’avance
• Voyager en basse/mi-saison (20–30% moins cher)
• Manger dans des restaurants locaux
• Utiliser les transports publics

⚠️  Les estimations varient selon la saison et la disponibilité.`;
  }
  if (lang === 'hi') {
    return `💰 Budget Estimate: ${dest}
${'─'.repeat(32)}
📋 Tier: ${tier} | 📅 ${days} दिन

✈️  Flights (round trip):  ~$${flight}
🏨  Stay:                  ~$${hotel}
🍽️   Food:                 ~$${food}
🎡  Activities:            ~$${acts}
🚕  Local transport:       ~$${trans}
${'─'.repeat(32)}
💵  TOTAL:                 ~$${total}
📊  Avg/day:               ~$${perDay}/day (flights छोड़कर)

⚠️  Season और availability के हिसाब से बदल सकता है।`
  }
  if (lang === 'mr') {
    return `💰 Budget Estimate: ${dest}
${'─'.repeat(32)}
📋 Tier: ${tier} | 📅 ${days} दिवस

✈️  Flights (round trip):  ~$${flight}
🏨  Stay:                  ~$${hotel}
🍽️   Food:                 ~$${food}
🎡  Activities:            ~$${acts}
🚕  Local transport:       ~$${trans}
${'─'.repeat(32)}
💵  TOTAL:                 ~$${total}
📊  Avg/day:               ~$${perDay}/day (flights वगळून)

⚠️  Season आणि availability नुसार बदलू शकते.`
  }
  if (lang === 'kn') {
    return `💰 Budget Estimate: ${dest}
${'─'.repeat(32)}
📋 Tier: ${tier} | 📅 ${days} ದಿನ

✈️  Flights (round trip):  ~$${flight}
🏨  Stay:                  ~$${hotel}
🍽️   Food:                 ~$${food}
🎡  Activities:            ~$${acts}
🚕  Local transport:       ~$${trans}
${'─'.repeat(32)}
💵  TOTAL:                 ~$${total}
📊  Avg/day:               ~$${perDay}/day (flights ಹೊರತುಪಡಿಸಿ)

⚠️  Season ಮತ್ತು availability ಆಧಾರವಾಗಿ ಬದಲಾಗಬಹುದು.`
  }

  return `💰 Budget Estimate: ${dest}
${'─'.repeat(32)}
📋 Tier: ${tier} | 📅 ${days} days

✈️  Flights (round trip):  ~$${flight}
🏨  Accommodation:          ~$${hotel}  ($${b.hotel}/night)
🍽️   Food & Dining:         ~$${food}  ($${b.food}/day)
🎡  Activities:             ~$${acts}  ($${b.activities}/day)
🚕  Local Transport:        ~$${trans}  ($${b.transport}/day)
${'─'.repeat(32)}
💵  TOTAL ESTIMATE:         ~$${total}
📊  Daily Average:          ~$${perDay}/day (excl. flights)

💡 Save money by:
• Booking 6–8 weeks in advance
• Travelling shoulder season (20-30% cheaper)
• Eating at local restaurants
• Using public transport

⚠️  Estimates vary by season & availability.`;
}


function flights(e, locale = 'en') {
  const dest  = e.destination || 'destination';
  const orig  = e.origin || 'your city';
  const month = e['travel-month'] || 'flexible dates';

  const lang = getLang(locale)
  if (lang === 'fr') {
    return `✈️ Guide des vols : ${orig} → ${dest}
${'─'.repeat(32)}
📅 Période : ${month}

💺 Fourchettes estimées :
  🟢 Éco (low-cost) :            ~$250–500
  🔵 Éco (compagnies majeures) : ~$500–900
  🟡 Business :                  ~$1,200–2,500

💡 Conseils :
  • Réserver 6–8 semaines avant
  • Partir mardi ou mercredi
  • Activer des alertes de prix (Google Flights)
  • Vérifier les aéroports proches
  • Tester des itinéraires avec escale

🌐 Plateformes utiles :
  • Google Flights (suivi des prix)
  • Skyscanner (comparaison)
  • Momondo (bons plans)

Vous voulez un budget complet avec hôtels ? 💰`;
  }
  if (lang === 'hi') {
    return `✈️ Flight Guide: ${orig} → ${dest}
${'─'.repeat(32)}
📅 Travel: ${month}

💡 सस्ते फ्लाइट टिप्स:
  • 6–8 हफ्ते पहले बुक करें
  • Tue/Wed को उड़ान
  • Google Flights पर alerts

Platforms:
  • Google Flights
  • Skyscanner
  • Momondo`
  }
  if (lang === 'mr') {
    return `✈️ Flight Guide: ${orig} → ${dest}
${'─'.repeat(32)}
📅 Travel: ${month}

💡 स्वस्त फ्लाइट टिप्स:
  • 6–8 आठवडे आधी बुक करा
  • Tue/Wed ला फ्लाइट
  • Google Flights alerts

Platforms:
  • Google Flights
  • Skyscanner
  • Momondo`
  }
  if (lang === 'kn') {
    return `✈️ Flight Guide: ${orig} → ${dest}
${'─'.repeat(32)}
📅 Travel: ${month}

💡 ಕಡಿಮೆ ದರಕ್ಕಾಗಿ:
  • 6–8 ವಾರ ಮೊದಲು ಬುಕ್ ಮಾಡಿ
  • Tue/Wed ಪ್ರಯತ್ನಿಸಿ
  • Google Flights alerts

Platforms:
  • Google Flights
  • Skyscanner
  • Momondo`
  }

  return `✈️ Flight Guide: ${orig} → ${dest}
${'─'.repeat(32)}
📅 Travel: ${month}

💺 Estimated Price Ranges:
  🟢 Economy (budget airlines):  ~$250–500
  🔵 Economy (full service):     ~$500–900
  🟡 Business class:             ~$1,200–2,500

💡 Tips for cheapest flights:
  • Book 6–8 weeks in advance
  • Fly Tuesday or Wednesday
  • Set price alerts on Google Flights
  • Check nearby airports
  • Look for indirect routes

🌐 Best booking platforms:
  • Google Flights (price tracking & alerts)
  • Skyscanner (multi-airline comparison)
  • Momondo (deals & bundles)

Want a full budget breakdown including hotels? 💰`;
}


function hotels(e, locale = 'en') {
  const dest  = e.destination || 'your destination';
  const tier  = e['budget-range'] || 'mid-range';
  const type  = e['trip-type'] || '';
  const h     = HOTEL_TIERS[tier] || HOTEL_TIERS['mid-range'];

  const lang = getLang(locale)
  let out = lang === 'fr'
    ? `🏨 Hôtels : ${dest}
${'─'.repeat(32)}
💰 Budget : ${h.label}

🏠 Types d’hébergement :
${h.types.map(t => `  • ${t}`).join('\n')}

💡 Astuce : ${h.tip}

📍 Où loger :
  ✅ Centre-ville (pratique)
  ✅ Quartier touristique (animé)
  ✅ Périphérie (calme, moins cher)

🌐 Plateformes :
  • Booking.com
  • Hotels.com
  • Airbnb
  • Agoda`
    : lang === 'hi'
    ? `🏨 होटल्स: ${dest}
${'─'.repeat(32)}
💰 रेंज: ${h.label}

🏠 Stay options:
${h.types.map(t => `  • ${t}`).join('\n')}

💡 टिप: ${h.tip}

📍 कहाँ ठहरें:
  ✅ City centre (convenient)
  ✅ Tourist area (lively)
  ✅ Outskirts (budget-friendly)

🌐 Booking:
  • Booking.com
  • Hotels.com
  • Airbnb
  • Agoda`
    : lang === 'mr'
    ? `🏨 हॉटेल्स: ${dest}
${'─'.repeat(32)}
💰 रेंज: ${h.label}

🏠 Stay options:
${h.types.map(t => `  • ${t}`).join('\n')}

💡 टिप: ${h.tip}

📍 कुठे थांबावे:
  ✅ City centre (convenient)
  ✅ Tourist area (lively)
  ✅ Outskirts (budget-friendly)

🌐 Booking:
  • Booking.com
  • Hotels.com
  • Airbnb
  • Agoda`
    : lang === 'kn'
    ? `🏨 ಹೋಟೆಲ್ಸ್: ${dest}
${'─'.repeat(32)}
💰 ರೇಂಜ್: ${h.label}

🏠 Stay options:
${h.types.map(t => `  • ${t}`).join('\n')}

💡 Tip: ${h.tip}

📍 ಎಲ್ಲಿ ಉಳಿಯಬೇಕು:
  ✅ City centre (convenient)
  ✅ Tourist area (lively)
  ✅ Outskirts (budget-friendly)

🌐 Booking:
  • Booking.com
  • Hotels.com
  • Airbnb
  • Agoda`
    : `🏨 Hotels: ${dest}
${'─'.repeat(32)}
💰 Range: ${h.label}

🏠 Accommodation Options:
${h.types.map(t => `  • ${t}`).join('\n')}

💡 Tip: ${h.tip}

📍 Where to Stay:
  ✅ City centre (most convenient)
  ✅ Tourist district (lively atmosphere)
  ✅ Outskirts (peaceful, budget-friendly)

🌐 Booking Platforms:
  • Booking.com (flexible cancellation)
  • Hotels.com (loyalty rewards)
  • Airbnb (unique local stays)
  • Agoda (great deals in Asia)`;

  if (type === 'honeymoon') out += lang === 'fr'
    ? '\n\n💑 Astuce lune de miel : demandez les packs romance (petit-déjeuner, spa, décoration).'
    : lang === 'hi'
    ? '\n\n💑 Honeymoon tip: होटल से romance package पूछें (breakfast, spa, decoration).'
    : lang === 'mr'
    ? '\n\n💑 Honeymoon tip: hotel कडे romance package विचारा (breakfast, spa, decoration).'
    : lang === 'kn'
    ? '\n\n💑 Honeymoon tip: hotel ನಲ್ಲಿ romance package ಬಗ್ಗೆ ಕೇಳಿ (breakfast, spa, decoration).'
    : '\n\n💑 Honeymoon tip: Ask hotels for romance packages — many include breakfast, spa credits & room decorations.';
  if (type === 'family') out += lang === 'fr'
    ? '\n\n👨‍👩‍👧 Astuce famille : cherchez des suites/chambres communicantes. Vérifiez les conditions enfants.'
    : lang === 'hi'
    ? '\n\n👨‍👩‍👧 Family tip: suites/connected rooms देखें; kids policy check करें.'
    : lang === 'mr'
    ? '\n\n👨‍👩‍👧 Family tip: suites/connected rooms पाहा; kids policy तपासा.'
    : lang === 'kn'
    ? '\n\n👨‍👩‍👧 Family tip: suites/connected rooms ನೋಡಿ; kids policy ಪರಿಶೀಲಿಸಿ.'
    : '\n\n👨‍👩‍👧 Family tip: Search for suites or connected rooms. Check if kids stay free.';
  if (type === 'business') out += lang === 'fr'
    ? '\n\n💼 Astuce business : Wi‑Fi rapide, salles de réunion, navette aéroport.'
    : lang === 'hi'
    ? '\n\n💼 Business tip: fast WiFi, meeting rooms, airport shuttle देखें.'
    : lang === 'mr'
    ? '\n\n💼 Business tip: fast WiFi, meeting rooms, airport shuttle पाहा.'
    : lang === 'kn'
    ? '\n\n💼 Business tip: fast WiFi, meeting rooms, airport shuttle ನೋಡಿ.'
    : '\n\n💼 Business tip: Look for hotels with fast WiFi, meeting rooms & airport shuttle.';

  return out;
}


function packing(e, locale = 'en') {
  const dest  = e.destination || 'your destination';
  const type  = e['trip-type'] || 'general';
  const month = e['travel-month'] || '';

  const lang = getLang(locale)
  const isCold = ['iceland','norway','canada','alaska'].includes(dest.toLowerCase()) ||
                 ['winter','december','january','february'].includes((month||'').toLowerCase());
  const isHot  = ['bali','dubai','thailand','maldives','goa'].includes(dest.toLowerCase()) ||
                 ['summer','june','july','august'].includes((month||'').toLowerCase());

  const weather = isCold
    ? ['🧥 Heavy jacket', '🧣 Scarf & gloves', '🥾 Insulated boots', '🧦 Thermal socks']
    : isHot
    ? ['☀️ Sunscreen SPF50+', '🕶️ Sunglasses', '👒 Wide-brim hat', '💧 Reusable water bottle']
    : ['🧥 Light jacket', '👕 Layered clothing', '👟 Comfortable shoes'];

  const tripItems = PACKING_BY_TYPE[type] || PACKING_BY_TYPE.general;

  if (lang === 'fr') {
    return `🎒 Liste de bagages : ${dest}
${'─'.repeat(32)}
📋 Essentiels :
${PACKING_ESSENTIALS.join('\n')}

🌡️ Météo (${month || 'votre période'}):
${weather.map(w => `  ${w}`).join('\n')}

🎯 Pour un voyage ${type} :
${tripItems.map(t => `  ${t}`).join('\n')}

💡 Conseils :
  • Rouler les vêtements pour gagner de la place
  • Garder 30% du sac pour les achats
  • Sauvegarder les documents dans le cloud
  • Avoir des copies du passeport

Besoin d’un budget ou d’un itinéraire ? ✈️`;
  }
  if (lang === 'hi') {
    return `🎒 Packing List: ${dest}
${'─'.repeat(32)}
📋 Essentials:
${PACKING_ESSENTIALS.join('\n')}

🌡️ Weather (${month || 'your travel period'}):
${weather.map(w => `  ${w}`).join('\n')}

🎯 ${type} trip:
${tripItems.map(t => `  ${t}`).join('\n')}

Need budget estimate or itinerary? ✈️`
  }
  if (lang === 'mr') {
    return `🎒 Packing List: ${dest}
${'─'.repeat(32)}
📋 Essentials:
${PACKING_ESSENTIALS.join('\n')}

🌡️ Weather (${month || 'your travel period'}):
${weather.map(w => `  ${w}`).join('\n')}

🎯 ${type} trip:
${tripItems.map(t => `  ${t}`).join('\n')}

Need budget estimate or itinerary? ✈️`
  }
  if (lang === 'kn') {
    return `🎒 Packing List: ${dest}
${'─'.repeat(32)}
📋 Essentials:
${PACKING_ESSENTIALS.join('\n')}

🌡️ Weather (${month || 'your travel period'}):
${weather.map(w => `  ${w}`).join('\n')}

🎯 ${type} trip:
${tripItems.map(t => `  ${t}`).join('\n')}

Need budget estimate or itinerary? ✈️`
  }

  return `🎒 Packing List: ${dest}
${'─'.repeat(32)}
📋 Essentials:
${PACKING_ESSENTIALS.join('\n')}

🌡️ Weather items (${month || 'your travel period'}):
${weather.map(w => `  ${w}`).join('\n')}

🎯 For ${type} trip:
${tripItems.map(t => `  ${t}`).join('\n')}

💡 Packing tips:
  • Roll clothes to save space
  • Leave 30% bag space for shopping
  • Store docs in cloud backup
  • Carry copies of passport

Need a budget estimate or itinerary? Ask away! ✈️`;
}


function weather(e, locale = 'en') {
  const dest  = e.destination || 'your destination';
  const month = e['travel-month'] || 'your travel period';

  const BEST = {
    paris: 'April–June, Sept–Oct', bali: 'May–September', tokyo: 'Mar–May, Oct–Nov',
    dubai: 'November–March', london: 'June–August', singapore: 'Feb–April',
    maldives: 'Nov–April', iceland: 'June–August',
  };
  const key = dest.toLowerCase().replace(/\s+/g, '');
  const best = BEST[key] || 'varies — check local guides';

  const lang = getLang(locale)
  if (lang === 'fr') {
    return `🌤️ Guide météo : ${dest}
${'─'.repeat(32)}
✅ Meilleure période : ${best}
📅 Vous demandez : ${month}

🌡️ Saisons :
  ☀️  Haute saison  → meilleur temps, plus cher
  🍂  Mi-saison     → moins de monde, moins cher
  ❄️  Basse saison  → moins cher, certaines activités fermées

💡 Astuce : cherchez "${dest} meteo ${month}" sur
   weather.com pour les prévisions.

Vous voulez une liste de bagages ? 🎒`;
  }
  if (lang === 'hi') {
    return `🌤️ Weather Guide: ${dest}
${'─'.repeat(32)}
✅ Best time: ${best}
📅 You're asking about: ${month}

Want a packing list? 🎒`
  }
  if (lang === 'mr') {
    return `🌤️ Weather Guide: ${dest}
${'─'.repeat(32)}
✅ Best time: ${best}
📅 You're asking about: ${month}

Want a packing list? 🎒`
  }
  if (lang === 'kn') {
    return `🌤️ Weather Guide: ${dest}
${'─'.repeat(32)}
✅ Best time: ${best}
📅 You're asking about: ${month}

Want a packing list? 🎒`
  }

  return `🌤️ Weather Guide: ${dest}
${'─'.repeat(32)}
✅ Best time to visit: ${best}
📅 You're asking about: ${month}

🌡️ Season Guide:
  ☀️  Peak Season   → Best weather, highest prices
  🍂  Shoulder      → Good weather, fewer crowds, cheaper
  ❄️  Off Season    → Cheapest, some sites may close

💡 Tip: Search "${dest} weather ${month}" on
   weather.com for live forecasts.

Want a packing list based on the weather? 🎒`;
}


function recommend(e, locale = 'en') {
  const type  = e['trip-type'] || e['budget-range'] || 'general';
  const month = e['travel-month'] || '';
  const list  = RECS[type] || RECS.general;

  const lang = getLang(locale)
  if (lang === 'fr') {
    return `🌍 Destinations recommandées : ${type.replace(/-/g,' ')}
${'─'.repeat(32)}
${list.join('\n')}

${month ? `🗓️  Bonnes idées pour ${month} !\n` : ''}
Pour continuer :
  • Écrivez une destination pour un plan complet
  • "Budget pour Bali"
  • "Itinéraire Tokyo 5 jours"
  • "Meilleurs hôtels à Paris"

Laquelle vous tente ? ✈️`;
  }
  if (lang === 'hi') {
    return `🌍 Top Destinations: ${type.replace(/-/g,' ')}
${'─'.repeat(32)}
${list.join('\n')}

${month ? `🗓️  ${month} के लिए अच्छे विकल्प!\n` : ''}
Which one do you like? ✈️`
  }
  if (lang === 'mr') {
    return `🌍 Top Destinations: ${type.replace(/-/g,' ')}
${'─'.repeat(32)}
${list.join('\n')}

${month ? `🗓️  ${month} साठी चांगले पर्याय!\n` : ''}
Which one do you like? ✈️`
  }
  if (lang === 'kn') {
    return `🌍 Top Destinations: ${type.replace(/-/g,' ')}
${'─'.repeat(32)}
${list.join('\n')}

${month ? `🗓️  ${month} ಗೆ ಉತ್ತಮ ಆಯ್ಕೆಗಳು!\n` : ''}
Which one do you like? ✈️`
  }

  return `🌍 Top Destinations: ${type.replace(/-/g,' ')} Travel
${'─'.repeat(32)}
${list.join('\n')}

${month ? `🗓️  Great picks for ${month}!\n` : ''}
To continue:
  • Type any destination for a full plan
  • "Budget estimate for Bali"
  • "5-day itinerary for Tokyo"
  • "Best hotels in Paris"

Which one catches your eye? ✈️`;
}


function preferences(e, locale = 'en') {
  const saved = [e['trip-type'], e['budget-range']].filter(Boolean).join(' & ') || 'your style';
  const lang = getLang(locale)
  if (lang === 'fr') {
    return `✅ Préférences enregistrées !

J’ai noté : ${saved}.
Je l’utiliserai pour personnaliser vos recommandations. 🎯

Dites "Planifier un voyage" quand vous voulez pour des suggestions adaptées.`;
  }
  if (lang === 'hi') {
    return `✅ Preferences saved!

मैंने नोट किया: ${saved}.
आगे की recommendations में इसका इस्तेमाल करूंगा। 🎯`
  }
  if (lang === 'mr') {
    return `✅ Preferences saved!

मी नोंदवले: ${saved}.
पुढील recommendations मध्ये याचा वापर होईल. 🎯`
  }
  if (lang === 'kn') {
    return `✅ Preferences saved!

ನಾನು ಗಮನಿಸಿದೆ: ${saved}.
ಮುಂದಿನ recommendations ನಲ್ಲಿ ಇದನ್ನು ಬಳಸುತ್ತೇನೆ. 🎯`
  }
  return `✅ Preferences saved!

I've noted: ${saved} travel preferences.
I'll use this to personalize all future recommendations! 🎯

Say "Plan a trip" anytime to get tailored suggestions.`;
}


module.exports = {
  getWelcome, tripPlan, itinerary, budget, flights, hotels, packing, weather, recommend, preferences
};
