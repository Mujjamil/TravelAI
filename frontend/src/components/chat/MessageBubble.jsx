import { useTranslation } from 'react-i18next'

function PlaceRecognitionCard({ place, suggestions }) {
  if (!place) return null
  const location = [place.city, place.country].filter(Boolean).join(', ')
  return (
    <div className="mt-2 rounded-xl border border-blue-100 bg-white/95 p-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">
        Place Recognition
      </div>
      <div className="text-sm font-semibold text-slate-800">{place.name || 'Unknown place'}</div>
      {location && <div className="text-xs text-slate-500 mt-0.5">📍 {location}</div>}
      {place.landmark_type && (
        <div className="text-xs text-slate-500 mt-0.5">Type: {place.landmark_type}</div>
      )}
      {Array.isArray(suggestions) && suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.slice(0, 3).map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MessageBubble({ msg, locale }) {
  const { i18n } = useTranslation()
  const lang = locale || i18n.language
  const isUser = msg.role === 'user'

  return (
    <div className={`flex items-end gap-2 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          isUser ? 'bg-gray-300 text-gray-700' : 'bg-blue-600 text-white'
        }`}
      >
        {isUser ? '👤' : 'AI'}
      </div>

      {/* Bubble */}
      <div className={isUser ? 'max-w-xs' : 'max-w-sm w-full'}>
        <div className={isUser ? 'bubble-user' : 'bubble-bot'}>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.text}</pre>

          {/* Uploaded image preview */}
          {msg.imagePreview && (
            <img
              src={msg.imagePreview}
              alt={msg.imageName || 'uploaded'}
              className="mt-2 max-h-40 w-full object-cover rounded-lg border border-white/40"
            />
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-1.5 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
            {new Date(msg.ts).toLocaleTimeString(lang || undefined, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Place recognition card (inline — it's descriptive, not a results panel) */}
        {!isUser && msg.place && (
          <PlaceRecognitionCard place={msg.place} suggestions={msg.suggestions} />
        )}
      </div>
    </div>
  )
}
