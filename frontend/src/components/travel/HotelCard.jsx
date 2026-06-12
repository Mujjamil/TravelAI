import { memo } from 'react'
import Stars from '../common/Stars'
import RideOptions from '../features/RideOptions.jsx'

function formatPrice(price) {
  if (price == null || price === 0) return null
  return typeof price === 'number' ? Math.round(price).toLocaleString() : String(price)
}

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d) ? null : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function HotelCard({ hotel, selected = false, onSelect }) {
  const priceStr  = formatPrice(hotel.price)
  const checkInStr  = formatDate(hotel.checkIn)
  const checkOutStr = formatDate(hotel.checkOut)
  const location = hotel.area || hotel.address || ''
  const currency = hotel.currency === 'INR' ? '₹' : hotel.currency === 'EUR' ? '€' : '$'

  return (
    <div
      onClick={() => onSelect?.(hotel)}
      className={`hotel-card group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${
        onSelect ? 'cursor-pointer' : ''
      } ${selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />

      {/* Header: name + price */}
      <div className="flex items-start justify-between gap-5 pt-1">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold leading-snug text-slate-900">
            {hotel.name || 'Hotel'}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
            <span aria-hidden="true">📍</span>
            <span className="truncate">{location}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          {priceStr ? (
            <>
              <div className="text-2xl font-extrabold tracking-tight text-blue-600">
                {currency}{priceStr}
              </div>
              <div className="text-[11px] font-medium text-slate-400">per night</div>
              {hotel.priceEstimated && (
                <div className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Estimated
                </div>
              )}
            </>
          ) : (
            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">See live price</div>
          )}
        </div>
      </div>

      {/* Rating row */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {hotel.stars ? <Stars count={hotel.stars} size="md" /> : null}
        {hotel.rating ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            {hotel.rating}/10
          </span>
        ) : null}
        {hotel.source && (
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {hotel.source}
          </span>
        )}
      </div>

      {/* Check-in / check-out dates */}
      {checkInStr && checkOutStr && (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
          <span aria-hidden="true">📅</span> {checkInStr} <span className="mx-1 text-slate-300">→</span> {checkOutStr}
        </div>
      )}

      {/* Real-time reviews */}
      {hotel.reviews && hotel.reviews.length > 0 && (
        <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>💬 Recent Guest Reviews</span>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">Real-time</span>
          </div>
          <div className="space-y-2">
            {hotel.reviews.map((rev, index) => (
              <div key={index} className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-2.5 text-[11px] transition-colors border border-slate-100/60">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-4.5 h-4.5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold">
                      {rev.author.charAt(0)}
                    </span>
                    {rev.author}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50/80 px-1.5 py-0.2 rounded">
                    ★ {rev.rating}
                  </span>
                </div>
                <p className="text-slate-500 italic leading-relaxed">"{rev.text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking buttons */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {hotel.bookingUrl ? (
          <a
            href={hotel.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Check ${hotel.name || 'hotel'} availability on Booking.com`}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl bg-[#003b95] px-2 py-2 text-white shadow-sm transition hover:bg-[#002f76] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <span className="max-w-full truncate text-sm font-bold">Booking.com</span>
            <span className="mt-0.5 text-[10px] font-medium text-blue-100">Check rooms ↗</span>
          </a>
        ) : (
          <span className="flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-3 text-xs text-slate-400">
            Booking link unavailable
          </span>
        )}
        {hotel.agodaUrl ? (
          <a
            href={hotel.agodaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Compare ${hotel.name || 'hotel'} prices on Agoda`}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-2 py-2 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2"
          >
            <span className="max-w-full truncate text-sm font-bold">Agoda</span>
            <span className="mt-0.5 text-[10px] font-medium text-rose-500">Compare price ↗</span>
          </a>
        ) : (
          <span className="flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-3 text-xs text-slate-400">
            Agoda link unavailable
          </span>
        )}
      </div>

      {selected && (
        <div className="mt-3 rounded-lg bg-blue-50 py-1.5 text-center text-xs font-semibold text-blue-700">
          📍 Selected for map
        </div>
      )}

      <div className="mt-auto">
        <RideOptions destination={hotel.name} compact />
      </div>
    </div>
  )
}

export default memo(HotelCard)
