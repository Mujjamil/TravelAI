/**
 * TripCard — displays a single trip in the TripsPage list.
 * Delete uses ConfirmDialog (via useUIStore) instead of window.confirm().
 */

import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../store/useUIStore'

const STATUS_COLORS = {
  planning:  'bg-yellow-100 text-yellow-700',
  booked:    'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}

export default function TripCard({
  trip,
  isSelected,
  onSelect,
  onChat,
  onDetails,
  onDuplicate,
  onShare,
  onExport,
  onDelete,
}) {
  const { t } = useTranslation()
  const showConfirm = useUIStore((s) => s.showConfirm)

  const handleDelete = () => {
    showConfirm({
      message: t('trips.confirmDelete'),
      onConfirm: () => onDelete(trip.id),
    })
  }

  const statusClass = STATUS_COLORS[trip.status] || STATUS_COLORS.planning

  return (
    <div
      onClick={() => onSelect(trip.id)}
      className={`bg-white border-2 rounded-2xl p-4 cursor-pointer transition-all ${
        isSelected ? 'border-blue-400 shadow-md' : 'border-gray-100 hover:border-blue-200 hover:shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-2">
          <div className="font-semibold text-gray-900 truncate">{trip.title}</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            📍 {trip.destination || t('trips.noDestination')}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${statusClass}`}>
          {trip.status || 'planning'}
        </span>
      </div>

      {/* Dates & budget */}
      <div className="text-xs text-gray-400 mb-3">
        {trip.startDate && trip.endDate
          ? `📅 ${trip.startDate} → ${trip.endDate}`
          : trip.startDate
          ? `📅 From ${trip.startDate}`
          : null}
        {trip.budget && <span className="ml-2">💰 {trip.budget}</span>}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
        <ActionBtn onClick={() => onChat(trip)} emoji="💬" label={t('trips.open')} />
        <ActionBtn onClick={() => onDetails(trip.id)} emoji="📋" label={t('trips.details')} />
        <ActionBtn onClick={() => onDuplicate(trip.id)} emoji="📑" label={t('trips.duplicate')} />
        <ActionBtn onClick={() => onShare(trip.id)} emoji="🔗" label={t('trips.share')} />
        <ActionBtn onClick={() => onExport(trip.id)} emoji="📅" label={t('trips.exportCalendar')} />
        <ActionBtn
          onClick={handleDelete}
          emoji="🗑"
          label={t('trips.delete')}
          danger
        />
      </div>
    </div>
  )
}

function ActionBtn({ onClick, emoji, label, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-medium flex items-center gap-1 ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  )
}
