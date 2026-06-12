/**
 * ResultsDashboard — side panel showing travel search results.
 *
 * Tabs: Flights | Hotels | Map | Itinerary | Budget | Insights | Rides
 *
 * Extracted from ChatPage so it can be imported cleanly.
 * SaveTripPanel is pinned at the bottom.
 */

import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'

import { useTripStore } from '../../store/useTripStore.js'

import FlightList        from '../travel/FlightList.jsx'
import HotelGrid         from '../travel/HotelGrid.jsx'
import ItineraryView     from '../travel/ItineraryView.jsx'
import BudgetPlanner       from '../features/BudgetPlanner.jsx'
import DestinationInsights from '../features/DestinationInsights.jsx'
import SaveTripPanel       from '../features/SaveTripPanel.jsx'
import RideOptions         from '../features/RideOptions.jsx'
import { PackingList, RecommendedPlaces, MediaLinks } from '../features/TripExtras.jsx'

const MapView = lazy(() => import('../travel/MapView.jsx'))

function MapFallback({ height = '380px' }) {
  return <div className="animate-pulse bg-slate-100 rounded-xl" style={{ height }} />
}

export default function ResultsDashboard({ onClose }) {
  const { t } = useTranslation()
  const {
    flights, hotels, route, itinerary, packingList, recommendedPlaces, media,
    isEstimated, hotelsEstimated, loadingFlights, loadingHotels,
    activeTab, setActiveTab,
    lastSearch,
  } = useTripStore()

  const hasBudgetData   = flights.length > 0 || hotels.length > 0
  const hasInsightsData = !!(lastSearch?.destination)
  const hasRidesData    = !!(lastSearch?.destination)

  const tabs = [
    { key: 'flights',   label: `✈️ ${t('results.flights')} (${flights.length})`, disabled: false },
    { key: 'hotels',    label: `🏨 ${t('results.hotels')} (${hotels.length})`,   disabled: false },
    { key: 'map',       label: `🗺️ ${t('results.map')}`,                          disabled: !route && !hotels.length },
    { key: 'itinerary', label: `📅 ${t('results.itinerary')}`,                   disabled: false },
    { key: 'budget',    label: `💰 ${t('results.budget')}`,                      disabled: !hasBudgetData },
    { key: 'insights',  label: `🔍 ${t('results.insights')}`,                    disabled: !hasInsightsData },
    { key: 'rides',     label: `🚗 ${t('results.rides')}`,                       disabled: !hasRidesData },
    { key: 'places',    label: `📍 Places (${recommendedPlaces.length})`,        disabled: !recommendedPlaces.length },
    { key: 'packing',   label: '🎒 Packing',                                    disabled: !packingList },
    { key: 'media',     label: `📷 Media (${media.length})`,                     disabled: !media.length },
  ]

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 w-full md:w-[420px] md:flex-shrink-0 overflow-hidden">

      {/* Tab bar */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/80 overflow-x-auto flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && setActiveTab(tab.key)}
            disabled={tab.disabled}
            className={`results-tab-btn ${
              activeTab === tab.key ? 'results-tab-active' : 'results-tab-inactive'
            } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={onClose}
          className="ml-auto px-3 py-2.5 text-slate-400 hover:text-slate-600 text-sm flex-shrink-0"
          title={t('results.closePanel')}
        >
          ✕
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'flights' && (
          <FlightList flights={flights} loading={loadingFlights} isEstimated={isEstimated} />
        )}
        {activeTab === 'hotels' && (
          <HotelGrid
            hotels={hotels}
            loading={loadingHotels}
            isEstimated={hotelsEstimated}
            layout="single"
          />
        )}
        {activeTab === 'map' && (
          <Suspense fallback={<MapFallback height="380px" />}>
            <MapView route={route} hotels={hotels} height="380px" />
          </Suspense>
        )}
        {activeTab === 'itinerary' && (
          <ItineraryView itinerary={itinerary} />
        )}
        {activeTab === 'budget' && (
          <BudgetPlanner />
        )}
        {activeTab === 'insights' && (
          <DestinationInsights destination={lastSearch?.destination} />
        )}
        {activeTab === 'rides' && (
          <RideOptions
            destination={lastSearch?.destination}
            distanceKm={route?.drive?.distance_km || route?.distance_km || null}
          />
        )}
        {activeTab === 'places' && <RecommendedPlaces places={recommendedPlaces} />}
        {activeTab === 'packing' && <PackingList packingList={packingList} />}
        {activeTab === 'media' && <MediaLinks media={media} />}
      </div>

      {/* Save-to-trip panel — pinned at bottom, only visible when there are results */}
      <SaveTripPanel />
    </div>
  )
}
