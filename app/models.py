import datetime
import secrets
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum, Boolean, Text
from sqlalchemy.orm import relationship
import enum

from .database import Base


class UserRole(str, enum.Enum):
    # Deliberately unchanged. In portal mode a provider is a `user` that carries an
    # organization_id — see Organization below. Keeping the enum at two members means
    # `require_admin` still can't be reached by a provider, so cross-org access to the
    # global /admin/* surface is impossible by construction rather than by a filter we
    # might forget to write.
    admin = "admin"
    user = "user"


class LMSStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Visibility(str, enum.Enum):
    public = "public"    # discoverable through search
    hidden = "hidden"    # only returned on an exact base_url match


# Why a learner flags an LMS in the public catalog. These are moderation
# reasons (trust & safety), not tech support: the admin's decision is whether
# to block the instance, not to debug someone else's platform.
class ReportCategory(str, enum.Enum):
    inappropriate = "inappropriate"    # adult / illegal / harmful content
    scam = "scam"                      # phishing / fraud / steals credentials
    impersonation = "impersonation"    # pretends to be a real institution
    spam = "spam"                      # spam / not a real learning platform
    broken = "broken"                  # fake or dead: can't access it at all
    other = "other"


# A complaint's lifecycle. Terminal states are the two moderation outcomes:
# the LMS was blocked, or the complaint was dismissed.
class ReportStatus(str, enum.Enum):
    new = "new"
    reviewing = "reviewing"
    blocked = "blocked"       # we removed the LMS from the catalog
    dismissed = "dismissed"   # reviewed, no action needed


class ReportSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


# How urgently a category should surface in the triage inbox.
CATEGORY_SEVERITY = {
    ReportCategory.inappropriate: ReportSeverity.high,
    ReportCategory.scam: ReportSeverity.high,
    ReportCategory.impersonation: ReportSeverity.high,
    ReportCategory.spam: ReportSeverity.medium,
    ReportCategory.broken: ReportSeverity.medium,
    ReportCategory.other: ReportSeverity.low,
}


class Organization(Base):
    """
    A provider organization — the tenant of portal mode.

    One organization owns one set of LMS instances and gets one directory URL
    (``<origin>/p/<slug>``) that its own mobile builds point at. The slug is
    permanent: it is compiled into shipped apps, so renaming it would silently
    break every install already in the field.

    Only meaningful when ``DIRECTORY_MODE=portal``. In ``search`` and ``curated``
    deployments the table stays empty and every query keeps its old global shape.
    """
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    tagline = Column(String, default="")
    logo_url = Column(String, default="")
    contact_email = Column(String, default="")

    # Set false by a platform superadmin to take a provider's directory offline
    # without deleting anything: /p/<slug>/* then 404s exactly like an unknown slug.
    active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    members = relationship("User", back_populates="organization")
    lms_instances = relationship("LMSInstance", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.user, nullable=False)
    # Portal mode: the provider account this user is. NULL in search/curated mode
    # and for the platform superadmin, who deliberately belongs to no tenant.
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="members")

    lms_instances = relationship(
        "LMSInstance",
        foreign_keys="LMSInstance.submitted_by",
        back_populates="submitter",
    )

    @property
    def is_provider(self) -> bool:
        """True for a provider account — i.e. one scoped to an organization."""
        return self.organization_id is not None


def new_catalog_key() -> str:
    """A platform's identity in the published mobile catalog. Random, never reused."""
    return secrets.token_hex(8)


class LMSInstance(Base):
    __tablename__ = "lms_instances"

    id = Column(Integer, primary_key=True, index=True)
    # What the mobile apps key a learner's selection and stored session by. Not the row
    # id: SQLite hands a deleted row's id to the next insert, and a selection that
    # silently resolved to another owner's platform would send the learner's tokens to
    # that host. Replaced whenever the platform's address changes, for the same reason.
    catalog_key = Column(String, default=new_catalog_key)
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

    # Theming / wizard fields
    login_background_url = Column(String, default="")
    logo_upload_url = Column(String, default="")
    accent_color_dark = Column(String, default="")
    unknown_units_mode = Column(String, default="block")
    dashboard_type = Column(String, default="gallery")
    pre_login_experience = Column(Boolean, default=True)
    course_unit_progress = Column(Boolean, default=True)
    course_dropdown_nav = Column(Boolean, default=True)

    # Extended feature flags (see backend.md contract)
    offline_downloads = Column(Boolean, default=True)
    smart_push_automation = Column(Boolean, default=False)

    # Catalog placement
    visibility = Column(SAEnum(Visibility), default=Visibility.public, nullable=False)
    featured = Column(Boolean, default=False)      # shown directly in curated / provider mode
    sort_order = Column(Integer, default=0)        # ordering within a curated list

    # Moderation: submissions auto-approve, admins confirm they checked them
    status = Column(SAEnum(LMSStatus), default=LMSStatus.pending, nullable=False)
    admin_reviewed = Column(Boolean, default=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Health, populated by admin "recheck" action
    last_checked_at = Column(DateTime, nullable=True)
    last_health_ok = Column(Boolean, nullable=True)
    last_health_note = Column(String, default="")

    # Set when an admin has emailed the owner about a moderation action
    owner_notified_at = Column(DateTime, nullable=True)
    # Human-readable reason shown to the owner when their LMS is blocked
    block_reason = Column(String, default="")
    # Set when the owner asks for a re-review after fixing a blocked instance
    review_requested_at = Column(DateTime, nullable=True)

    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Portal mode: the organization whose directory this instance appears in. NULL in
    # search/curated mode. Every /p/<slug> query filters on it, so a NULL row is
    # invisible to every provider directory — which is the safe default.
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    submitter = relationship("User", foreign_keys=[submitted_by], back_populates="lms_instances")
    organization = relationship("Organization", back_populates="lms_instances")
    reports = relationship("Report", back_populates="lms", cascade="all, delete-orphan")

    @property
    def owner_email(self) -> str:
        """Where we reach the owner about moderation: their account email,
        falling back to the support email they entered in the wizard."""
        if self.submitter and self.submitter.email:
            return self.submitter.email
        return self.feedback_email or ""


class Report(Base):
    """A complaint filed by a mobile user about an LMS."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    # An LMS may be referenced by registry id (iOS catalog) or only by URL
    # (apps that let users type a URL). We resolve to lms_id when possible.
    lms_id = Column(Integer, ForeignKey("lms_instances.id", ondelete="CASCADE"), nullable=True)
    reported_base_url = Column(String, default="")

    category = Column(SAEnum(ReportCategory), default=ReportCategory.other, nullable=False)
    severity = Column(SAEnum(ReportSeverity), default=ReportSeverity.low, nullable=False)
    message = Column(Text, default="")
    reporter_email = Column(String, default="")
    reporter_ip = Column(String, default="")      # for dedup / brigading detection
    screenshot_url = Column(String, default="")   # optional evidence from the reporter

    platform = Column(String, default="")     # "ios" | "android" | "web"
    app_version = Column(String, default="")

    status = Column(SAEnum(ReportStatus), default=ReportStatus.new, nullable=False)
    resolution_note = Column(Text, default="")
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    lms = relationship("LMSInstance", back_populates="reports")


class ModerationEvent(Base):
    """Append-only audit trail of moderation actions (who did what, when)."""
    __tablename__ = "moderation_events"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = system/automatic
    actor_name = Column(String, default="")
    lms_id = Column(Integer, index=True, nullable=True)
    report_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False)   # blocked | unblocked | dismissed | reviewed | notified | review_requested
    detail = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
