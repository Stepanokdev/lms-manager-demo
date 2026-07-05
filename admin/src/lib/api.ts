import type {
  User,
  LMS,
  Report,
  ReportStats,
  Overview,
  PublicConfig,
  LMSStatus,
  Visibility,
  ReportStatus,
  ReportCategory,
  Severity,
  NotifyOwnerResult,
  AffectedLMS,
  ModerationEvent,
} from './types'

const TOKEN_KEY = 'lms-admin-token'
// The wizard app (same origin) reads the token under 'token'; keep them in sync
// so owners can jump straight into the wizard from here.
const WIZARD_TOKEN_KEY = 'token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(WIZARD_TOKEN_KEY)
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(WIZARD_TOKEN_KEY, token)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(WIZARD_TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, { ...opts, headers })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || `Request failed (${res.status})`
    throw new ApiError(typeof detail === 'string' ? detail : 'Request failed', res.status)
  }
  return data as T
}

export interface LMSQuery {
  q?: string
  status_filter?: LMSStatus
  reviewed?: boolean
  visibility?: Visibility
  featured?: boolean
  review_requested?: boolean
  limit?: number
  offset?: number
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  me: () => request<User>('/auth/me'),

  // Overview
  overview: () => request<Overview>('/admin/overview'),

  // LMS
  myLMS: () => request<LMS[]>('/my/lms'),
  listLMS: (query: LMSQuery = {}) =>
    request<LMS[]>(`/admin/lms${qs(query as Record<string, unknown>)}`),
  getLMS: (id: number) => request<LMS>(`/lms/${id}`),
  updateLMS: (id: number, patch: Partial<LMS>) =>
    request<LMS>(`/admin/lms/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  reviewLMS: (id: number, reviewed: boolean) =>
    request<LMS>(`/admin/lms/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_reviewed: reviewed }),
    }),
  recheckLMS: (id: number) => request<LMS>(`/admin/lms/${id}/recheck`, { method: 'POST' }),
  blockLMS: (id: number) => request<LMS>(`/admin/lms/${id}/block`, { method: 'POST' }),
  unblockLMS: (id: number) => request<LMS>(`/admin/lms/${id}/unblock`, { method: 'POST' }),
  notifyOwner: (id: number) =>
    request<NotifyOwnerResult>(`/admin/lms/${id}/notify-owner`, { method: 'POST' }),

  // Reports
  listReports: (
    opts: {
      status?: ReportStatus
      category?: ReportCategory
      severity?: Severity
      platform?: string
      lms_id?: number
      limit?: number
    } = {},
  ) => request<Report[]>(`/admin/reports${qs({ limit: 100, ...opts } as Record<string, unknown>)}`),
  reportsByLMS: () => request<AffectedLMS[]>('/admin/reports/by-lms'),
  lmsEvents: (id: number) => request<ModerationEvent[]>(`/admin/lms/${id}/events`),
  requestReview: (id: number) => request<LMS>(`/my/lms/${id}/request-review`, { method: 'POST' }),
  reportStats: () => request<ReportStats>('/admin/reports/stats'),
  updateReport: (id: number, patch: { status?: ReportStatus; resolution_note?: string }) =>
    request<Report>(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  // Admins / users
  listUsers: () => request<User[]>('/admin/users'),
  createAdmin: (name: string, email: string, password: string) =>
    request<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  setRole: (id: number, role: 'admin' | 'user') =>
    request<User>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // Public config
  config: () => request<PublicConfig>('/api/v1/config'),
}
