import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum, Boolean
from sqlalchemy.orm import relationship
import enum

from .database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class LMSStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.user, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    lms_instances = relationship("LMSInstance", back_populates="submitter")


class LMSInstance(Base):
    __tablename__ = "lms_instances"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    base_url = Column(String, nullable=False)
    platform_name = Column(String, nullable=False)
    oauth_client_id = Column(String, nullable=False)
    token_type = Column(String, default="jwt")
    sso_url = Column(String, default="")
    sso_finished_url = Column(String, default="")
    feedback_email = Column(String, default="")
    logo_url = Column(String, default="")
    accent_color = Column(String, default="#007AFF")
    description = Column(String, default="")
    sso_button_title = Column(String, default="Sign in with SSO")

    pre_login_discovery = Column(Boolean, default=True)

    # New fields
    login_background_url = Column(String, default="")
    logo_upload_url = Column(String, default="")
    accent_color_dark = Column(String, default="")
    unknown_units_mode = Column(String, default="block")
    dashboard_type = Column(String, default="gallery")
    pre_login_experience = Column(Boolean, default=True)
    course_unit_progress = Column(Boolean, default=True)
    course_dropdown_nav = Column(Boolean, default=True)

    status = Column(SAEnum(LMSStatus), default=LMSStatus.pending, nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    submitter = relationship("User", back_populates="lms_instances")
