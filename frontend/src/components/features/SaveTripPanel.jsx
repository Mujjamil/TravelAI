/**
 * SaveTripPanel — saves current flights/hotels/itinerary to a selected trip.
 * Calls PUT /api/trips/:id with the current store results.
 */

import { useEffect, useState } from 'react'
import { api }          from '../../api/index.js'
import { useTripStore } from '../../store/useTripStore.js'
import { useUIStore }   from '../../store/useUIStore.js'

export default function SaveTripPanel() {
  const { flights, hotels, itinerary } = useTripStore()
  const { addToast } = useUIStore()

  const [trips,          setTrips]          = useState([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [saving,         setSaving]         = useState(false)

  const hasResults = flights.length > 0 || hotels.length > 0 || !!itinerary

  useEffect(() => {
    api.trips.list()
      .then(data => {
        const list = Array.isArray(data.trips) ? data.trips : []
        setTrips(list)
        if (list.length > 0 && !selectedTripId) setSelectedTripId(list[0].id)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    if (!selectedTripId) { addToast('Select a trip first.', 'error'); return }
    if (!hasResults) { addToast('No results to save yet.', 'error'); return }
    setSaving(true)
    try {
      await api.trips.update(selectedTripId, {
        ...(flights.length   ? { flights }   : {}),
        ...(hotels.length    ? { hotels }    : {}),
        ...(itinerary        ? { itinerary } : {}),
      })
      addToast('Results saved to trip!', 'success')
    } catch {
      addToast('Could not save results. Try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!hasResults) return null

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2">
      <span className="text-xs text-slate-500 whitespace-nowrap">💾 Save to:</span>
      {trips.length === 0 ? (
        <span className="text-xs text-gray-400">No trips — create one first.</span>
      ) : (
        <>
          <select
            value={selectedTripId}
            onChange={e => setSelectedTripId(e.target.value)}
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {trips.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button
            onClick={save}
            disabled={saving}
            className="text-xs btn-blue px-3 py-1.5 flex-shrink-0 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    </div>
  )
}
