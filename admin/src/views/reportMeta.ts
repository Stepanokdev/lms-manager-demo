import type { ReportCategory, ReportStatus } from '@/lib/types'

// Trust & safety reasons an LMS gets flagged in the catalog.
export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  inappropriate: 'Inappropriate content',
  scam: 'Scam or fraud',
  impersonation: 'Impersonation',
  spam: 'Spam / fake platform',
  broken: "Doesn't work",
  other: 'Other',
}

export const STATUS_LABEL: Record<ReportStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  blocked: 'LMS blocked',
  dismissed: 'Dismissed',
}

export const STATUS_TONE: Record<ReportStatus, 'cyan' | 'amber' | 'rose' | 'slate'> = {
  new: 'cyan',
  reviewing: 'amber',
  blocked: 'rose',
  dismissed: 'slate',
}

export const PLATFORM_LABEL: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
}
