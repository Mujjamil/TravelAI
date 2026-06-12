/**
 * ConfirmDialog — modal confirmation dialog driven by useUIStore.
 * Mount once inside Layout.jsx.
 * Usage: useUIStore.getState().showConfirm({ message: '...', onConfirm: () => {...} })
 */

import { useUIStore } from '../../store/useUIStore'

export default function ConfirmDialog() {
  const confirm     = useUIStore((s) => s.confirm)
  const closeConfirm = useUIStore((s) => s.closeConfirm)

  if (!confirm) return null

  const handleConfirm = () => {
    confirm.onConfirm?.()
    closeConfirm()
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeConfirm}
      />
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full">
        <div className="text-2xl mb-3 text-center">⚠️</div>
        <p className="text-gray-800 text-sm text-center mb-6 leading-relaxed">
          {confirm.message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={closeConfirm}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
