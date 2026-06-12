/**
 * SuggestionGrid — empty-state card grid shown before first message.
 * Each card sends its prompt when clicked.
 */

import { useTranslation } from 'react-i18next'

export default function SuggestionGrid({ suggestions = [], onSelect, disabled = false }) {
  const { t } = useTranslation()

  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-3xl mb-6">
        ✈️
      </div>
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
        {t('chat.emptyTitle')}
      </h2>
      <p className="text-gray-500 text-center max-w-xl mb-8 text-base leading-relaxed">
        {t('chat.emptySubtitle')}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl">
        {suggestions.map((item) => (
          <button
            key={item.label}
            onClick={() => onSelect(item)}
            disabled={disabled}
            className="bg-white border border-slate-200 rounded-xl py-3 px-4 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm hover:shadow text-left disabled:opacity-50"
          >
            <div className="text-xl mb-1">{item.icon}</div>
            <div className="font-medium text-sm text-gray-800">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
