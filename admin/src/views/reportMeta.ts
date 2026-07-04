import type { ReportCategory, ReportStatus } from '@/lib/types'

export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  login: 'Sign-in / OAuth',
  content: 'Course content',
  branding: 'Branding',
  unreachable: 'Server down',
  inappropriate: 'Inappropriate',
  other: 'Other',
}

export const STATUS_LABEL: Record<ReportStatus, string> = {
  new: 'New',
  investigating: 'Investigating',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
}

export const STATUS_TONE: Record<ReportStatus, 'cyan' | 'amber' | 'emerald' | 'slate'> = {
  new: 'cyan',
  investigating: 'amber',
  resolved: 'emerald',
  dismissed: 'slate',
}

export const PLATFORM_LABEL: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
}
