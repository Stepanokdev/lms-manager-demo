import { create } from 'zustand'
import { api, setToken, clearToken, getToken } from './lib/api'
import type { User, ReportStats } from './lib/types'

export type View = 'overview' | 'lms' | 'reports' | 'admins'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error' | 'alert'
  title: string
  detail?: string
}

interface State {
  authState: 'loading' | 'authed' | 'anon'
  user: User | null
  view: View
  stats: ReportStats | null
  toasts: Toast[]

  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  setView: (view: View) => void
  refreshStats: () => Promise<void>
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

let toastSeq = 1

export const useStore = create<State>((set, get) => ({
  authState: 'loading',
  user: null,
  view: 'overview',
  stats: null,
  toasts: [],

  bootstrap: async () => {
    if (!getToken()) {
      set({ authState: 'anon' })
      return
    }
    try {
      const user = await api.me()
      set({ user, authState: 'authed' })
      if (user.role === 'admin') get().refreshStats()
    } catch {
      clearToken()
      set({ authState: 'anon', user: null })
    }
  },

  login: async (email, password) => {
    const { access_token } = await api.login(email, password)
    setToken(access_token)
    const user = await api.me()
    set({ user, authState: 'authed', view: 'overview' })
    if (user.role === 'admin') get().refreshStats()
  },

  register: async (name, email, password) => {
    const { access_token } = await api.register(name, email, password)
    setToken(access_token)
    const user = await api.me()
    set({ user, authState: 'authed', view: 'overview' })
    get().refreshStats()
  },

  logout: () => {
    clearToken()
    set({ authState: 'anon', user: null, stats: null, toasts: [] })
  },

  setView: (view) => set({ view }),

  refreshStats: async () => {
    try {
      const next = await api.reportStats()
      const prev = get().stats
      // Surface an alert when the count of open complaints grows.
      if (prev) {
        const prevOpen = prev.new + prev.reviewing
        const nextOpen = next.new + next.reviewing
        if (nextOpen > prevOpen) {
          const delta = nextOpen - prevOpen
          get().pushToast({
            kind: 'alert',
            title: `${delta} new complaint${delta > 1 ? 's' : ''} received`,
            detail:
              next.high_open > prev.high_open
                ? 'Includes a high-severity report — open the inbox.'
                : 'Open the inbox to triage.',
          })
        }
      }
      set({ stats: next })
    } catch {
      /* transient poll failure — keep last known stats */
    }
  },

  pushToast: (t) => {
    const id = toastSeq++
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    const ttl = t.kind === 'alert' ? 9000 : 5000
    setTimeout(() => get().dismissToast(id), ttl)
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
