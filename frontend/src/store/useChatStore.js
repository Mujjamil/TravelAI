/**
 * useChatStore — Zustand store for conversations and messages
 */

import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  loading: false,

  // ── Computed helpers (call as functions) ─────────────────

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get()
    return conversations.find(c => c.id === activeConversationId) || conversations[0] || null
  },

  getMessages: () => {
    const conv = get().getActiveConversation()
    return conv?.messages || []
  },

  // ── Actions ──────────────────────────────────────────────

  setConversations: (conversations) => set({ conversations }),

  setActiveConversationId: (id) => set({ activeConversationId: id }),

  setLoading: (loading) => set({ loading }),

  addConversation: (conv) =>
    set((state) => ({ conversations: [conv, ...state.conversations] })),

  appendMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...(c.messages || []), message], updatedAt: Date.now() }
          : c
      ),
    })),

  updateConversationTitle: (conversationId, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, title } : c
      ),
    })),

  setConversationMessages: (conversationId, messages) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, messages } : c
      ),
    })),

  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      activeConversationId:
        state.activeConversationId === conversationId
          ? state.conversations.find(c => c.id !== conversationId)?.id || null
          : state.activeConversationId,
    })),
}))
