/**
 * ToastContainer — renders toast notifications from useUIStore.
 * Mount once inside Layout.jsx.
 */

import { useUIStore } from '../../store/useUIStore'

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
}

const COLORS = {
  success: 'bg-green-600',
  error:   'bg-red-600',
  info:    'bg-blue-600',
}

function Toast({ toast }) {
  const removeToast = useUIStore((s) => s.removeToast)
  const icon  = ICONS[toast.type]  || ICONS.info
  const color = COLORS[toast.type] || COLORS.info

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-[240px] max-w-sm animate-fade-in">
      <span className={`w-6 h-6 rounded-full ${color} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
        {icon}
      </span>
      <span className="text-sm text-gray-800 flex-1">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-gray-400 hover:text-gray-600 text-xs ml-1"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} />
        </div>
      ))}
    </div>
  )
}
