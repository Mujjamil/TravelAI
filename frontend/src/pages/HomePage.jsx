import { useNavigate } from 'react-router-dom'

const DESTS = [
  { name:'Bali', e:'🌴', tag:'Beach & Culture' }, { name:'Tokyo', e:'🎌', tag:'Food & Tech' },
  { name:'Paris', e:'🗼', tag:'Romance' },         { name:'Dubai', e:'🏙️', tag:'Luxury' },
  { name:'Iceland', e:'🌋', tag:'Adventure' },     { name:'Maldives', e:'🏝️', tag:'Honeymoon' },
]

const FEATURES = [
  ['✈️','Real Flights','Live flight prices via Amadeus API (free sandbox). Falls back to curated estimates.'],
  ['🏨','Real Hotels','Hotel data from Amadeus + Foursquare + curated database for major cities.'],
  ['🗺️','Route Maps','Leaflet.js maps with driving route (OSRM, free) for nearby cities + flight arcs.'],
  ['🤖','Custom ML NLP','No Dialogflow — TF-IDF + LinearSVC intent classifier, 99% accuracy, self-hosted.'],
  ['💰','Budget Estimator','Full cost breakdown: flights, hotels, food, activities, transport.'],
  ['🎒','Packing Assistant','Smart checklists tailored to destination, weather, and trip type.'],
]

export default function HomePage() {
  const nav = useNavigate()
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center py-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white mb-10 px-6">
        <div className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">v2 — Now with Real Flights, Hotels & Maps</div>
        <h1 className="text-4xl font-bold mb-3">Plan Your Dream Trip with AI ✈️</h1>
        <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
          Real flight prices · Live hotel data · Interactive route maps · Custom ML chatbot
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => nav('/chat')} className="bg-white text-blue-600 font-bold text-base px-6 py-3 rounded-2xl hover:bg-blue-50 transition shadow-lg">
            💬 Chat with AI
          </button>
          <button onClick={() => nav('/explore')} className="bg-blue-500 text-white font-bold text-base px-6 py-3 rounded-2xl hover:bg-blue-400 transition border border-white/30">
            🔍 Explore Flights & Hotels
          </button>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Popular Destinations</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {DESTS.map(d => (
          <button key={d.name} onClick={() => nav('/explore')}
            className="card hover:shadow-md hover:border-blue-200 transition-all text-left group cursor-pointer">
            <div className="text-4xl mb-2">{d.e}</div>
            <div className="font-semibold group-hover:text-blue-600">{d.name}</div>
            <div className="text-xs text-gray-400 mt-1">{d.tag}</div>
          </button>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">What's New in v2</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {FEATURES.map(([icon, title, desc]) => (
          <div key={title} className="card">
            <div className="text-3xl mb-2">{icon}</div>
            <div className="font-semibold mb-1">{title}</div>
            <div className="text-sm text-gray-500">{desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-800">
        <div className="font-semibold mb-2">💡 Pro Tip: Add Free API Keys for Live Data</div>
        <div className="grid md:grid-cols-2 gap-2 text-xs">
          <div>✅ <strong>Amadeus</strong> (free sandbox) → live flights & hotels → <code>developers.amadeus.com</code></div>
          <div>✅ <strong>Aviationstack</strong> (free 1000/mo) → flight status → <code>aviationstack.com</code></div>
          <div>✅ <strong>Foursquare</strong> (free 950/day) → hotel details → <code>developer.foursquare.com</code></div>
          <div>✅ <strong>OSRM</strong> (completely free) → road routing → no key needed!</div>
        </div>
      </div>
    </div>
  )
}
