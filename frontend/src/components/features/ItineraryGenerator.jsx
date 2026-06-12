/**
 * ItineraryGenerator — compact form to generate a day-by-day itinerary.
 * POSTs to /api/travel/auto-itinerary and stores result in useTripStore.
 *
 * Props:
 *   destination (string) — pre-filled from trip or search context
 *   startDate   (string) — optional ISO date string
 */

import { useState } from 'react'
import { api }          from '../../api/index.js'
import { useTripStore } from '../../store/useTripStore.js'
import { useUIStore }   from '../../store/useUIStore.js'

export default function ItineraryGenerator({ destination = '', startDate = '' }) {
  const { travelMode, setItinerary } = useTripStore()
  const { addToast } = useUIStore()

  const [days,      setDays]      = useState(3)
  const [interests, setInterests] = useState('sightseeing, food, local culture')
  const [pace,      setPace]      = useState('balanced')
  const [loading,   setLoading]   = useState(false)

  const generate = async () => {
    if (!destination.trim()) {
      addToast('Enter a destination first.', 'error')
      return
    }
    setLoading(true)
    try {
      const data = await api.travel.autoItinerary({
        destination: destination.trim(),
        days: Math.max(1, Math.min(14, Number(days))),
        interests: interests.split(',').map(s => s.trim()).filter(Boolean),
        pace,
        budget: travelMode,
        startDate: startDate || '',
      })
      setItinerary(data.itinerary || [])
      addToast(`${days}-day itinerary for ${destination} generated!`, 'success')
    } catch {
      addToast('Could not generate itinerary. Try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="font-semibold text-sm text-slate-700">📅 AI Itinerary Generator</div>

      <div className="grid grid-cols-2 gap-2">
        {/* Days */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Days</label>
          <input
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={e => setDays(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Pace */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Pace</label>
          <select
            value={pace}
            onChange={e => setPace(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="relaxed">Relaxed</option>
            <option value="balanced">Balanced</option>
            <option value="packed">Action-packed</option>
          </select>
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Interests (comma-separated)</label>
        <input
          value={interests}
          onChange={e => setInterests(e.target.value)}
          placeholder="sightseeing, food, culture"
          className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {destination && (
        <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
          Destination: <span className="font-semibold">{destination}</span>
          {startDate && <span className="ml-2 text-slate-500">· Starting {startDate}</span>}
        </div>
      )}

      <button
        onClick={generate}
        disabled={loading || !destination.trim()}
        className="w-full btn-blue py-2 text-sm disabled:opacity-60"
      >
        {loading ? '⟳ Generating...' : '✨ Generate AI Itinerary'}
      </button>
    </div>
  )
}
