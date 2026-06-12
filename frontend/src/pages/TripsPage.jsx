/**
 * TripsPage — Trip management.
 * Uses TripCard component, ConfirmDialog via useUIStore, Toast for success messages.
 * Sets currentTrip in useTripStore when a trip is selected.
 */

import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { api }              from '../api/index.js'
import { useTripStore }     from '../store/useTripStore.js'
import { useUIStore }       from '../store/useUIStore.js'
import TripCard             from '../components/trips/TripCard.jsx'
import SkeletonCard         from '../components/common/SkeletonCard.jsx'
import ItineraryGenerator   from '../components/features/ItineraryGenerator.jsx'

export default function TripsPage() {
  const nav = useNavigate()
  const { t } = useTranslation()

  const { setCurrentTrip }              = useTripStore()
  const { addToast }                    = useUIStore()

  const [trips,         setTrips]       = useState([])
  const [loading,       setLoading]     = useState(true)
  const [saving,        setSaving]      = useState(false)
  const [selectedTripId, setSelectedTripId] = useState('')
  const [form, setForm] = useState({
    title: '', destination: '', startDate: '', endDate: '', budget: '', notes: '',
  })
  const [preferences, setPreferences] = useState({
    budgetStyle: 'mid-range',
    cabinClass:  'ECONOMY',
    pace:        'balanced',
    hotelType:   'hotel',
  })
  const [prefSaving,  setPrefSaving]   = useState(false)
  const [docUploading, setDocUploading] = useState(false)
  const [docs,         setDocs]         = useState([])
  const fileRef = useRef(null)

  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId) || null, [trips, selectedTripId])

  // ── Load trips + preferences ────────────────────────────────
  const loadTrips = async () => {
    try {
      const { trips: list } = await api.trips.list()
      setTrips(Array.isArray(list) ? list : [])
      if (!selectedTripId && list?.[0]?.id) setSelectedTripId(list[0].id)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrips()
    api.users.getPreferences()
      .then(({ preferences: prefs }) => {
        if (prefs && typeof prefs === 'object') {
          setPreferences(p => ({ ...p, ...prefs }))
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load docs when selected trip changes
  useEffect(() => {
    if (!selectedTripId) { setDocs([]); return }
    api.trips.listDocuments(selectedTripId)
      .then(data => setDocs(Array.isArray(data.documents) ? data.documents : []))
      .catch(() => setDocs([]))
  }, [selectedTripId])

  // Sync currentTrip to Zustand
  useEffect(() => {
    if (selectedTrip) setCurrentTrip(selectedTrip)
  }, [selectedTrip, setCurrentTrip])

  // ── Trip CRUD ────────────────────────────────────────────────
  const createTrip = async () => {
    if (!form.title.trim() || !form.destination.trim()) return
    setSaving(true)
    try {
      const { trip } = await api.trips.create(form)
      setTrips(prev => [trip, ...prev])
      setSelectedTripId(trip.id)
      setForm({ title: '', destination: '', startDate: '', endDate: '', budget: '', notes: '' })
      addToast('Trip created!', 'success')
    } catch {
      addToast('Failed to create trip.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const deleteTrip = async (id) => {
    try {
      await api.trips.delete(id)
      setTrips(prev => prev.filter(t => t.id !== id))
      if (selectedTripId === id) setSelectedTripId('')
      addToast('Trip deleted.', 'info')
    } catch {
      addToast('Failed to delete trip.', 'error')
    }
  }

  const duplicateTrip = async (id) => {
    try {
      const { trip } = await api.trips.duplicate(id)
      setTrips(prev => [trip, ...prev])
      setSelectedTripId(trip.id)
      addToast('Trip duplicated!', 'success')
    } catch {
      addToast('Failed to duplicate trip.', 'error')
    }
  }

  const shareTrip = async (id) => {
    try {
      const { shareUrl } = await api.trips.share(id)
      await navigator.clipboard.writeText(window.location.origin + shareUrl)
      addToast(t('trips.shareSuccess'), 'success')
    } catch {
      addToast('Could not copy link.', 'error')
    }
  }

  const exportCalendar = async (id) => {
    try {
      window.open(`/api/trips/${id}/export-ics`, '_blank')
    } catch {
      addToast('Could not export calendar.', 'error')
    }
  }

  // ── Preferences ──────────────────────────────────────────────
  const savePreferences = async () => {
    setPrefSaving(true)
    try {
      await api.users.savePreferences(preferences)
      addToast('Preferences saved!', 'success')
    } catch {
      addToast('Failed to save preferences.', 'error')
    } finally {
      setPrefSaving(false)
    }
  }

  // ── Documents ────────────────────────────────────────────────
  const uploadDoc = async (file) => {
    if (!selectedTripId || !file) return
    const form = new FormData()
    form.append('document', file)
    form.append('name', file.name)
    setDocUploading(true)
    try {
      const { document: doc } = await api.trips.uploadDocument(selectedTripId, form)
      setDocs(prev => [doc, ...prev])
      addToast('Document uploaded!', 'success')
    } catch {
      addToast('Upload failed.', 'error')
    } finally {
      setDocUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeDoc = async (docId) => {
    try {
      await api.trips.deleteDocument(selectedTripId, docId)
      setDocs(prev => prev.filter(d => d.id !== docId))
      addToast('Document removed.', 'info')
    } catch {
      addToast('Could not remove document.', 'error')
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-10">
      <h1 className="text-2xl font-bold mb-6">{t('trips.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: create form + trip list ─────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Create trip form */}
          <div className="card">
            <h2 className="font-semibold text-sm text-slate-700 mb-3">+ {t('trips.planNew')}</h2>
            <div className="space-y-2">
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={t('trips.tripTitlePlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                placeholder={t('trips.destinationPlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                placeholder={t('trips.budgetPlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={createTrip}
                disabled={saving || !form.title.trim() || !form.destination.trim()}
                className="w-full btn-blue py-2 text-sm disabled:opacity-60"
              >
                {saving ? t('trips.saving') : t('trips.createTrip')}
              </button>
            </div>
          </div>

          {/* Trip list */}
          <div className="space-y-2">
            {loading ? (
              <SkeletonCard type="trip" count={3} />
            ) : trips.length === 0 ? (
              <div className="card text-center text-sm text-gray-400 py-8">
                {t('trips.createFirst')}
              </div>
            ) : (
              trips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  isSelected={trip.id === selectedTripId}
                  onSelect={(id) => setSelectedTripId(id)}
                  onChat={(t) => nav('/chat', { state: { trip: t } })}
                  onDetails={(id) => nav(`/trips/${id}/details`)}
                  onDuplicate={duplicateTrip}
                  onShare={shareTrip}
                  onExport={exportCalendar}
                  onDelete={deleteTrip}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right column: selected trip details ──────────── */}
        <div className="lg:col-span-2 space-y-4">

          {selectedTrip ? (
            <>
              {/* Trip header */}
              <div className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-bold">{selectedTrip.title}</h2>
                    <div className="text-sm text-gray-500 mt-1">
                      📍 {selectedTrip.destination || t('trips.noDestination')}
                      {selectedTrip.startDate && <span className="ml-3">📅 {selectedTrip.startDate} → {selectedTrip.endDate || '?'}</span>}
                      {selectedTrip.budget    && <span className="ml-3">💰 {selectedTrip.budget}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => nav('/chat', { state: { trip: selectedTrip } })}
                    className="text-xs btn-blue px-3 py-2 flex-shrink-0"
                  >
                    💬 {t('trips.open')} in Chat
                  </button>
                </div>
                {selectedTrip.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedTrip.notes}
                  </div>
                )}
              </div>

              {/* Document Vault */}
              <div className="card">
                <h3 className="font-semibold text-sm mb-3">{t('trips.documentVault')}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={e => uploadDoc(e.target.files?.[0])}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={docUploading}
                    className="btn-ghost text-sm py-2 px-4 disabled:opacity-60"
                  >
                    {docUploading ? 'Uploading...' : '📎 Upload Document'}
                  </button>
                </div>
                {docs.length === 0 ? (
                  <div className="text-sm text-gray-400">{t('trips.noDocuments')}</div>
                ) : (
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{doc.mimeType?.includes('pdf') ? '📄' : '🖼️'}</span>
                          <div>
                            <div className="text-sm font-medium truncate max-w-[200px]">{doc.name}</div>
                            <div className="text-xs text-gray-400">{(doc.sizeBytes / 1024).toFixed(0)} KB</div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDoc(doc.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                        >
                          {t('trips.remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Itinerary Generator */}
              <ItineraryGenerator
                destination={selectedTrip?.destination || ''}
                startDate={selectedTrip?.startDate || ''}
              />
            </>
          ) : (
            <div className="card text-center text-gray-400 py-16">
              <div className="text-4xl mb-3">🗺️</div>
              <div className="text-sm">Select a trip to see details</div>
            </div>
          )}

          {/* User Preferences */}
          <div className="card">
            <h3 className="font-semibold text-sm mb-4">{t('trips.preferencesTitle')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Budget Style</label>
                <select
                  value={preferences.budgetStyle}
                  onChange={e => setPreferences(p => ({ ...p, budgetStyle: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="budget">Budget</option>
                  <option value="mid-range">Mid-Range</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cabin Class</label>
                <select
                  value={preferences.cabinClass}
                  onChange={e => setPreferences(p => ({ ...p, cabinClass: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ECONOMY">Economy</option>
                  <option value="PREMIUM_ECONOMY">Premium Economy</option>
                  <option value="BUSINESS">Business</option>
                  <option value="FIRST">First Class</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Travel Pace</label>
                <select
                  value={preferences.pace}
                  onChange={e => setPreferences(p => ({ ...p, pace: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="relaxed">Relaxed</option>
                  <option value="balanced">Balanced</option>
                  <option value="packed">Action-packed</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hotel Type</label>
                <select
                  value={preferences.hotelType}
                  onChange={e => setPreferences(p => ({ ...p, hotelType: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hostel">Hostel</option>
                  <option value="hotel">Hotel</option>
                  <option value="boutique">Boutique</option>
                  <option value="resort">Resort</option>
                  <option value="villa">Villa</option>
                </select>
              </div>
            </div>
            <button
              onClick={savePreferences}
              disabled={prefSaving}
              className="mt-4 btn-blue py-2 px-6 text-sm disabled:opacity-60"
            >
              {prefSaving ? 'Saving...' : t('trips.savePreferences')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
