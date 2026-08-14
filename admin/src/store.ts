import { create } from 'zustand'
import { api, setToken, clearToken, getToken } from './lib/api'
import type { Organization, User, ReportStats } from './lib/types'

export type View =
  // Platform operator
  | 'overview'
  | 'lms'
  | 'reports'
  | 'admins'
  | 'orgs'
  // Provider workspace (portal mode)
  | 'platforms'
  | 'appconfig'
  | 'organization'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error' | 'alert'
  title: string
  detail?: string
}

interface State {
  authState: 'loading' | 'authed' | 'anon'
  user: User | null
  /** Portal mode: the signed-in provider's own organization. Loaded once and
   *  shared, so the shell brand and all three provider views agree. */
  org: Organization | null
  view: View
  stats: ReportStats | null
  toasts: Toast[]

  loadOrg: () => Promise<void>
  setOrg: (org: Organization) => void

  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (
    name: string,
    email: string,
    password: string,
    organization?: { name: string; slug?: string },
  ) => Promise<void>
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
  org: null,
  view: 'overview',
  stats: null,
  toasts: [],

  loadOrg: async () => {
    try {
      set({ org: await api.myOrg() })
    } catch {
      // Not a provider account, or the deployment is not a portal — either way
      // there is no organization to show and the workspace never renders.
      set({ org: null })
    }
  },

  setOrg: (org) => set({ org }),

  bootstrap: async () => {
    if (!getToken()) {
      set({ authState: 'anon' })
      return
    }
    try {
      const user = await api.me()
      // A provider has no Overview tab, so landing there after a refresh would
      // render an empty shell with no nav item selected.
      set({ user, authState: 'authed', view: user.role === 'admin' ? 'overview' : 'platforms' })
      if (user.role === 'admin') get().refreshStats()
      if (user.organization_id !== null) get().loadOrg()
    } catch {
      clearToken()
      set({ authState: 'anon', user: null })
    }
  },

  login: async (email, password) => {
    const { access_token } = await api.login(email, password)
    setToken(access_token)
    const user = await api.me()
    set({ user, authState: 'authed', view: user.role === 'admin' ? 'overview' : 'platforms' })
    if (user.role === 'admin') get().refreshStats()
    if (user.organization_id !== null) await get().loadOrg()
  },

  register: async (name, email, password, organization) => {
    const { access_token } = await api.register(name, email, password, organization)
    setToken(access_token)
    const user = await api.me()
    set({ user, authState: 'authed', view: user.role === 'admin' ? 'overview' : 'platforms' })
    // Only admins may read complaint stats; a provider or owner signing up would
    // take a silent 403 here.
    if (user.role === 'admin') get().refreshStats()
    if (user.organization_id !== null) await get().loadOrg()
  },

  logout: () => {
    clearToken()
    set({ authState: 'anon', user: null, org: null, stats: null, toasts: [] })
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
