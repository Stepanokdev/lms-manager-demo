from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from .models import (
    UserRole, LMSStatus, Visibility,
    ReportCategory, ReportStatus, ReportSeverity,
)


# --- Auth ---

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminCreateRequest(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=6)


class UserRoleUpdateRequest(BaseModel):
    role: UserRole


# --- LMS ---

class LMSCreateRequest(BaseModel):
    name: str
    base_url: str
    platform_name: str
    oauth_client_id: str
    description: str = ""
    token_type: str = "jwt"
    sso_url: str = ""
    sso_finished_url: str = ""
    feedback_email: str = ""
    logo_url: str = ""
    accent_color: str = "#007AFF"
    sso_button_title: str = "Sign in with SSO"
    pre_login_discovery: bool = True
    # New wizard fields
    login_background_url: str = ""
    logo_upload_url: str = ""
    unknown_units_mode: str = "block"
    dashboard_type: str = "gallery"
    pre_login_experience: bool = True
    course_unit_progress: bool = True
    course_dropdown_nav: bool = True
    # Extended feature flags
    offline_downloads: bool = True
    smart_push_automation: bool = False
    # Catalog placement
    visibility: Visibility = Visibility.public
    featured: bool = False
    sort_order: int = 0


class LMSUpdateStatusRequest(BaseModel):
    status: LMSStatus


class LMSReviewRequest(BaseModel):
    admin_reviewed: bool = True


class LMSFullUpdateRequest(BaseModel):
    name: str | None = None
    base_url: str | None = None
    platform_name: str | None = None
    oauth_client_id: str | None = None
    description: str | None = None
    token_type: str | None = None
    sso_url: str | None = None
    sso_finished_url: str | None = None
    feedback_email: str | None = None
    logo_url: str | None = None
    accent_color: str | None = None
    sso_button_title: str | None = None
    pre_login_discovery: bool | None = None
    login_background_url: str | None = None
    logo_upload_url: str | None = None
    unknown_units_mode: str | None = None
    dashboard_type: str | None = None
    pre_login_experience: bool | None = None
    course_unit_progress: bool | None = None
    course_dropdown_nav: bool | None = None
    offline_downloads: bool | None = None
    smart_push_automation: bool | None = None
    visibility: Visibility | None = None
    featured: bool | None = None
    sort_order: int | None = None
    status: LMSStatus | None = None


class LMSResponse(BaseModel):
    id: int
    name: str
    base_url: str
    platform_name: str
    oauth_client_id: str
    description: str
    token_type: str
    sso_url: str
    sso_finished_url: str
    feedback_email: str
    logo_url: str
    accent_color: str
    sso_button_title: str
    pre_login_discovery: bool
    login_background_url: str
    logo_upload_url: str
    accent_color_dark: str
    unknown_units_mode: str
    dashboard_type: str
    pre_login_experience: bool
    course_unit_progress: bool
    course_dropdown_nav: bool
    offline_downloads: bool
    smart_push_automation: bool
    visibility: Visibility
    featured: bool
    sort_order: int
    status: LMSStatus
    admin_reviewed: bool
    reviewed_at: datetime | None
    last_checked_at: datetime | None
    last_health_ok: bool | None
    last_health_note: str
    owner_notified_at: datetime | None
    owner_email: str
    block_reason: str
    review_requested_at: datetime | None
    submitted_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotifyOwnerResponse(BaseModel):
    sent: bool                 # true only if the server actually sent via SMTP
    owner_email: str
    subject: str
    body: str
    owner_notified_at: datetime | None


# --- Reports / complaints ---

class ReportCreateRequest(BaseModel):
    lms_id: int | None = None
    base_url: str = ""
    category: ReportCategory = ReportCategory.other
    message: str = Field(default="", max_length=4000)
    reporter_email: EmailStr | None = None
    platform: str = ""
    app_version: str = ""
    # Optional evidence: a base64-encoded image (with or without a data: prefix),
    # captured and compressed by the app before sending.
    screenshot_base64: str | None = None


class ReportCreateResponse(BaseModel):
    id: int
    status: ReportStatus

    model_config = {"from_attributes": True}


class ReportUpdateRequest(BaseModel):
    status: ReportStatus | None = None
    resolution_note: str | None = None


class ReportLMSBrief(BaseModel):
    id: int
    name: str
    base_url: str
    accent_color: str
    logo_url: str
    admin_reviewed: bool
    last_health_ok: bool | None
    owner_email: str
    owner_notified_at: datetime | None

    model_config = {"from_attributes": True}


class ReportResponse(BaseModel):
    id: int
    lms_id: int | None
    reported_base_url: str
    category: ReportCategory
    severity: ReportSeverity
    message: str
    reporter_email: str
    screenshot_url: str
    platform: str
    app_version: str
    status: ReportStatus
    resolution_note: str
    resolved_by: int | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    lms: ReportLMSBrief | None = None

    model_config = {"from_attributes": True}


class ReportStats(BaseModel):
    new: int
    reviewing: int
    blocked: int
    dismissed: int
    total: int
    high_open: int          # open (new/reviewing) reports at high severity
    affected_lms: int       # distinct LMS with at least one open report


class ModerationEventResponse(BaseModel):
    id: int
    actor_name: str
    action: str
    detail: str
    report_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AffectedLMS(BaseModel):
    """One row per reported LMS for the grouped triage view."""
    lms: ReportLMSBrief | None
    reported_base_url: str
    open_count: int
    total_count: int
    distinct_reporters: int
    worst_severity: ReportSeverity
    categories: list[ReportCategory]
    latest_at: datetime


# --- Public app config ---

class PublicConfigResponse(BaseModel):
    directory_mode: str
    provider_name: str
    provider_tagline: str
    provider_logo_url: str | None = None
