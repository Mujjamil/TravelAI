import { memo } from 'react'

function formatTime(iso) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return isNaN(d) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function cabinLabel(cabin) {
  if (!cabin) return 'Economy'
  return cabin.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function FlightCard({ flight }) {
  const depTime = formatTime(flight.departure)
  const arrTime = formatTime(flight.arrival)

  return (
    <div className="flight-card bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      {/* Header: airline + price */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
            {flight.airline || '✈'}
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">{flight.airlineName || 'Airline'}</div>
            {flight.flightNumber && (
              <div className="text-xs text-gray-400">{flight.flightNumber}</div>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {flight.price ? (
            <div className="text-xl font-bold text-blue-600">
              {flight.currency === 'INR' ? '₹' : '$'}{Math.round(flight.price).toLocaleString()}
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">Price on site</div>
          )}
          <div className="text-xs text-gray-400">{cabinLabel(flight.cabin)}</div>
        </div>
      </div>

      {/* Route: origin → destination with times */}
      <div className="flex items-center gap-3 text-sm mb-3">
        <div className="text-center min-w-[44px]">
          <div className="font-bold text-base">{flight.origin || '---'}</div>
          <div className="text-gray-500 text-xs">{depTime}</div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <div className="text-xs text-gray-400">{flight.duration || 'N/A'}</div>
          <div className="w-full flex items-center gap-1 my-0.5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs">✈</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="text-xs text-gray-400">
            {flight.stopLabel || (flight.stops === 0 ? 'Non-stop' : `${flight.stops || 0} stop${flight.stops !== 1 ? 's' : ''}`)}
          </div>
        </div>
        <div className="text-center min-w-[44px]">
          <div className="font-bold text-base">{flight.destination || '---'}</div>
          <div className="text-gray-500 text-xs">{arrTime}</div>
        </div>
      </div>

      {/* Booking links */}
      <div className="flex gap-2">
        {flight.bookingUrl ? (
          <a
            href={flight.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors font-medium"
          >
            View on Google Flights ↗
          </a>
        ) : (
          <span className="flex-1 text-center text-xs text-gray-400 py-2">Booking link unavailable</span>
        )}
        {flight.skyscannerUrl && (
          <a
            href={flight.skyscannerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-2 rounded-lg transition-colors font-medium"
          >
            Skyscanner ↗
          </a>
        )}
      </div>

      {/* Estimated badge */}
      {flight.source === 'Estimated' && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1 text-center">
          ⚠ Estimated price — click to see live rates
        </div>
      )}
    </div>
  )
}

export default memo(FlightCard)
