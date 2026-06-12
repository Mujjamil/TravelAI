import { useState, useEffect } from 'react'

/**
 * Debounces a value — useful for search inputs that trigger API calls.
 * @param {*} value  — the value to debounce
 * @param {number} delay — debounce delay in ms (default 400)
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}
