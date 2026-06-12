/**
 * TravelModeSelector — horizontal pill selector for travel mode.
 * Reads and writes useTripStore.travelMode.
 * Used in ChatPage header and ExplorePage search form.
 */

import { useTripStore } from '../../store/useTripStore.js'

const MODES = [
  { value: 'budget',  label: '💰 Budget' },
  { value: 'comfort', label: '✈️ Comfort' },
  { value: 'luxury',  label: '👑 Luxury' },
  { value: 'solo',    label: '🎒 Solo' },
  { value: 'family',  label: '👨‍👩‍👧 Family' },
]

export default function TravelModeSelector({ compact = false }) {
  const { travelMode, setTravelMode } = useTripStore()

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {!compact && (
        <span className="text-xs text-gray-500 font-medium mr-1 whitespace-nowrap">Mode:</span>
      )}
      {MODES.map(mode => (
        <button
          key={mode.value}
          onClick={() => setTravelMode(mode.value)}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap
            ${travelMode === mode.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}
