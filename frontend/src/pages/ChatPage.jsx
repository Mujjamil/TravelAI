/**
 * ChatPage — Chat + Dashboard Hybrid
 *
 * Layout:
 *   [ChatSidebar] | [Chat area] | [ResultsDashboard (slides in when data exists)]
 *
 * Mobile:
 *   Sidebar is an overlay. Dashboard replaces chat area via bottom tab bar.
 *
 * State: Zustand stores (useChatStore, useTripStore, useUIStore)
 * API:   src/api/index.js
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { api } from '../api/index.js'
import { useChatStore }  from '../store/useChatStore.js'
import { useTripStore }  from '../store/useTripStore.js'
import { useUIStore }    from '../store/useUIStore.js'

import ChatSidebar    from '../components/chat/ChatSidebar.jsx'
import MessageBubble  from '../components/chat/MessageBubble.jsx'
import TypingBubble   from '../components/chat/TypingBubble.jsx'
import QuickPrompts   from '../components/chat/QuickPrompts.jsx'
import SuggestionGrid from '../components/chat/SuggestionGrid.jsx'

import ResultsDashboard  from '../components/chat/ResultsDashboard.jsx'
import TravelModeSelector from '../components/features/TravelModeSelector.jsx'

// ── Constants ─────────────────────────────────────────────────
const DEFAULT_ORIGIN = 'Delhi'

// ── Helpers ───────────────────────────────────────────────────
function createWelcomeMessage(text) {
  return { role: 'bot', text, ts: Date.now() }
}

const isDefaultTitle = (title, defaultConvTitle) =>
  !title || title === defaultConvTitle || title === 'New Conversation'

// ── Main ChatPage ─────────────────────────────────────────────
export default function ChatPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { t, i18n } = useTranslation()
  const tripContext = location.state?.trip || null

  // ── Stores ──────────────────────────────────────────────────
  const {
    conversations, activeConversationId, loading,
    setConversations, setActiveConversationId, setLoading,
    addConversation, appendMessage, updateConversationTitle,
    setConversationMessages, getActiveConversation, getMessages,
    removeConversation,
  } = useChatStore()

  const {
    flights, hotels, route, recommendedPlaces,
    setFlights, setHotels, setRoute,
    setLoadingFlights, setLoadingHotels,
    setLastSearch, setTripExtras,
    clearResults,
  } = useTripStore()

  const {
    sidebarOpen, dashboardOpen,
    setSidebarOpen, setDashboardOpen,
    addToast,
  } = useUIStore()

  // ── Local state ─────────────────────────────────────────────
  const [input, setInput]                     = useState('')
  const [selectedImage, setSelectedImage]     = useState(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState('')

  // Mobile view toggle: 'chat' or 'results'
  const [mobileView, setMobileView]           = useState('chat')

  const endRef      = useRef(null)
  const inputRef    = useRef(null)
  const fileInputRef = useRef(null)
  const abortRef    = useRef(null)       // AbortController for in-flight requests
  const initializedRef = useRef(false)
  const loadedConversationIdRef = useRef(null)
  const lastRestoredMessageTsRef = useRef(null)

  const defaultConversationTitle = t('chat.newConversation')
  const quickPrompts    = useMemo(() => t('chat.quick', { returnObjects: true }), [t])
  const suggestionCards = useMemo(() => t('chat.suggestions', { returnObjects: true }), [t])

  // Derived from store
  const activeConversation = getActiveConversation()
  const rawMessages        = getMessages()
  const welcomeMessage     = createWelcomeMessage(t('chat.welcome'))
  const messages           = rawMessages.length ? rawMessages : [welcomeMessage]
  const hasUserMessages    = rawMessages.some(m => m.role === 'user')
  const hasDashboardData   = flights.length > 0 || hotels.length > 0 || !!route || recommendedPlaces.length > 0

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, activeConversationId])

  // Auto-open dashboard when data arrives
  useEffect(() => {
    if (hasDashboardData) {
      setDashboardOpen(true)
      setMobileView('results')
    }
  }, [hasDashboardData, setDashboardOpen])

  // Auto-restore dashboard results when switching conversations
  useEffect(() => {
    if (!activeConversationId || loading) return

    // If active conversation changed, clear the old results first
    if (activeConversationId !== loadedConversationIdRef.current) {
      clearResults()
      setDashboardOpen(false)
      loadedConversationIdRef.current = activeConversationId
    }

    if (rawMessages.length === 0) return
    if (flights.length > 0 || hotels.length > 0 || route || recommendedPlaces.length > 0) return

    // Find the most recent bot message with a travel intent that has a destination
    const lastTravelMsg = [...rawMessages]
      .reverse()
      .find(m => m.role === 'bot' && ['trip.plan', 'flight.search', 'hotel.search'].includes(m.intent) && m.entities?.destination)

    if (lastTravelMsg) {
      // If we already handled this message, don't duplicate the request
      if (lastTravelMsg.ts === lastRestoredMessageTsRef.current) return

      lastRestoredMessageTsRef.current = lastTravelMsg.ts
      const { intent, entities } = lastTravelMsg
      const destination = entities.destination

      if (intent === 'trip.plan') {
        const origin = entities.origin || DEFAULT_ORIGIN
        const duration = entities['trip-duration'] || entities.duration || '7-days'
        const budget = entities['budget-range'] || entities.budget || 'mid-range'
        const tripType = entities['trip-type'] || entities.travel_type || 'general'
        const month = entities['travel-month'] || ''
        const placeType = entities['place-type'] || ''
        const companion = entities['companion'] || ''

        setLoadingFlights(true)
        setLoadingHotels(true)
        setLastSearch({ origin, destination, date: entities.date || '', budget, duration, tripType, month, placeType, companion })

        api.travel.completePlan({
          origin,
          destination,
          date: entities.date || undefined,
          duration,
          budget,
          tripType,
          month,
          placeType,
          companion,
        }).then(plan => {
          if (loadedConversationIdRef.current !== activeConversationId) return
          setFlights(plan.flights?.flights || [], plan.flights?.isEstimated ?? false)
          setHotels(plan.hotels?.hotels || [], plan.hotels?.isEstimated ?? false)
          setRoute(plan.route || null)
          setTripExtras(plan)
          setDashboardOpen(true)
        }).catch(() => {
          if (loadedConversationIdRef.current !== activeConversationId) return
          setLoadingFlights(false)
          setLoadingHotels(false)
        })
      } else if (intent === 'flight.search') {
        const origin = entities.origin || DEFAULT_ORIGIN
        setLoadingFlights(true)
        setLastSearch({ origin, destination, date: entities.date || '' })
        api.travel.flights({
          origin,
          destination,
          date: entities.date || undefined,
        }).then(fData => {
          if (loadedConversationIdRef.current !== activeConversationId) return
          setFlights(fData.flights || [], fData.isEstimated)
          if (fData.route) setRoute(fData.route)
          setDashboardOpen(true)
        }).catch(() => {
          if (loadedConversationIdRef.current !== activeConversationId) return
          setLoadingFlights(false)
        })
      } else if (intent === 'hotel.search') {
        setLoadingHotels(true)
        setLastSearch({ destination })
        const checkIn  = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })()
        const checkOut = (() => { const d = new Date(); d.setDate(d.getDate() + 37); return d.toISOString().slice(0, 10) })()
        api.travel.hotels({
          city: destination,
          budget: entities['budget-range'] || entities.budget || 'mid-range',
          checkIn,
          checkOut,
        }).then(hData => {
          if (loadedConversationIdRef.current !== activeConversationId) return
          setHotels(hData.hotels || [], hData.isEstimated ?? false)
          setDashboardOpen(true)
        }).catch(() => {
          if (loadedConversationIdRef.current !== activeConversationId) return
          setLoadingHotels(false)
        })
      }
    }
  }, [
    activeConversationId,
    rawMessages,
    loading,
    flights.length,
    hotels.length,
    route,
    recommendedPlaces.length,
    clearResults,
    setDashboardOpen,
    setFlights,
    setHotels,
    setRoute,
    setLoadingFlights,
    setLoadingHotels,
    setLastSearch,
    setTripExtras,
  ])

  // ── Normalizers ─────────────────────────────────────────────
  const normalizeConversation = useCallback((conv) => ({
    id: conv.id,
    title: conv.title || defaultConversationTitle,
    tripId: conv.tripId || null,
    sessionId: `conv-${conv.id}`,
    updatedAt: conv.updatedAt ? new Date(conv.updatedAt).getTime() : Date.now(),
    messages: [],
  }), [defaultConversationTitle])

  const normalizeMessage = (m) => ({
    role: m.role,
    text: m.content,
    intent: m.meta?.intent,
    confidence: m.meta?.confidence,
    entities: m.meta?.entities || null,
    model: m.meta?.model || null,
    place: m.meta?.place || null,
    suggestions: m.meta?.suggestions || null,
    imagePreview: m.meta?.imagePreview || null,
    imageName: m.meta?.imageName || null,
    ts: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
  })

  // ── Init: load conversations ─────────────────────────────────
  const loadConversationMessages = useCallback(async (conversationId) => {
    const data = await api.history.getMessages(conversationId)
    const mapped = Array.isArray(data.messages) ? data.messages.map(normalizeMessage) : []
    setConversationMessages(conversationId, mapped)
    return mapped
  }, [setConversationMessages])

  const createConversationOnServer = useCallback(async ({ title, tripId }) => {
    const data = await api.history.create({ title, tripId })
    const conv = normalizeConversation(data.conversation)
    addConversation(conv)
    return conv
  }, [normalizeConversation, addConversation])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    ;(async () => {
      try {
        const data = await api.history.list()
        const list = Array.isArray(data.conversations)
          ? data.conversations.map(normalizeConversation)
          : []
        setConversations(list)

        let target = null
        if (tripContext?.id) {
          target = list.find(c => c.tripId === tripContext.id) || null
          if (!target) {
            target = await createConversationOnServer({
              title: tripContext.title || `${tripContext.destination || 'Trip'} Planning`,
              tripId: tripContext.id,
            })
          }
        } else if (list.length > 0) {
          target = list[0]
        } else {
          target = await createConversationOnServer({ title: defaultConversationTitle, tripId: null })
        }

        if (!target) return
        setActiveConversationId(target.id)
        const existingMsgs = await loadConversationMessages(target.id)

        // Auto-send trip starter if navigated from TripsPage
        if (tripContext?.id && existingMsgs.filter(m => m.role === 'user').length === 0) {
          const dateText = tripContext.endDate
            ? `${tripContext.startDate || ''} ${t('chat.to')} ${tripContext.endDate}`
            : tripContext.startDate || ''
          const starter = t('chat.tripStarter', {
            destination: tripContext.destination || '',
            dates: dateText,
            budget: tripContext.budget || 'mid-range',
          })
          setTimeout(() => send(starter, target.id), 50)
        }
      } catch (e) {
        console.error('[ChatPage init]', e)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Conversation actions ─────────────────────────────────────
  const handleSelectConversation = useCallback((conv) => {
    setActiveConversationId(conv.id)
    if (!conv.messages || conv.messages.length === 0) {
      loadConversationMessages(conv.id).catch(() => {})
    }
    setSidebarOpen(false)
  }, [setActiveConversationId, loadConversationMessages, setSidebarOpen])

  const handleNewConversation = useCallback(() => {
    createConversationOnServer({ title: defaultConversationTitle, tripId: null })
      .then(conv => {
        setActiveConversationId(conv.id)
        setInput('')
        setSelectedImage(null)
        setSelectedImagePreview('')
        clearResults()
        setDashboardOpen(false)
        setMobileView('chat')
        setTimeout(() => inputRef.current?.focus(), 0)
      })
      .catch(() => {})
    setSidebarOpen(false)
  }, [createConversationOnServer, defaultConversationTitle, setActiveConversationId, clearResults, setDashboardOpen, setSidebarOpen])

  // ── Send message ─────────────────────────────────────────────
  const send = useCallback(async (action, forcedConvId = null) => {
    const conv = forcedConvId
      ? useChatStore.getState().conversations.find(c => c.id === forcedConvId)
      : getActiveConversation()
    if (!conv) return
    const isAction = action && typeof action === 'object'
    const actionText = isAction ? (action.prompt || action.label || '') : action
    const msg = (actionText || input).trim()
    if (!msg || loading) return

    const targetConvId = conv.id
    const sessionId    = conv.sessionId || `conv-${conv.id}`

    if (!forcedConvId) setInput('')

    if (isAction && action.resetContext) {
      clearResults()
      setDashboardOpen(false)
      setMobileView('chat')
    }

    // Optimistic user message
    appendMessage(targetConvId, { role: 'user', text: msg, ts: Date.now() })

    // Update title if still default
    if (isDefaultTitle(conv.title, defaultConversationTitle)) {
      updateConversationTitle(targetConvId, msg.slice(0, 38))
    }

    setLoading(true)

    // Abort previous in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const data = await api.chat.send(
        {
          message: msg,
          sessionId,
          conversationId: targetConvId,
          tripId: conv.tripId || null,
          intentHint: isAction ? action.intentHint : undefined,
          resetContext: isAction ? action.resetContext === true : false,
        },
        controller.signal
      )

      // Bot text reply (no inline cards — results go to dashboard)
      const botTs = Date.now()
      appendMessage(targetConvId, {
        role: 'bot',
        text: data.reply,
        intent: data.intent,
        confidence: data.confidence,
        entities: data.entities || null,
        model: data.model || null,
        ts: botTs,
      })
      lastRestoredMessageTsRef.current = botTs

      // Only patch title if conversation title is still default
      const currentTitle = useChatStore.getState().conversations.find(c => c.id === targetConvId)?.title
      if (isDefaultTitle(currentTitle, defaultConversationTitle)) {
        api.history.update(targetConvId, { title: msg.slice(0, 38) }).catch(() => {})
      }

      const entities = data.entities || {}

      // Full trip intent → fetch every planning category in one request.
      if (data.intent === 'trip.plan' && entities.destination && !data.awaiting) {
        const origin = entities.origin || DEFAULT_ORIGIN
        const duration = entities['trip-duration'] || entities.duration || '7-days'
        const budget = entities['budget-range'] || entities.budget || 'mid-range'
        const tripType = entities['trip-type'] || entities.travel_type || 'general'
        const month = entities['travel-month'] || ''
        const placeType = entities['place-type'] || ''
        const companion = entities['companion'] || ''
        setLoadingFlights(true)
        setLoadingHotels(true)
        setLastSearch({ origin, destination: entities.destination, date: entities.date || '', budget, duration, tripType, month, placeType, companion })

        api.travel.completePlan({
          origin,
          destination: entities.destination,
          date: entities.date || undefined,
          duration,
          budget,
          tripType,
          month,
          placeType,
          companion,
        }).then(plan => {
          setFlights(plan.flights?.flights || [], plan.flights?.isEstimated ?? false)
          setHotels(plan.hotels?.hotels || [], plan.hotels?.isEstimated ?? false)
          setRoute(plan.route || null)
          setTripExtras(plan)
          setDashboardOpen(true)
        }).catch(() => {
          setLoadingFlights(false)
          setLoadingHotels(false)
          addToast('Could not build the complete trip plan. Please try again.', 'error')
        })
      }

      // Flight intent → fetch flights → populate dashboard
      if (data.intent === 'flight.search' && entities.destination && !data.awaiting) {
        const origin = entities.origin || DEFAULT_ORIGIN
        setLoadingFlights(true)
        setLastSearch({ origin, destination: entities.destination, date: entities.date || '' })
        api.travel.flights({
          origin,
          destination: entities.destination,
          date:        entities.date || undefined,
        }).then(fData => {
          setFlights(fData.flights || [], fData.isEstimated)
          if (fData.route) setRoute(fData.route)
        }).catch(() => {
          setLoadingFlights(false)
          addToast('Could not fetch flights. Try the Explore page.', 'error')
        })
      }

      // Hotel intent → fetch hotels → populate dashboard
      if (data.intent === 'hotel.search' && entities.destination && !data.awaiting) {
        setLoadingHotels(true)
        setLastSearch({ ...(useTripStore.getState().lastSearch || {}), destination: entities.destination })
        const checkIn  = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })()
        const checkOut = (() => { const d = new Date(); d.setDate(d.getDate() + 37); return d.toISOString().slice(0, 10) })()
        api.travel.hotels({
          city:   entities.destination,
          budget: entities['budget-range'] || entities.budget || 'mid-range',
          checkIn,
          checkOut,
        }).then(hData => {
          setHotels(hData.hotels || [], hData.isEstimated ?? false)
        }).catch(() => {
          setLoadingHotels(false)
          addToast('Could not fetch hotels. Try the Explore page.', 'error')
        })
      }

    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return
      appendMessage(targetConvId, { role: 'bot', text: t('chat.errorGeneric'), ts: Date.now() })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [
    input, loading, getActiveConversation, defaultConversationTitle,
    appendMessage, updateConversationTitle, setLoading,
    setFlights, setHotels, setRoute, setLoadingFlights, setLoadingHotels,
    setLastSearch, setTripExtras, setDashboardOpen, clearResults, addToast, t,
  ])

  // ── Image handling ───────────────────────────────────────────
  const handleImagePick = (file) => {
    if (!file) return
    const valid = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!valid) { addToast(t('chat.imageInvalidType'), 'error'); return }
    if (file.size > 5 * 1024 * 1024) { addToast(t('chat.imageTooLarge'), 'error'); return }
    const reader = new FileReader()
    reader.onload = () => { setSelectedImage(file); setSelectedImagePreview(String(reader.result || '')) }
    reader.readAsDataURL(file)
  }

  const clearSelectedImage = () => {
    setSelectedImage(null)
    setSelectedImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const recognizePlaceFromImage = async () => {
    if (!activeConversation || !selectedImage || loading) return
    const targetConvId = activeConversation.id
    const sessionId    = activeConversation.sessionId || `conv-${activeConversation.id}`
    const userText     = input.trim() || t('chat.imageIdentifyPrompt')
    const form = new FormData()
    form.append('image', selectedImage)
    form.append('sessionId', sessionId)
    form.append('message', userText)

    setInput('')
    appendMessage(targetConvId, {
      role: 'user', text: userText,
      imagePreview: selectedImagePreview, imageName: selectedImage.name, ts: Date.now(),
    })
    setLoading(true)

    try {
      const data = await api.chat.recognizePlace(form)
      await api.history.addMessage(targetConvId, {
        role: 'user', content: userText,
        meta: { imagePreview: selectedImagePreview, imageName: selectedImage.name },
      })
      await api.history.addMessage(targetConvId, {
        role: 'bot', content: data.reply,
        meta: { intent: 'place.recognition', place: data.place, suggestions: data.suggestions },
      })
      appendMessage(targetConvId, {
        role: 'bot', text: data.reply,
        intent: 'place.recognition',
        place: data.place, suggestions: data.suggestions, ts: Date.now(),
      })
      clearSelectedImage()
    } catch (e) {
      const msg = e?.response?.data?.message || t('chat.imageErrorFallback')
      appendMessage(targetConvId, { role: 'bot', text: msg, ts: Date.now() })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  // ── Dashboard close ──────────────────────────────────────────
  const handleRenameConversation = useCallback(async (conversationId, newTitle) => {
    try {
      await api.history.update(conversationId, { title: newTitle })
      updateConversationTitle(conversationId, newTitle)
    } catch (e) {
      addToast('Could not rename conversation.', 'error')
    }
  }, [updateConversationTitle, addToast])

  const handleDeleteConversation = useCallback(async (conversationId) => {
    try {
      let nextActiveId = null
      if (activeConversationId === conversationId) {
        const remaining = conversations.filter(c => c.id !== conversationId)
        if (remaining.length > 0) {
          nextActiveId = remaining[0].id
        }
      }

      await api.history.delete(conversationId)
      removeConversation(conversationId)

      if (activeConversationId === conversationId) {
        clearResults()
        setDashboardOpen(false)
        setMobileView('chat')
        
        if (nextActiveId) {
          setActiveConversationId(nextActiveId)
          const nextConv = conversations.find(c => c.id === nextActiveId)
          if (nextConv && (!nextConv.messages || nextConv.messages.length === 0)) {
            loadConversationMessages(nextActiveId).catch(() => {})
          }
        } else {
          handleNewConversation()
        }
      }
    } catch (e) {
      console.error('[Delete Conversation Error]', e)
      const errorMsg = e.response?.data?.error || e.message || 'Unknown error'
      addToast(`Could not delete conversation: ${errorMsg}`, 'error')
    }
  }, [activeConversationId, conversations, removeConversation, setActiveConversationId, loadConversationMessages, handleNewConversation, clearResults, setDashboardOpen, addToast])

  // ── Close Dashboard helper ───────────────────────────────────
  const handleCloseDashboard = () => {
    setDashboardOpen(false)
    clearResults()
    setMobileView('chat')
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">

        {/* 1. Conversation sidebar */}
        <ChatSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={handleSelectConversation}
          onCreate={handleNewConversation}
          onRename={handleRenameConversation}
          onDelete={handleDeleteConversation}
        />

        {/* 2. Chat area — hidden on mobile when viewing results */}
        <div
          className={`flex-1 flex flex-col min-w-0 overflow-hidden
            ${mobileView === 'results' ? 'hidden md:flex' : 'flex'}`}
        >
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {/* Hamburger (sidebar toggle) */}
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Toggle conversations"
              >
                ☰
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm text-sm">
                ✈️
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">{t('chat.assistantTitle')}</div>
                <div className="text-xs text-blue-600">
                  {tripContext?.title
                    ? t('chat.planningFor', { title: tripContext.title })
                    : t('chat.aiTripPlanning')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Travel mode selector — hidden on very small screens */}
              <div className="hidden md:block">
                <TravelModeSelector compact />
              </div>
              {hasDashboardData && (
                <button
                  onClick={() => { setDashboardOpen(o => !o); setMobileView('results') }}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-xl font-medium shadow-sm"
                >
                  📊 {t('chat.resultsToggle')}
                </button>
              )}
              <button
                onClick={() => navigate('/explore')}
                className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-50 font-medium transition-colors shadow-sm hidden sm:block"
              >
                {t('chat.exploreCta')}
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto px-4 py-5 relative"
            style={{ backgroundImage: "url('/travel_2.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px]" />
            <div className="relative z-10">
              {!hasUserMessages ? (
                <SuggestionGrid suggestions={Array.isArray(suggestionCards) ? suggestionCards : []} onSelect={send} disabled={loading} />
              ) : (
                <>
                  {messages.map((m, i) => (
                    <MessageBubble key={i} msg={m} locale={i18n.language} />
                  ))}
                  {loading && <TypingBubble />}
                  <div ref={endRef} />
                </>
              )}
            </div>
          </div>

          {/* Input area */}
          <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-200 flex-shrink-0">
            {/* Image preview */}
            {selectedImagePreview && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-blue-200 bg-white/90 px-2.5 py-2">
                <img src={selectedImagePreview} alt="Selected" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-700 truncate">{selectedImage?.name}</div>
                  <div className="text-[11px] text-slate-500">{t('chat.readyRecognition')}</div>
                </div>
                <button onClick={clearSelectedImage} className="text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                  {t('chat.remove')}
                </button>
              </div>
            )}

            {/* Quick prompts */}
            <QuickPrompts
              prompts={Array.isArray(quickPrompts) ? quickPrompts : []}
              onSelect={send}
              disabled={loading}
            />

            {/* Input bar */}
            <div className="flex gap-2 mt-1 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="hidden"
                onChange={(e) => handleImagePick(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-3 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                title={t('chat.uploadImageTitle')}
              >
                📷
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                placeholder={t('chat.inputPlaceholder')}
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent disabled:opacity-60"
              />
              {selectedImage ? (
                <button onClick={recognizePlaceFromImage} disabled={loading} className="btn-blue px-4 disabled:opacity-40 text-sm">
                  {t('chat.analyze')}
                </button>
              ) : (
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="btn-blue px-4 disabled:opacity-40 text-sm"
                >
                  ➤
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Results Dashboard — desktop side panel */}
        {dashboardOpen && (
          <div className={`
            h-full md:flex flex-col overflow-hidden
            ${mobileView === 'results' ? 'flex' : 'hidden md:flex'}
            w-full md:w-[420px] md:flex-shrink-0
          `}>
            <ResultsDashboard onClose={handleCloseDashboard} />
          </div>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      {hasDashboardData && (
        <div className="mobile-bottom-bar md:hidden">
          <button
            onClick={() => setMobileView('chat')}
            className={`mobile-bottom-btn ${mobileView === 'chat' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
          >
            <span className="text-lg">💬</span>
            <span>Chat</span>
          </button>
          <button
            onClick={() => { setMobileView('results'); setDashboardOpen(true) }}
            className={`mobile-bottom-btn ${mobileView === 'results' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
          >
            <span className="text-lg">📊</span>
            <span>Results</span>
          </button>
        </div>
      )}
    </div>
  )
}
