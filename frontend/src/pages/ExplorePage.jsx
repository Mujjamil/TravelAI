/**
 * ExplorePage — Search & discovery with shared components.
 * Uses useTripStore so results persist when navigating back from Chat.
 * Quick-route buttons auto-trigger a search.
 * Debounced inputs prevent excessive API calls while typing.
 * Search history chips let users re-run recent searches instantly.
 */

import { useState, Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'

import { api }              from '../api/index.js'
import { useTripStore }     from '../store/useTripStore.js'
import { useDebounce }      from '../hooks/useDebounce.js'

import FlightList         from '../components/travel/FlightList.jsx'
import HotelGrid          from '../components/travel/HotelGrid.jsx'
import TravelModeSelector from '../components/features/TravelModeSelector.jsx'
import SaveTripPanel      from '../components/features/SaveTripPanel.jsx'

const MapView = lazy(() => import('../components/travel/MapView.jsx'))

const QUICK_ROUTES = [
  ['Delhi', 'Goa'],
  ['Delhi', 'Mumbai'],
  ['Bangalore', 'Chennai'],
  ['London', 'Paris'],
  ['New York', 'Miami'],
]

export default function ExplorePage() {
  const { t } = useTranslation()

  const tomorrow    = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate     = tomorrow.toISOString().slice(0, 10)
  const defaultDate = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })()

  const [origin,      setOrigin]      = useState('Delhi')
  const [destination, setDestination] = useState('London')
  const [date,        setDate]        = useState(defaultDate)
  const [budget,      setBudget]      = useState('mid-range')
  const [error,       setError]       = useState(null)
  const [loadingAll,  setLoadingAll]  = useState(false)

  // Results + history from Zustand (shared with ChatPage dashboard)
  const {
    flights, hotels, route,
    isEstimated, hotelsEstimated, loadingFlights, loadingHotels,
    activeTab, setActiveTab,
    setFlights, setHotels, setRoute,
    setLastSearch,
    searchHistory, addToSearchHistory,
    clearResults,
  } = useTripStore()

  const loading    = loadingAll || loadingFlights || loadingHotels
  const hasResults = flights.length > 0 || hotels.length > 0

  // Debounce so the Search button disables immediately when origin/dest are cleared
  const debouncedOrigin      = useDebounce(origin, 400)
  const debouncedDestination = useDebounce(destination, 400)

  const validate = (o, d) => {
    if (!o?.trim()) return 'Origin city is required.'
    if (!d?.trim()) return 'Destination city is required.'
    if (o.trim().toLowerCase() === d.trim().toLowerCase()) return 'Origin and destination must be different cities.'
    const today = new Date().toISOString().slice(0, 10)
    if (date && date < today) return 'Travel date must be today or in the future.'
    return null
  }

  const search = async (o = origin, d = destination) => {
    const validationError = validate(o, d)
    if (validationError) { setError(validationError); return }

    setLoadingAll(true)
    setError(null)
    clearResults()

    // Calculate checkOut = checkIn + 7 days for hotel search
    const checkOut = (() => {
      const d2 = new Date(date || new Date())
      d2.setDate(d2.getDate() + 7)
      return d2.toISOString().slice(0, 10)
    })()

    try {
      const [fRes, hRes, rRes] = await Promise.allSettled([
        api.travel.flights({ origin: o, destination: d, date }),
        api.travel.hotels({ city: d, budget, checkIn: date, checkOut }),
        api.travel.route({ origin: o, destination: d }),
      ])

      if (fRes.status === 'fulfilled') setFlights(fRes.value.flights || [], fRes.value.isEstimated)
      if (hRes.status === 'fulfilled') setHotels(hRes.value.hotels || [], hRes.value.isEstimated ?? false)
      if (rRes.status === 'fulfilled') setRoute(rRes.value)

      setLastSearch({ origin: o, destination: d, date, budget })
      addToSearchHistory({ origin: o, destination: d, date, budget, ts: Date.now() })
      setActiveTab('flights')
    } catch {
      setError(t('explore.searchFailed'))
    } finally {
      setLoadingAll(false)
    }
  }

  const handleQuickRoute = (o, d) => {
    setOrigin(o)
    setDestination(d)
    search(o, d)
  }

  const handleHistoryClick = (entry) => {
    setOrigin(entry.origin)
    setDestination(entry.destination)
    if (entry.date) setDate(entry.date)
    if (entry.budget) setBudget(entry.budget)
    search(entry.origin, entry.destination)
  }

  const TAB_LIST = [
    { key: 'flights', label: t('explore.tabFlights', { count: flights.length }), show: true },
    { key: 'hotels',  label: t('explore.tabHotels', { count: hotels.length }),   show: true },
    { key: 'map',     label: '🗺️ Map',                                             show: !!(route || hotels.length) },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-10">
      <h1 className="text-2xl font-bold mb-1">{t('explore.title')}</h1>
      <p className="text-gray-500 text-sm mb-6">{t('explore.subtitle')}</p>

      {/* ── Search form ──────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">{t('explore.from')}</label>
            <input
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('explore.originPlaceholder')}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">{t('explore.to')}</label>
            <input
              value={destination}
              onChange={e => setDestination(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('explore.destinationPlaceholder')}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">{t('explore.date')}</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">{t('explore.budget')}</label>
            <select
              value={budget}
              onChange={e => setBudget(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="budget">Budget</option>
              <option value="mid-range">Mid-Range</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => search()}
              disabled={loading || !debouncedOrigin.trim() || !debouncedDestination.trim()}
              className="w-full btn-blue py-2 text-sm disabled:opacity-60"
            >
              {loading ? t('explore.searching') : t('explore.search')}
            </button>
          </div>
        </div>

        {/* Travel mode */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <TravelModeSelector />
        </div>

        {/* Quick routes */}
        <div className="mt-3 flex gap-2 flex-wrap">
          <span className="text-xs text-gray-400">{t('explore.quick')}</span>
          {QUICK_ROUTES.map(([o, d]) => (
            <button
              key={o + d}
              onClick={() => handleQuickRoute(o, d)}
              disabled={loading}
              className="text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 px-2 py-1 rounded-full transition-colors disabled:opacity-40"
            >
              {o} → {d}
            </button>
          ))}
        </div>

        {/* Recent searches */}
        {searchHistory.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap items-center">
            <span className="text-xs text-gray-400">Recent:</span>
            {searchHistory.map((entry, i) => (
              <button
                key={i}
                onClick={() => handleHistoryClick(entry)}
                disabled={loading}
                className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 px-2 py-1 rounded-full transition-colors disabled:opacity-40"
              >
                {entry.origin} → {entry.destination}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm">❌ {error}</div>
      )}

      {/* ── Map (shown above tabs when route/hotels available) ── */}
      {(route || hotels.length > 0) && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">
              {t('explore.routeMapTitle', { origin, destination })}
              {route?.canDrive && (
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {t('explore.drivable')}
                </span>
              )}
            </h2>
            {route?.canDrive && (
              <div className="text-xs text-gray-500">
                🚗 {route.drive?.distance_km} km · {route.drive?.duration_text}
              </div>
            )}
          </div>
          <Suspense fallback={<div className="h-[420px] animate-pulse bg-slate-100 rounded-xl" />}>
            <MapView hotels={hotels} route={route} hotelCity={destination} />
          </Suspense>
          {route && !route.canDrive && (
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
              {t('explore.internationalNotice', { origin, destination, km: route.distance_km })}
            </div>
          )}
        </div>
      )}

      {/* ── Results tabs ─────────────────────────────────────── */}
      {hasResults && (
        <div>
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {TAB_LIST.filter(tab => tab.show).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`btn text-sm px-4 py-2 flex-shrink-0 ${activeTab === tab.key ? 'tab-active' : 'tab-inactive'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'flights' && (
            <FlightList flights={flights} loading={loadingFlights} isEstimated={isEstimated} />
          )}
          {activeTab === 'hotels' && (
            <HotelGrid hotels={hotels} loading={loadingHotels} isEstimated={hotelsEstimated} />
          )}
          {activeTab === 'map' && (
            <div className="card">
              <Suspense fallback={<div className="h-[480px] animate-pulse bg-slate-100 rounded-xl" />}>
                <MapView hotels={hotels} route={route} height="480px" />
              </Suspense>
            </div>
          )}

          {/* Save to trip panel */}
          <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
            <SaveTripPanel />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasResults && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-6xl mb-4">🌍</div>
          <div className="text-lg font-medium mb-2">{t('explore.emptyTitle')}</div>
          <div className="text-sm">{t('explore.emptySubtitle')}</div>
        </div>
      )}
    </div>
  )
}
