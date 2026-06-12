/**
 * useTripStore — Zustand store for travel results + current trip
 *
 * Persists across navigation (Chat ↔ Explore ↔ Trips).
 * ChatPage and ExplorePage both write here; both read here.
 */

import { create } from 'zustand'

export const useTripStore = create((set) => ({
  // ── Current selected trip ────────────────────────────────
  currentTrip: null,

  // ── Search results ───────────────────────────────────────
  flights:      [],
  hotels:       [],
  route:        null,
  itinerary:    null,
  packingList:  null,
  recommendedPlaces: [],
  media: [],
  isEstimated:        false,   // flights estimated
  hotelsEstimated:    false,   // hotels estimated

  // ── Loading states ───────────────────────────────────────
  loadingFlights: false,
  loadingHotels:  false,

  // ── Dashboard tab ────────────────────────────────────────
  activeTab: 'flights',   // 'flights' | 'hotels' | 'map' | 'itinerary' | 'budget' | 'insights'

  // ── Search context (for repopulating explore form) ───────
  lastSearch: null,       // { origin, destination, date, budget }

  // ── Travel mode ───────────────────────────────────────────
  travelMode: 'comfort',  // 'budget' | 'comfort' | 'luxury' | 'solo' | 'family'

  // ── Search history (last 5 unique origin→destination) ────
  searchHistory: [],      // [{ origin, destination, date, budget, ts }]

  // ── Budget plan (computed locally in BudgetPlanner) ──────
  budgetPlan: null,       // { flightCost, hotelCostPerNight, days, dailyExpenses, total }

  // ── Destination insights (from best-time + logistics) ────
  insights: null,         // { destination, crowdLevel, weatherRisk, recommendationScore,
                          //   summary, airportTransfer[], transportPasses[], emergency }

  // ── Actions ──────────────────────────────────────────────

  setCurrentTrip: (trip) => set({ currentTrip: trip }),

  setLoadingFlights: (v) => set({ loadingFlights: v }),
  setLoadingHotels:  (v) => set({ loadingHotels: v }),

  setFlights: (flights, isEstimated = false) =>
    set({ flights, isEstimated, activeTab: 'flights', loadingFlights: false }),

  setHotels: (hotels, hotelsEstimated = false) =>
    set({ hotels, hotelsEstimated, activeTab: 'hotels', loadingHotels: false }),

  setRoute: (route) =>
    set({ route }),

  setItinerary: (itinerary) =>
    set({ itinerary, activeTab: 'itinerary' }),

  setTripExtras: ({ itinerary, packingList, recommendedPlaces, media }) =>
    set({
      itinerary: itinerary || null,
      packingList: packingList || null,
      recommendedPlaces: recommendedPlaces || [],
      media: media || [],
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setLastSearch: (params) => set({ lastSearch: params }),

  setTravelMode: (mode) => set({ travelMode: mode }),

  addToSearchHistory: (entry) => set((s) => ({
    searchHistory: [
      entry,
      ...s.searchHistory.filter(
        e => !(e.origin === entry.origin && e.destination === entry.destination)
      ),
    ].slice(0, 5),
  })),

  setBudgetPlan: (plan) => set({ budgetPlan: plan }),

  setInsights: (insights) => set({ insights }),

  clearResults: () =>
    set({
      flights: [],
      hotels: [],
      route: null,
      itinerary: null,
      packingList: null,
      recommendedPlaces: [],
      media: [],
      isEstimated: false,
      hotelsEstimated: false,
      loadingFlights: false,
      loadingHotels: false,
      activeTab: 'flights',
      lastSearch: null,
      budgetPlan: null,
      insights: null,
    }),
}))
