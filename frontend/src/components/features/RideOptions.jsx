/**
 * RideOptions — Uber, Ola, and Rapido booking panel.
 *
 * Shows estimated fares (based on route distance when available),
 * estimated wait times, and deep-link buttons that open the provider's
 * booking page with the destination pre-filled.
 *
 * Props:
 *   destination  (string)  — drop-off location, e.g. "Paris" or "Hotel Hilton, Dubai"
 *   distanceKm   (number)  — optional driving distance from route store
 *   pickup       (string)  — optional custom pickup label (default "Current location")
 *   compact      (boolean) — slim card layout for use inside HotelCard
 */

import { useState } from 'react'

// ── Provider config ───────────────────────────────────────────
const PROVIDERS = [
  {
    id:       'uber',
    name:     'Uber',
    logo:     '⚫',
    color:    'bg-black text-white hover:bg-gray-900',
    badgeColor: 'bg-gray-100 text-gray-800',
    tagline:  'Available worldwide',
    // per-km fare: USD
    base:     200,
    perKm:    150,
    currency: '₹',
    waitMin:  3,
    waitMax:  8,
    getUrl: (destination) => {
      const enc = encodeURIComponent(destination)
      return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff%5Bformatted_address%5D=${enc}&dropoff%5Bnickname%5D=${enc}`
    },
  },
  {
    id:       'ola',
    name:     'Ola',
    logo:     '🟢',
    color:    'bg-green-600 text-white hover:bg-green-700',
    badgeColor: 'bg-green-50 text-green-800',
    tagline:  'India, Australia, UK',
    // per-km fare: INR
    base:     60,
    perKm:    14,
    currency: '₹',
    waitMin:  4,
    waitMax:  10,
    getUrl: (destination) => {
      const enc = encodeURIComponent(destination)
      return `https://book.olacabs.com/?drop_name=${enc}&category=auto`
    },
  },
  {
    id:       'rapido',
    name:     'Rapido',
    logo:     '🏍️',
    color:    'bg-yellow-400 text-black hover:bg-yellow-500',
    badgeColor: 'bg-yellow-50 text-yellow-800',
    tagline:  'Bike & auto · India',
    // per-km fare: INR (cheapest)
    base:     30,
    perKm:    9,
    currency: '₹',
    waitMin:  2,
    waitMax:  6,
    getUrl: (destination) => {
      const enc = encodeURIComponent(destination)
      return `https://www.rapido.bike/book-ride?drop=${enc}`
    },
  },
]

// ── Fare helpers ──────────────────────────────────────────────
function estimateFare(provider, distanceKm) {
  if (!distanceKm || distanceKm <= 0) return null
  const km  = Math.min(distanceKm, 80) // cap at 80 km for estimates
  const low = Math.round(provider.base + provider.perKm * km * 0.85)
  const hi  = Math.round(provider.base + provider.perKm * km * 1.15)
  return `${provider.currency}${low}–${provider.currency}${hi}`
}

// ── ProviderCard ──────────────────────────────────────────────
function ProviderCard({ provider, destination, distanceKm, compact }) {
  const fare    = estimateFare(provider, distanceKm)
  const bookUrl = provider.getUrl(destination)

  if (compact) {
    return (
      <a
        href={bookUrl}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${provider.color}`}
      >
        <span>{provider.logo}</span>
        {provider.name}
        {fare && <span className="opacity-75 font-normal">· {fare}</span>}
      </a>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{provider.logo}</span>
          <div>
            <div className="font-bold text-slate-900 text-sm">{provider.name}</div>
            <div className="text-[11px] text-slate-400">{provider.tagline}</div>
          </div>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${provider.badgeColor}`}>
          {provider.waitMin}–{provider.waitMax} min
        </span>
      </div>

      {/* Fare */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-slate-500">Est. fare</div>
          {fare ? (
            <div className="text-lg font-bold text-slate-800">{fare}</div>
          ) : (
            <div className="text-sm text-slate-400 italic">Varies by location</div>
          )}
        </div>
        {distanceKm && (
          <div className="text-xs text-slate-400">{distanceKm} km trip</div>
        )}
      </div>

      {/* Book button */}
      <a
        href={bookUrl}
        target="_blank"
        rel="noreferrer"
        className={`block text-center text-sm font-semibold py-2 rounded-xl transition-colors ${provider.color}`}
      >
        Book on {provider.name} ↗
      </a>
    </div>
  )
}

// ── RideOptions (main export) ─────────────────────────────────
export default function RideOptions({ destination, distanceKm, pickup = 'Current location', compact = false }) {
  const [expanded, setExpanded] = useState(!compact)

  if (!destination?.trim()) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-3xl mb-2">🚗</div>
        <div className="text-sm">Search for a destination to see ride options.</div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600">🚗 Get a ride</span>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[11px] text-blue-500 hover:underline"
          >
            {expanded ? 'Hide' : 'Show options'}
          </button>
        </div>
        {expanded && (
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map(p => (
              <ProviderCard
                key={p.id}
                provider={p}
                destination={destination}
                distanceKm={distanceKm}
                compact
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Route summary */}
      <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 mb-0.5">Pickup</div>
          <div className="font-medium text-slate-700 truncate">{pickup}</div>
        </div>
        <div className="text-slate-400 flex-shrink-0 text-lg">→</div>
        <div className="flex-1 min-w-0 text-right">
          <div className="text-xs text-slate-500 mb-0.5">Drop-off</div>
          <div className="font-medium text-slate-700 truncate">{destination}</div>
        </div>
      </div>

      {/* Provider cards */}
      <div className="grid gap-3">
        {PROVIDERS.map(p => (
          <ProviderCard
            key={p.id}
            provider={p}
            destination={destination}
            distanceKm={distanceKm}
            compact={false}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-slate-400 text-center leading-relaxed">
        Fare estimates are indicative only · Actual prices depend on surge, vehicle type &amp; route ·
        Opening the provider app gives the exact fare before confirmation
      </p>
    </div>
  )
}
