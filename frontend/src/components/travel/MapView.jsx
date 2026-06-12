/**
 * MapView — Leaflet map using react-leaflet (npm package, not CDN window.L).
 * Replaces the duplicated TravelMap in ExplorePage and TripMap in TripDetailsPage.
 *
 * Props:
 *   route   — route object from /api/travel/route
 *   hotels  — array of hotel objects with lat/lng
 *   height  — CSS height string (default '420px')
 */

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet's default marker icon paths broken by Vite's asset bundling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom label icon factory
function labelIcon(label, color = '#3b82f6') {
  return L.divIcon({
    html: `<div style="background:${color};color:white;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${label}</div>`,
    className: '',
    iconAnchor: [40, 10],
  })
}

function hotelIcon() {
  return L.divIcon({
    html: `<div style="background:white;border:2px solid #3b82f6;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2)">🏨</div>`,
    className: '',
    iconAnchor: [14, 14],
  })
}

// Inner component that adjusts bounds when props change
function BoundsFitter({ route, hotels }) {
  const map = useMap()

  useEffect(() => {
    if (route?.mapBounds) {
      map.fitBounds(
        [[route.mapBounds.sw.lat, route.mapBounds.sw.lng], [route.mapBounds.ne.lat, route.mapBounds.ne.lng]],
        { padding: [40, 40] }
      )
    } else if (hotels?.length > 0) {
      const lats = hotels.filter(h => h.lat).map(h => h.lat)
      const lngs = hotels.filter(h => h.lng).map(h => h.lng)
      if (lats.length) {
        map.fitBounds(
          [[Math.min(...lats) - 0.02, Math.min(...lngs) - 0.02], [Math.max(...lats) + 0.02, Math.max(...lngs) + 0.02]]
        )
      }
    }
  }, [route, hotels, map])

  return null
}

export default function MapView({ route, hotels = [], height = '420px' }) {
  // Determine initial center
  const center = useMemo(() => {
    if (route?.origin?.lat && route?.destination?.lat) {
      return [(route.origin.lat + route.destination.lat) / 2, (route.origin.lng + route.destination.lng) / 2]
    }
    if (hotels.length > 0 && hotels[0].lat) return [hotels[0].lat, hotels[0].lng]
    return [20, 77]
  }, [route, hotels])

  const zoom = route?.origin?.lat ? 5 : hotels.length > 0 ? 13 : 4

  // Flight arc coordinates
  const flightCoords = useMemo(() => {
    if (route?.flight?.geometry?.coordinates) {
      return route.flight.geometry.coordinates.map(c => [c[1], c[0]])
    }
    return []
  }, [route])

  // Drive route coordinates
  const driveCoords = useMemo(() => {
    if (route?.drive?.geometry?.coordinates) {
      return route.drive.geometry.coordinates.map(c => [c[1], c[0]])
    }
    return []
  }, [route])

  const validHotels = hotels.filter(h => h.lat && h.lng)

  return (
    <div>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, borderRadius: '16px', zIndex: 1 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* Route markers */}
        {route?.origin?.lat && (
          <Marker
            position={[route.origin.lat, route.origin.lng]}
            icon={labelIcon(route.origin.city || 'Origin', '#3b82f6')}
          />
        )}
        {route?.destination?.lat && (
          <Marker
            position={[route.destination.lat, route.destination.lng]}
            icon={labelIcon(route.destination.city || 'Destination', '#10b981')}
          />
        )}

        {/* Flight arc */}
        {flightCoords.length > 0 && (
          <Polyline
            positions={flightCoords}
            pathOptions={{ color: '#3b82f6', weight: 2.5, opacity: 0.7, dashArray: '8 5' }}
          />
        )}

        {/* Drive route */}
        {driveCoords.length > 0 && (
          <Polyline
            positions={driveCoords}
            pathOptions={{ color: '#10b981', weight: 4, opacity: 0.8 }}
          />
        )}

        {/* Hotel markers */}
        {validHotels.map((h, i) => (
          <Marker
            key={h.id || `hotel-marker-${i}`}
            position={[h.lat, h.lng]}
            icon={hotelIcon()}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong style={{ fontSize: 13 }}>{h.name}</strong><br />
                {h.stars ? '★'.repeat(Math.min(h.stars, 5)) : ''}<br />
                {h.price ? <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>${h.price}/night</span> : null}
                {h.area ? <><br /><span style={{ color: '#666', fontSize: 12 }}>📍 {h.area}</span></> : null}
                {h.bookingUrl ? (
                  <><br /><a href={h.bookingUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: 12 }}>Book →</a></>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}

        <BoundsFitter route={route} hotels={validHotels} />
      </MapContainer>

      {/* Legend */}
      {route && (
        <div className="mt-3 flex gap-4 text-xs text-gray-500 flex-wrap">
          {flightCoords.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-6" style={{ borderTop: '2px dashed #3b82f6' }} />
              Flight path
            </span>
          )}
          {driveCoords.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-1 bg-green-500 rounded" />
              Drive route ({route.drive?.distance_km} km · {route.drive?.duration_text})
            </span>
          )}
          {route.distance_km && (
            <span>✈ Air distance: {route.distance_km} km</span>
          )}
        </div>
      )}
    </div>
  )
}
