export type Role = 'admin' | 'user'
export type LMSStatus = 'pending' | 'approved' | 'rejected'
export type Visibility = 'public' | 'hidden'
export type ReportCategory =
  | 'inappropriate'
  | 'scam'
  | 'impersonation'
  | 'spam'
  | 'broken'
  | 'other'
export type ReportStatus = 'new' | 'reviewing' | 'blocked' | 'dismissed'
export type Severity = 'low' | 'medium' | 'high'

export interface User {
  id: number
  email: string
  name: string
  role: Role
  created_at: string
}

export interface LMS {
  id: number
  name: string
  base_url: string
  platform_name: string
  oauth_client_id: string
  description: string
  feedback_email: string
  accent_color: string
  accent_color_dark: string
  logo_url: string
  logo_upload_url: string
  dashboard_type: string
  unknown_units_mode: string
  offline_downloads: boolean
  smart_push_automation: boolean
  pre_login_discovery: boolean
  pre_login_experience: boolean
  course_unit_progress: boolean
  course_dropdown_nav: boolean
  visibility: Visibility
  featured: boolean
  sort_order: number
  status: LMSStatus
  admin_reviewed: boolean
  reviewed_at: string | null
  last_checked_at: string | null
  last_health_ok: boolean | null
  last_health_note: string
  owner_notified_at: string | null
  owner_email: string
  block_reason: string
  review_requested_at: string | null
  submitted_by: number
  created_at: string
  updated_at: string
}

export interface AffectedLMS {
  lms: ReportLMSBrief | null
  reported_base_url: string
  open_count: number
  total_count: number
  distinct_reporters: number
  worst_severity: Severity
  categories: ReportCategory[]
  latest_at: string
}

export interface ModerationEvent {
  id: number
  actor_name: string
  action: string
  detail: string
  report_id: number | null
  created_at: string
}

export interface NotifyOwnerResult {
  sent: boolean
  owner_email: string
  subject: string
  body: string
  owner_notified_at: string | null
}

export interface ReportLMSBrief {
  id: number
  name: string
  base_url: string
  accent_color: string
  logo_url: string
  admin_reviewed: boolean
  last_health_ok: boolean | null
  owner_email: string
  owner_notified_at: string | null
}

export interface Report {
  id: number
  lms_id: number | null
  reported_base_url: string
  category: ReportCategory
  severity: Severity
  message: string
  reporter_email: string
  screenshot_url: string
  platform: string
  app_version: string
  status: ReportStatus
  resolution_note: string
  resolved_by: number | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  lms: ReportLMSBrief | null
}

export interface ReportStats {
  new: number
  reviewing: number
  blocked: number
  dismissed: number
  total: number
  high_open: number
  affected_lms: number
}

export interface Overview {
  lms: {
    total: number
    approved: number
    pending: number
    rejected: number
    public: number
    hidden: number
    featured: number
    unreviewed: number
  }
  reports: ReportStats
}

export interface PublicConfig {
  directory_mode: 'search' | 'curated'
  provider_name: string
  provider_tagline: string
  provider_logo_url: string | null
}
