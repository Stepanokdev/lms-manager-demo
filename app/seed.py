"""Seed the database on first run.

Demo credentials (admin@demo.com / user@demo.com) are ONLY created when
SEED_DEMO is truthy — it defaults to OFF so a production database never ships
with known passwords. For a real deployment, set ADMIN_EMAIL + ADMIN_PASSWORD
(and leave SEED_DEMO unset) and the initial admin is created from those.
Local development: run with SEED_DEMO=1.
"""
import datetime
import os

from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import (
    User, LMSInstance, UserRole, LMSStatus, Visibility,
    Report, ReportCategory, ReportStatus, ReportSeverity, CATEGORY_SEVERITY,
)
from .auth import hash_password
from .color_utils import adapt_accent_for_dark


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def seed():
    db: Session = SessionLocal()
    try:
        if db.query(User).first():
            return  # already seeded

        # Production path: create the admin from the environment, no demo data.
        admin_email = os.environ.get("ADMIN_EMAIL")
        admin_password = os.environ.get("ADMIN_PASSWORD")
        if admin_email and admin_password:
            db.add(User(
                email=admin_email,
                name=os.environ.get("ADMIN_NAME", "Admin"),
                password_hash=hash_password(admin_password),
                role=UserRole.admin,
            ))
            db.commit()
            print(f"Created admin '{admin_email}' from environment.")
            return

        if not _truthy(os.environ.get("SEED_DEMO")):
            print(
                "No users seeded. Set ADMIN_EMAIL + ADMIN_PASSWORD to create an admin, "
                "or SEED_DEMO=1 for demo data."
            )
            return

        admin = User(
            email="admin@demo.com",
            name="Admin",
            password_hash=hash_password("admin123"),
            role=UserRole.admin,
        )
        db.add(admin)
        db.flush()

        user = User(
            email="user@demo.com",
            name="Demo User",
            password_hash=hash_password("user123"),
            role=UserRole.user,
        )
        db.add(user)
        db.flush()

        lms_instances = [
            LMSInstance(
                name="axim-ccpv-dev",
                base_url="https://axim-ccpv-dev.raccoongang.net",
                platform_name="AXIM CCPV Dev",
                description="AXIM Collaborative Community Platform for development and testing of Open edX mobile applications.",
                oauth_client_id="SxDFlH1rb8Xw3nT6lOPwUejLb9vgXzOfkgqx1sY2",
                token_type="jwt",
                feedback_email="support@example.com",
                logo_url="",
                accent_color="#ED8794",
                accent_color_dark=adapt_accent_for_dark("#ED8794"),
                pre_login_discovery=True,
                pre_login_experience=True,
                dashboard_type="gallery",
                course_unit_progress=True,
                course_dropdown_nav=True,
                unknown_units_mode="block",
                offline_downloads=True,
                smart_push_automation=True,
                visibility=Visibility.public,
                featured=True,
                sort_order=0,
                status=LMSStatus.approved,
                admin_reviewed=True,
                reviewed_at=datetime.datetime.utcnow(),
                reviewed_by=admin.id,
                submitted_by=admin.id,
            ),
            LMSInstance(
                name="lms-axim-stage",
                base_url="https://axim-mobile-dev.raccoongang.net",
                platform_name="AXIM Mobile Dev",
                description="AXIM Mobile Development environment for Open edX platform integration and mobile feature testing.",
                oauth_client_id="K5TcezWSOG6WBzgjBcnn16mVdxTDwFd66aOJndXF",
                token_type="jwt",
                feedback_email="support@example.com",
                logo_url="",
                accent_color="#007AFF",
                accent_color_dark=adapt_accent_for_dark("#007AFF"),
                pre_login_discovery=True,
                pre_login_experience=True,
                dashboard_type="list",
                course_unit_progress=True,
                course_dropdown_nav=False,
                unknown_units_mode="webview",
                offline_downloads=True,
                smart_push_automation=False,
                visibility=Visibility.public,
                featured=True,
                sort_order=1,
                status=LMSStatus.approved,
                admin_reviewed=False,  # newly submitted, awaiting an admin check
                submitted_by=admin.id,
            ),
            LMSInstance(
                name="Venus Dev",
                base_url="https://venus.raccoongang.net",
                platform_name="White Label Dev",
                description="White Label development instance for customized Open edX deployments and partner integrations.",
                oauth_client_id="K5TcezWSOG6WBzgjBcnn16mVdxTDwFd66aOJndXF",
                token_type="jwt",
                feedback_email="support@example.com",
                logo_url="",
                accent_color="#5B8777",
                accent_color_dark=adapt_accent_for_dark("#5B8777"),
                pre_login_discovery=True,
                pre_login_experience=False,
                dashboard_type="gallery",
                course_unit_progress=False,
                course_dropdown_nav=True,
                unknown_units_mode="block",
                offline_downloads=False,
                smart_push_automation=False,
                visibility=Visibility.public,
                featured=False,
                sort_order=2,
                status=LMSStatus.approved,
                admin_reviewed=False,
                submitted_by=admin.id,
            ),
        ]
        db.add_all(lms_instances)
        db.flush()

        # A couple of demo complaints so the triage inbox is not empty on a
        # fresh install. Timestamps are staggered so ordering is visible.
        now = datetime.datetime.utcnow()
        target = lms_instances[1]
        demo_reports = [
            Report(
                lms_id=target.id,
                reported_base_url=target.base_url,
                category=ReportCategory.inappropriate,
                severity=CATEGORY_SEVERITY[ReportCategory.inappropriate],
                message="A 'course' on this platform is just adult videos. This should not be in the app.",
                reporter_email="learner@example.com",
                platform="ios",
                app_version="2.4.0",
                status=ReportStatus.new,
                created_at=now - datetime.timedelta(minutes=6),
            ),
            Report(
                lms_id=target.id,
                reported_base_url=target.base_url,
                category=ReportCategory.scam,
                severity=CATEGORY_SEVERITY[ReportCategory.scam],
                message="The sign-in page asks for card details before letting you in. Looks like phishing.",
                platform="android",
                app_version="2.4.0",
                status=ReportStatus.new,
                created_at=now - datetime.timedelta(hours=2),
            ),
            Report(
                lms_id=lms_instances[0].id,
                reported_base_url=lms_instances[0].base_url,
                category=ReportCategory.impersonation,
                severity=CATEGORY_SEVERITY[ReportCategory.impersonation],
                message="Claims to be an official university but the domain looks unrelated.",
                platform="ios",
                status=ReportStatus.dismissed,
                resolution_note="Verified: this is a legitimate partner instance. No action needed.",
                resolved_by=admin.id,
                resolved_at=now - datetime.timedelta(days=1),
                created_at=now - datetime.timedelta(days=2),
            ),
        ]
        db.add_all(demo_reports)
        db.commit()
        print("Database seeded with demo data.")
    finally:
        db.close()
