/**
 * TripDetailsPage — full trip view with shared components.
 * Uses MapView, FlightList, HotelGrid from the shared component library.
 */

import { useEffect, useState, Suspense, lazy } from 'react'
import { Link, useParams }                     from 'react-router-dom'

import { api }          from '../api/index.js'
import FlightList       from '../components/travel/FlightList.jsx'
import HotelGrid        from '../components/travel/HotelGrid.jsx'
import SkeletonCard     from '../components/common/SkeletonCard.jsx'
import RideOptions      from '../components/features/RideOptions.jsx'

const MapView = lazy(() => import('../components/travel/MapView.jsx'))

export default function TripDetailsPage() {
  const { id } = useParams()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await api.trips.details(id)
        if (!mounted) return
        setDetails(data)
      } catch (e) {
        if (!mounted) return
        setError(e?.response?.data?.error || 'Unable to load trip details')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <SkeletonCard type="trip" count={1} />
        <div className="grid md:grid-cols-2 gap-4">
          <SkeletonCard type="flight" count={3} />
          <SkeletonCard type="hotel"  count={3} />
        </div>
      </div>
    )
  }

  if (error || !details?.trip) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="card text-red-600 text-sm">
          ❌ {error || 'Trip not found'}
        </div>
      </div>
    )
  }

  const { trip, route, flights = [], hotels = [], bookings = [], documents = [], chatMessages = [] } = details

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5 pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{trip.title}</h1>
          <div className="text-sm text-gray-500 mt-1">
            📍 {trip.destination || 'No destination'}
            {trip.startDate && <span className="ml-3">📅 {trip.startDate} → {trip.endDate || '?'}</span>}
            {trip.budget    && <span className="ml-3">💰 {trip.budget}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/trips" className="text-xs px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            ← Back to Trips
          </Link>
          <Link to="/chat" state={{ trip }} className="text-xs px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">
            💬 Open Chat
          </Link>
        </div>
      </div>

      {/* Map + notes */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card md:col-span-2">
          <div className="font-semibold text-sm mb-3">Map & Route</div>
          <Suspense fallback={<div className="h-[360px] animate-pulse bg-slate-100 rounded-xl" />}>
            <MapView route={route} hotels={hotels} height="360px" />
          </Suspense>
          {route?.drive && (
            <div className="text-xs text-gray-500 mt-2">
              🚗 Drive: {route.drive.distance_km} km · {route.drive.duration_text}
            </div>
          )}
        </div>
        <div className="card">
          <div className="font-semibold text-sm mb-2">Trip Summary</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="capitalize font-medium">{trip.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Documents</span>
              <span className="font-medium">{documents.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Bookings</span>
              <span className="font-medium">{bookings.length}</span>
            </div>
          </div>
          {trip.notes && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-gray-600 whitespace-pre-wrap">
              {trip.notes}
            </div>
          )}
        </div>
      </div>

      {/* Flights & Hotels */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-semibold text-sm mb-3">✈️ Flights</div>
          <FlightList flights={flights} loading={false} isEstimated={false} />
        </div>
        <div className="card">
          <div className="font-semibold text-sm mb-3">🏨 Hotels</div>
          <HotelGrid hotels={hotels} loading={false} />
        </div>
      </div>

      {/* Get Around — ride options for this destination */}
      <div className="card">
        <div className="font-semibold text-sm mb-4">🚗 Get Around in {trip.destination || 'your destination'}</div>
        <RideOptions
          destination={trip.destination || trip.title}
          pickup="Airport / Hotel pickup"
        />
      </div>

      {/* Bookings + Chat timeline */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-semibold text-sm mb-3">📋 Bookings</div>
          {bookings.length === 0 ? (
            <div className="text-sm text-gray-400">No bookings linked to this trip.</div>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="text-sm font-medium capitalize">{b.type} · {b.provider}</div>
                  <div className="text-xs text-gray-500 capitalize mt-0.5">Status: {b.status}</div>
                  {b.totalAmount ? (
                    <div className="text-xs text-blue-600 font-semibold mt-0.5">
                      {b.totalAmount} {b.currency}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="font-semibold text-sm mb-3">💬 Chat Timeline</div>
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {chatMessages.length === 0 ? (
              <div className="text-sm text-gray-400">No chat yet for this trip.</div>
            ) : (
              chatMessages.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className={`rounded-xl p-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-blue-50 border border-blue-100'
                      : 'bg-white border border-slate-200'
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{m.role}</div>
                  <div className="whitespace-pre-wrap text-xs text-gray-700">{m.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Documents */}
      {documents.length > 0 && (
        <div className="card">
          <div className="font-semibold text-sm mb-3">📁 Documents</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5">
                <span className="text-xl">{doc.mimeType?.includes('pdf') ? '📄' : '🖼️'}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{doc.name}</div>
                  <div className="text-[11px] text-gray-400">{(doc.sizeBytes / 1024).toFixed(0)} KB</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
