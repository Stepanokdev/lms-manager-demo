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
    token_type: str = "jwt"
    sso_url: str = ""
    sso_finished_url: str = ""
    feedback_email: str = ""
    logo_url: str = ""
    accent_color: str = "#007AFF"
    sso_button_title: str = "Sign in with SSO"


class LMSUpdateStatusRequest(BaseModel):
    status: LMSStatus


class LMSResponse(BaseModel):
    id: int
    name: str
    base_url: str
    platform_name: str
    oauth_client_id: str
    token_type: str
    sso_url: str
    sso_finished_url: str
    feedback_email: str
    logo_url: str
    accent_color: str
    sso_button_title: str
    status: LMSStatus
    submitted_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
