/**
 * Stars — reusable star rating display
 * Replaces the duplicated Stars functions in ChatPage and ExplorePage.
 */

export default function Stars({ count = 0, size = 'sm' }) {
  const n = Math.min(Math.max(Math.round(count), 0), 5)
  const cls = size === 'md' ? 'text-sm' : 'text-xs'
  return (
    <span className={`text-yellow-400 ${cls}`} aria-label={`${n} out of 5 stars`}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}
