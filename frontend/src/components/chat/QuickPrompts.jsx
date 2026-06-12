/**
 * QuickPrompts — horizontally scrollable quick-action chips.
 */

export default function QuickPrompts({ prompts = [], onSelect, disabled = false }) {
  if (!prompts.length) return null

  return (
    <div className="flex gap-2 overflow-x-auto py-2" style={{ scrollbarWidth: 'none' }}>
      {prompts.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="whitespace-nowrap text-xs bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full flex-shrink-0 disabled:opacity-40 transition-colors"
        >
          {typeof q === 'string' ? q : q.label}
        </button>
      ))}
    </div>
  )
}
