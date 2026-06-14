import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

  // Custom components to style Markdown elements — ChatGPT-style clean, readable text
  const markdownComponents = {
    h1: ({ children }) => <h1 className="text-lg font-bold mt-5 mb-3 first:mt-0 text-slate-900 border-b border-slate-100 pb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mt-4 mb-2 first:mt-0 text-slate-800">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1.5 first:mt-0 text-slate-800">{children}</h3>,
    p: ({ children }) => <p className="mb-2.5 last:mb-0 text-sm leading-6 text-slate-700">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-700">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-700">{children}</ol>,
    li: ({ children }) => <li className="text-sm leading-6">{children}</li>,
    table: ({ children }) => (
      <div className="overflow-x-auto my-3 border border-slate-200 rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
    tbody: ({ children }) => <tbody className="bg-white divide-y divide-slate-100">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-slate-50/50 transition-colors">{children}</tr>,
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 border-r border-slate-200 last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-sm text-slate-700 border-r border-slate-100 last:border-r-0">
        {children}
      </td>
    ),
    strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
    em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
    hr: () => <hr className="my-3 border-slate-200" />,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-300 pl-4 my-3 text-slate-600 italic text-sm">{children}</blockquote>
    ),
    code: ({ children }) => <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
  }

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
      <div className={isUser ? 'max-w-xs' : 'max-w-2xl w-full'}>
        <div className={isUser ? 'bubble-user' : 'bubble-bot'}>
          {isUser ? (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.text}</pre>
          ) : (
            <div className="font-sans">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {msg.text}
              </ReactMarkdown>
            </div>
          )}

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
