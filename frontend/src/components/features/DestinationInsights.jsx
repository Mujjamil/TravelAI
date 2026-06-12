/**
 * DestinationInsights — fetches best-time + logistics data and displays it.
 * Calls /api/travel/best-time and /api/travel/logistics in parallel.
 * Stores merged result in useTripStore.insights.
 *
 * Props:
 *   destination (string) — city/destination name
 */

import { useEffect, useState } from 'react'
import { api }          from '../../api/index.js'
import { useTripStore } from '../../store/useTripStore.js'

const SCORE_COLOR = (score) => {
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 60) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

const CROWD_COLOR = { high: 'bg-red-100 text-red-600', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' }
const RISK_COLOR  = { high: 'bg-red-100 text-red-600', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' }

export default function DestinationInsights({ destination }) {
  const { insights, setInsights } = useTripStore()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!destination?.trim()) return
    // Only re-fetch if destination changed
    if (insights?.destination?.toLowerCase() === destination.trim().toLowerCase()) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const month = new Date().getMonth() + 1
    Promise.all([
      api.travel.bestTime({ destination: destination.trim(), month }),
      api.travel.logistics({ city: destination.trim() }),
    ])
      .then(([btData, logData]) => {
        if (cancelled) return
        setInsights({
          destination:         destination.trim(),
          crowdLevel:          btData.crowdLevel,
          weatherRisk:         btData.weatherRisk,
          recommendationScore: btData.recommendationScore,
          summary:             btData.summary,
          airportTransfer:     logData.airportTransfer || [],
          transportPasses:     logData.transportPasses || [],
          emergency:           logData.emergency || {},
        })
      })
      .catch(() => {
        if (!cancelled) setError('Could not load destination insights.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [destination, insights, setInsights])

  if (!destination?.trim()) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="text-4xl mb-3">🔍</div>
        <div className="text-sm">Search for a destination to see insights.</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-sm text-red-500 p-4">{error}</div>
  }

  if (!insights) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-800">📍 {insights.destination}</div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${SCORE_COLOR(insights.recommendationScore)}`}>
          Score: {insights.recommendationScore}/100
        </span>
      </div>

      {/* Crowd + Weather pills */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Crowds:</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${CROWD_COLOR[insights.crowdLevel] || 'bg-slate-100 text-slate-600'}`}>
            {insights.crowdLevel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Weather risk:</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${RISK_COLOR[insights.weatherRisk] || 'bg-slate-100 text-slate-600'}`}>
            {insights.weatherRisk}
          </span>
        </div>
      </div>

      {/* Summary */}
      {insights.summary && (
        <p className="text-xs text-gray-600 bg-slate-50 rounded-xl p-3 leading-relaxed">
          {insights.summary}
        </p>
      )}

      {/* Airport Transfer */}
      {insights.airportTransfer?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">🚕 Airport Transfer</div>
          <ul className="space-y-1">
            {insights.airportTransfer.map((tip, i) => (
              <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transport Passes */}
      {insights.transportPasses?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">🚌 Transport Passes</div>
          <ul className="space-y-1">
            {insights.transportPasses.map((tip, i) => (
              <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Emergency contacts */}
      {insights.emergency && Object.keys(insights.emergency).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">🆘 Emergency Contacts</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(insights.emergency).map(([key, val]) => (
              <div key={key} className="bg-red-50 rounded-xl p-2 text-center">
                <div className="text-[10px] text-red-400 capitalize">{key}</div>
                <div className="text-sm font-bold text-red-600">{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
