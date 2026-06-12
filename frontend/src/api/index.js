/**
 * Centralized API client
 * All backend calls go through these functions — no raw axios in page components.
 *
 * Features:
 * - TTL cache for GET requests (flights/hotels/route/bestTime/logistics)
 * - Per-request retry (up to 3 times) for 5xx / network errors
 */

import axios from 'axios'
import { cache } from './cache.js'

const client = axios.create({
  withCredentials: true,
})

// Keep X-Locale in sync with whatever i18n sets in localStorage
client.interceptors.request.use((config) => {
  const locale = localStorage.getItem('tp_locale') || 'en'
  config.headers['X-Locale'] = locale
  return config
})

// Response interceptor: 401 → login redirect; 5xx → retry (up to 3×)
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config
    const status = err.response?.status

    if (status === 401) {
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // Retry on 5xx or network error (no status) — but NOT on 4xx or abort
    if (config && err.name !== 'AbortError' && err.name !== 'CanceledError') {
      config._retryCount = config._retryCount || 0
      if (config._retryCount < 3 && (!status || status >= 500)) {
        config._retryCount += 1
        await new Promise(r => setTimeout(r, config._retryCount * 1000))
        return client(config)
      }
    }

    return Promise.reject(err)
  }
)

// ── Cached GET helper ──────────────────────────────────────────
async function cachedGet(url, params, ttlMs = 300_000) {
  const key = url + JSON.stringify(params || {})
  const hit = cache.get(key)
  if (hit) return hit
  const data = await client.get(url, { params }).then(r => r.data)
  cache.set(key, data, ttlMs)
  return data
}

// ── Auth ──────────────────────────────────────────────────────
export const api = {
  auth: {
    login:         (body) => client.post('/api/auth/login', body).then(r => r.data),
    register:      (body) => client.post('/api/auth/register', body).then(r => r.data),
    logout:        ()     => client.post('/api/auth/logout').then(r => r.data),
    me:            ()     => client.get('/api/auth/me').then(r => r.data),
    forgotPassword:(body) => client.post('/api/auth/forgot-password', body).then(r => r.data),
    resetPassword: (body) => client.post('/api/auth/reset-password', body).then(r => r.data),
  },

  // ── Chat ──────────────────────────────────────────────────
  chat: {
    send: (body, signal) =>
      client.post('/api/chat', body, { signal }).then(r => r.data),

    recognizePlace: (formData, signal) =>
      client.post('/api/chat/recognize-place', formData, { signal }).then(r => r.data),

    nlpHealth: () => client.get('/api/chat/nlp-health').then(r => r.data),

    clearSession: (id) => client.delete(`/api/chat/session/${id}`).then(r => r.data),
  },

  // ── Chat History ──────────────────────────────────────────
  history: {
    list: () =>
      client.get('/api/chat-history').then(r => r.data),

    create: (body) =>
      client.post('/api/chat-history', body).then(r => r.data),

    getMessages: (conversationId) =>
      client.get(`/api/chat-history/${conversationId}/messages`).then(r => r.data),

    addMessage: (conversationId, body) =>
      client.post(`/api/chat-history/${conversationId}/messages`, body).then(r => r.data),

    update: (conversationId, body) =>
      client.patch(`/api/chat-history/${conversationId}`, body).then(r => r.data),

    delete: (conversationId) =>
      client.delete(`/api/chat-history/${conversationId}`).then(r => r.data),
  },

  // ── Travel Data ───────────────────────────────────────────
  travel: {
    // Cached for 5 minutes each
    flights:  (params) => cachedGet('/api/travel/flights',   params, 5 * 60_000),
    hotels:   (params) => cachedGet('/api/travel/hotels',    params, 5 * 60_000),
    route:    (params) => cachedGet('/api/travel/route',     params, 10 * 60_000),
    bestTime: (params) => cachedGet('/api/travel/best-time', params, 10 * 60_000),
    logistics:(params) => cachedGet('/api/travel/logistics', params, 10 * 60_000),

    // Not cached — these are POST or combined calls
    autoItinerary: (body) =>
      client.post('/api/travel/auto-itinerary', body).then(r => r.data),

    search: (params) =>
      client.get('/api/travel/search', { params }).then(r => r.data),

    completePlan: (params) =>
      client.get('/api/travel/complete-plan', { params }).then(r => r.data),
  },

  // ── Trips ─────────────────────────────────────────────────
  trips: {
    list: () =>
      client.get('/api/trips').then(r => r.data),

    create: (body) =>
      client.post('/api/trips', body).then(r => r.data),

    get: (id) =>
      client.get(`/api/trips/${id}`).then(r => r.data),

    details: (id) =>
      client.get(`/api/trips/${id}/details`).then(r => r.data),

    update: (id, body) =>
      client.put(`/api/trips/${id}`, body).then(r => r.data),

    delete: (id) =>
      client.delete(`/api/trips/${id}`).then(r => r.data),

    duplicate: (id) =>
      client.post(`/api/trips/${id}/duplicate`).then(r => r.data),

    share: (id) =>
      client.post(`/api/trips/${id}/share`).then(r => r.data),

    exportIcs: (id) =>
      client.get(`/api/trips/${id}/export-ics`).then(r => r.data),

    listDocuments: (id) =>
      client.get(`/api/trips/${id}/documents`).then(r => r.data),

    uploadDocument: (id, formData) =>
      client.post(`/api/trips/${id}/documents`, formData).then(r => r.data),

    deleteDocument: (id, docId) =>
      client.delete(`/api/trips/${id}/documents/${docId}`).then(r => r.data),
  },

  // ── Users ─────────────────────────────────────────────────
  users: {
    getPreferences: () =>
      client.get('/api/users/preferences').then(r => r.data),

    savePreferences: (body) =>
      client.put('/api/users/preferences', body).then(r => r.data),

    getProfile: () =>
      client.get('/api/users/profile').then(r => r.data),
  },

  // ── Bookings ──────────────────────────────────────────────
  bookings: {
    list: () =>
      client.get('/api/bookings').then(r => r.data),

    get: (id) =>
      client.get(`/api/bookings/${id}`).then(r => r.data),

    checkout: (body) =>
      client.post('/api/bookings/checkout', body).then(r => r.data),

    cancel: (id) =>
      client.post(`/api/bookings/${id}/cancel`).then(r => r.data),
  },
}

export default client
