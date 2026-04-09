from datetime import datetime
from pydantic import BaseModel, EmailStr
from .models import UserRole, LMSStatus


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


class LMSUpdateStatusRequest(BaseModel):
    status: LMSStatus


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
    status: LMSStatus
    submitted_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
