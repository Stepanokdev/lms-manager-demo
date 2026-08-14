"""Seed the database on first run.

Demo credentials (admin@demo.com / user@demo.com) are ONLY created when
SEED_DEMO is truthy — it defaults to OFF so a production database never ships
with known passwords. For a real deployment, set ADMIN_EMAIL + ADMIN_PASSWORD
(and leave SEED_DEMO unset) and the initial admin is created from those.
Local development: run with SEED_DEMO=1.

Portal deployments get a different demo set — see `_seed_portal_demo` — because
the thing worth looking at there is one provider's own directory, not an open
catalog with complaints in it.
"""
import datetime
import os

from sqlalchemy.orm import Session

from .config import get_config
from .database import SessionLocal
from .models import (
    User, LMSInstance, Organization, UserRole, LMSStatus, Visibility,
    Report, ReportCategory, ReportStatus, ReportSeverity, CATEGORY_SEVERITY,
)
from .auth import hash_password
from .color_utils import adapt_accent_for_dark


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


# Logos are absolute URLs on the pilot registry rather than files committed here:
# this is demo data that only ever runs with SEED_DEMO=1, and keeping real logos
# is what makes the branded list actually look like a provider's app.
_PILOT_ASSETS = "https://openedx-lms.stepanok.com/uploads"

# Five real Open edX platforms with genuinely different branding — the point of a
# provider directory is that each one keeps its own identity inside one app.
_DEMO_PORTAL_PLATFORMS = [
    dict(
        name="Axim", platform_name="AXIM Collaborative",
        description="AXIM Collaborative Community Platform for development and testing of Open edX mobile applications.",
        base_url="https://axim-ccpv-dev.raccoongang.net",
        oauth_client_id="SxDFlH1rb8Xw3nT6lOPwUejLb9vgXzOfkgqx1sY2",
        accent_color="#002545", logo_url=f"{_PILOT_ASSETS}/0f1c254f87b44e46bfc57d0bece0adac.webp",
        login_background_url=f"{_PILOT_ASSETS}/64efba4fcc7d49a989f7d91d8318d8f5.png",
        dashboard_type="list", unknown_units_mode="webview",
        pre_login_discovery=False, pre_login_experience=False,
        course_unit_progress=True, course_dropdown_nav=True,
        offline_downloads=True, smart_push_automation=False,
        feedback_email="support@example.com", sort_order=0,
    ),
    dict(
        name="Venus", platform_name="Venus Education",
        description="White Label development instance for customized Open edX deployments and partner integrations.",
        base_url="https://venus.raccoongang.net",
        oauth_client_id="K5TcezWSOG6WBzgjBcnn16mVdxTDwFd66aOJndXF",
        accent_color="#8a2be2", logo_url=f"{_PILOT_ASSETS}/7a90f8c651b34116b95a8a38928c617c.png",
        login_background_url=f"{_PILOT_ASSETS}/4e935500048f4667ab140d805d8ab191.jpg",
        dashboard_type="gallery", unknown_units_mode="webview",
        pre_login_discovery=False, pre_login_experience=True,
        course_unit_progress=True, course_dropdown_nav=False,
        offline_downloads=True, smart_push_automation=False,
        feedback_email="support@example.com", sort_order=1,
    ),
    dict(
        name="Banana", platform_name="Banana Learning",
        description="Short professional courses, delivered mobile-first.",
        base_url="https://axim-ccpv-dev.raccoongang.net",
        oauth_client_id="SxDFlH1rb8Xw3nT6lOPwUejLb9vgXzOfkgqx1sY2",
        accent_color="#fdc91d", logo_url=f"{_PILOT_ASSETS}/ef1668ef36e9468da84f18accd0f8009.png",
        login_background_url=f"{_PILOT_ASSETS}/1e42d937e29d44a6a5b695a4a6988fd4.png",
        dashboard_type="list", unknown_units_mode="webview",
        pre_login_discovery=False, pre_login_experience=True,
        course_unit_progress=False, course_dropdown_nav=True,
        offline_downloads=True, smart_push_automation=True,
        feedback_email="support@example.com", sort_order=2,
    ),
    dict(
        name="Takoradi", platform_name="Takoradi Technical",
        description="Technical university campus running on Open edX.",
        base_url="https://takoradi.edunext.cloud",
        oauth_client_id="ZoVMqJgxl4xhgZV4xi0a0m1hV8ywIhJFA2Qavlyo",
        accent_color="#007BFF", logo_url=f"{_PILOT_ASSETS}/eb4330b3f342485fbab7b985a6d19af6.png",
        login_background_url=f"{_PILOT_ASSETS}/b8ae95ea629c4c5c8af5d8ae6c973c5f.png",
        dashboard_type="list", unknown_units_mode="webview",
        pre_login_discovery=True, pre_login_experience=True,
        course_unit_progress=True, course_dropdown_nav=True,
        offline_downloads=True, smart_push_automation=False,
        feedback_email="support@example.com", sort_order=3,
    ),
    dict(
        name="Ulmo Demo", platform_name="Ulmo Demo Campus",
        description="Public demo instance on the Ulmo release, used for onboarding.",
        base_url="https://demo.ulmo.releases.edunext.link",
        oauth_client_id="yEuuu5AkMoL1ijZyoKuiUkFgUHFZ9OtIsrsz41kR",
        accent_color="#2196f3", logo_url=f"{_PILOT_ASSETS}/936d5d262b53433080680f2844a4152a.png",
        login_background_url="",
        dashboard_type="gallery", unknown_units_mode="block",
        pre_login_discovery=True, pre_login_experience=True,
        course_unit_progress=True, course_dropdown_nav=True,
        offline_downloads=True, smart_push_automation=False,
        feedback_email="support@example.com", sort_order=4,
    ),
]


# A second provider, so the demo shows what the mode is actually for: two
# organizations on one deployment, each with a directory the other cannot touch.
_DEMO_SECOND_PROVIDER = [
    dict(
        name="Harbourline Campus", platform_name="Harbourline Institute",
        description="Vocational and short-course programmes for the maritime trades.",
        base_url="https://sandbox.openedx.org",
        oauth_client_id="android",
        accent_color="#6a2e7b", logo_url=f"{_PILOT_ASSETS}/9e8eb38dbcf841d9957d37a1cde1f0d1.png",
        login_background_url=f"{_PILOT_ASSETS}/e882c3e59a2a44f39fa96bc0335a57a3.png",
        dashboard_type="gallery", unknown_units_mode="webview",
        pre_login_discovery=True, pre_login_experience=True,
        course_unit_progress=True, course_dropdown_nav=True,
        offline_downloads=True, smart_push_automation=False,
        feedback_email="support@example.com", sort_order=0,
    ),
    dict(
        name="Harbourline Online", platform_name="Harbourline Institute",
        description="The distance-learning campus, open to students worldwide.",
        base_url="https://demo.ulmo.releases.edunext.link",
        oauth_client_id="yEuuu5AkMoL1ijZyoKuiUkFgUHFZ9OtIsrsz41kR",
        accent_color="#0d7d4d", logo_url="",
        login_background_url="",
        dashboard_type="list", unknown_units_mode="block",
        pre_login_discovery=False, pre_login_experience=False,
        course_unit_progress=True, course_dropdown_nav=False,
        offline_downloads=False, smart_push_automation=False,
        feedback_email="support@example.com", sort_order=1,
    ),
]


def _add_org(db: Session, *, slug, name, tagline, email, password, owner_name, platforms):
    """One provider: its organization, its single account, and its platforms."""
    org = Organization(slug=slug, name=name, tagline=tagline, contact_email=email, logo_url="")
    db.add(org)
    db.flush()

    owner = User(
        email=email,
        name=owner_name,
        password_hash=hash_password(password),
        role=UserRole.user,
        organization_id=org.id,
    )
    db.add(owner)
    db.flush()

    now = datetime.datetime.utcnow()
    for spec in platforms:
        data = dict(spec)
        db.add(LMSInstance(
            **data,
            accent_color_dark=adapt_accent_for_dark(data["accent_color"]),
            token_type="jwt",
            visibility=Visibility.public,
            featured=False,
            status=LMSStatus.approved,
            admin_reviewed=True,
            reviewed_at=now,
            reviewed_by=owner.id,
            submitted_by=owner.id,
            organization_id=org.id,
        ))
    return org


def _seed_portal_demo(db: Session) -> None:
    """
    A portal with two providers already in it.

    Two, not one, on purpose: the whole point of this mode is that each provider
    sees only its own shelf, and a single-tenant demo cannot show that. On a
    fresh install you get a registry operator, two organizations with real
    directory URLs, and platforms whose branding genuinely differs so the app's
    picker looks like a product rather than repeated rows.
    """
    db.add(User(
        email="admin@demo.com",
        name="Registry Operator",
        password_hash=hash_password("admin123"),
        role=UserRole.admin,
    ))

    _add_org(
        db,
        slug="northwind",
        name="Northwind Education Group",
        tagline="Five campuses, one app",
        email="provider@demo.com",
        password="provider123",
        owner_name="Northwind Admin",
        platforms=_DEMO_PORTAL_PLATFORMS,
    )
    _add_org(
        db,
        slug="harbourline",
        name="Harbourline Institute",
        tagline="Vocational training, on the move",
        email="harbourline@demo.com",
        password="provider123",
        owner_name="Harbourline Admin",
        platforms=_DEMO_SECOND_PROVIDER,
    )

    db.commit()
    print(
        "Portal demo seeded: operator admin@demo.com/admin123; providers "
        "provider@demo.com and harbourline@demo.com (both provider123); "
        "directories /p/northwind and /p/harbourline"
    )


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

        if get_config().is_portal:
            _seed_portal_demo(db)
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
