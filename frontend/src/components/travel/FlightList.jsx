import { useState, useMemo } from 'react'
import FlightCard from './FlightCard'
import SkeletonCard from '../common/SkeletonCard'

function parseDurationMins(str) {
  if (!str || str === 'N/A') return 99999
  const h = parseInt(str.match(/(\d+)h/)?.[1] || 0, 10)
  const m = parseInt(str.match(/(\d+)m/)?.[1] || 0, 10)
  return h * 60 + m
}

const SORT_OPTIONS = [
  { key: 'price',    label: 'Price' },
  { key: 'duration', label: 'Duration' },
  { key: 'stops',    label: 'Stops' },
]

export default function FlightList({ flights = [], loading = false, isEstimated = false }) {
  const [sortBy, setSortBy] = useState('price')

  const sorted = useMemo(() => {
    if (!flights.length) return flights
    return [...flights].sort((a, b) => {
      if (sortBy === 'price')    return (a.price ?? 99999) - (b.price ?? 99999)
      if (sortBy === 'stops')    return (a.stops ?? 9) - (b.stops ?? 9)
      if (sortBy === 'duration') return parseDurationMins(a.duration) - parseDurationMins(b.duration)
      return 0
    })
  }, [flights, sortBy])

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonCard type="flight" count={3} />
      </div>
    )
  }

  if (!flights.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-4xl mb-3">✈️</div>
        <div className="text-sm font-medium">No flights found for this route.</div>
        <div className="text-xs mt-1">Try a different origin or destination.</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isEstimated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          <strong>ℹ️ Showing estimated prices.</strong> Add your{' '}
          <code className="bg-amber-100 px-1 rounded">AMADEUS_CLIENT_ID</code> in{' '}
          <code className="bg-amber-100 px-1 rounded">.env</code> for live rates.{' '}
          <a href="https://developers.amadeus.com" target="_blank" rel="noreferrer" className="underline">
            Sign up free →
          </a>
        </div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-medium">Sort by:</span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
              sortBy === opt.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {sorted.map((f, i) => (
        <FlightCard key={`${f.airline}-${f.flightNumber || i}`} flight={f} />
      ))}
    </div>
  )
}
