/**
 * useUIStore — Zustand store for UI state
 * Sidebar, dashboard panel, toast notifications, confirm dialogs.
 */

import { create } from 'zustand'

let toastId = 0

export const useUIStore = create((set, get) => ({
  // ── Panel visibility ─────────────────────────────────────
  sidebarOpen:   true,
  dashboardOpen: false,

  // ── Toast notifications ──────────────────────────────────
  // [{ id, message, type: 'success'|'error'|'info', duration }]
  toasts: [],

  // ── Confirm dialog ───────────────────────────────────────
  // { message, onConfirm } or null
  confirm: null,

  // ── Actions ──────────────────────────────────────────────

  setSidebarOpen:   (v) => set({ sidebarOpen: v }),
  setDashboardOpen: (v) => set({ dashboardOpen: v }),

  toggleSidebar:   () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleDashboard: () => set((s) => ({ dashboardOpen: !s.dashboardOpen })),

  addToast: (message, type = 'info', duration = 3500) => {
    const id = ++toastId
    set((s) => ({
      toasts: [...s.toasts, { id, message, type, duration }],
    }))
    setTimeout(() => get().removeToast(id), duration)
    return id
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  showConfirm: ({ message, onConfirm }) =>
    set({ confirm: { message, onConfirm } }),

  closeConfirm: () => set({ confirm: null }),
}))
