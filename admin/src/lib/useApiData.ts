import { useCallback, useEffect, useState } from 'react'
import { ApiError } from './api'

interface Result<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  setData: (updater: (prev: T | null) => T | null) => void
}

/** Fetch-on-mount helper with loading/error/reload. `deps` re-runs the fetch. */
export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): Result<T> {
  const [data, setDataState] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    run()
      .then((res) => {
        if (alive) setData(() => res)
      })
      .catch((e) => {
        if (alive) setError(e instanceof ApiError ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const setData = useCallback((updater: (prev: T | null) => T | null) => setDataState(updater), [])

  return { data, loading, error, reload, setData }
}
