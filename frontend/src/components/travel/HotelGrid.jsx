import { useState, useMemo } from 'react'
import HotelCard from './HotelCard'
import SkeletonCard from '../common/SkeletonCard'

const SORT_OPTIONS = [
  { key: 'price',  label: 'Price' },
  { key: 'rating', label: 'Rating' },
  { key: 'stars',  label: 'Stars' },
]

export default function HotelGrid({
  hotels = [],
  loading = false,
  isEstimated = false,
  onSelectHotel,
  layout = 'responsive',
}) {
  const [selectedId, setSelectedId] = useState(null)
  const [sortBy, setSortBy] = useState('price')

  const sorted = useMemo(() => {
    if (!hotels.length) return hotels
    return [...hotels].sort((a, b) => {
      if (sortBy === 'price')  return (a.price ?? 99999) - (b.price ?? 99999)
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
      if (sortBy === 'stars')  return (b.stars ?? 0) - (a.stars ?? 0)
      return 0
    })
  }, [hotels, sortBy])

  if (loading) {
    return (
      <div className={`grid grid-cols-1 gap-4 ${layout === 'responsive' ? 'lg:grid-cols-2' : ''}`}>
        <SkeletonCard type="hotel" count={4} />
      </div>
    )
  }

  if (!hotels.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-4xl mb-3">🏨</div>
        <div className="text-sm font-medium">No hotels found for this destination.</div>
        <div className="text-xs mt-1">Try different dates or a broader budget range.</div>
      </div>
    )
  }

  const handleSelect = (hotel) => {
    const newId = selectedId === hotel.id ? null : hotel.id
    setSelectedId(newId)
    onSelectHotel?.(newId ? hotel : null)
  }

  return (
    <div className="space-y-3">
      {isEstimated && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
          <strong>ℹ️ Curated hotel suggestions.</strong> Displayed prices are estimates. Use Booking.com or Agoda below for live availability and rates.
        </div>
      )}

      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-slate-500">Sort by</span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              sortBy === opt.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${layout === 'responsive' ? 'lg:grid-cols-2' : ''}`}>
        {sorted.map((h, i) => (
          <HotelCard
            key={h.id || `hotel-${i}`}
            hotel={h}
            selected={h.id === selectedId}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  )
}
