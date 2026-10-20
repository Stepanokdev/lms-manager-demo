import { useEffect, useState } from 'react'

const FALLBACK = 'Open X Project'

/** The deployment's name from /api/v1/config, so each registry's wizard carries its own. */
export function useProviderName(): string {
  const [name, setName] = useState(FALLBACK)
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((config) => {
        const value = typeof config?.provider_name === 'string' ? config.provider_name.trim() : ''
        if (!cancelled && value) {
          setName(value)
          document.title = `${value} — Register your LMS`
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return name
}
