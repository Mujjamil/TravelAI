/**
 * BudgetPlanner — locally computed budget breakdown.
 * Reads flights/hotels/travelMode from useTripStore; no API call needed.
 */

import { useState } from 'react'
import { useTripStore } from '../../store/useTripStore.js'

const DAILY_EXPENSES = {
  budget:  40 * 83,
  comfort: 100 * 83,
  luxury:  250 * 83,
  solo:    60 * 83,
  family:  180 * 83,
}

const MODE_LABELS = {
  budget:  '💰 Budget',
  comfort: '✈️ Comfort',
  luxury:  '👑 Luxury',
  solo:    '🎒 Solo',
  family:  '👨‍👩‍👧 Family',
}

function Row({ label, value, bold = false }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-slate-100 last:border-0 ${bold ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span className="text-sm">{label}</span>
      <span className={`text-sm ${bold ? 'text-blue-700 text-base' : ''}`}>{value}</span>
    </div>
  )
}

export default function BudgetPlanner() {
  const { flights, hotels, travelMode, setBudgetPlan } = useTripStore()
  const [days, setDays] = useState(7)

  const flightCost        = flights[0]?.price || 0
  const hotelPerNight     = hotels[0]?.pricePerNight || 0
  const dailyExpenses     = DAILY_EXPENSES[travelMode] || (100 * 83)
  const hotelTotal        = hotelPerNight * days
  const dailyTotal        = dailyExpenses * days
  const total             = flightCost + hotelTotal + dailyTotal

  const fmt = (n) => n > 0 ? `₹${n.toLocaleString()}` : '—'

  const handleCompute = () => {
    setBudgetPlan({ flightCost, hotelCostPerNight: hotelPerNight, days, dailyExpenses, total })
  }

  const hasData = flightCost > 0 || hotelPerNight > 0

  if (!hasData) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="text-4xl mb-3">💰</div>
        <div className="text-sm">Search for flights and hotels first to see a budget breakdown.</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Travel mode context */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Mode:</span>
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
          {MODE_LABELS[travelMode] || travelMode}
        </span>
      </div>

      {/* Days input */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600 whitespace-nowrap">Days of stay</label>
        <input
          type="number"
          min={1}
          max={30}
          value={days}
          onChange={e => { setDays(Math.max(1, Math.min(30, Number(e.target.value)))); }}
          className="w-20 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCompute}
          className="text-xs btn-blue px-3 py-1.5"
        >
          Calculate
        </button>
      </div>

      {/* Breakdown */}
      <div className="bg-slate-50 rounded-xl p-4">
        <Row label="✈️ Flights"                         value={fmt(flightCost)} />
        <Row label={`🏨 Hotel (${fmt(hotelPerNight)}/night × ${days} nights)`} value={fmt(hotelTotal)} />
        <Row label={`🍽️ Daily expenses (${fmt(dailyExpenses)}/day × ${days} days)`} value={fmt(dailyTotal)} />
        <Row label="💵 Total Estimate"                  value={fmt(total)} bold />
      </div>

      <p className="text-[11px] text-gray-400">
        Estimates based on first result · Daily expenses vary by travel mode · Add buffer for activities & transport
      </p>
    </div>
  )
}
