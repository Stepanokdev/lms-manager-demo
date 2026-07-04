"""
Email notices to LMS owners when their instance is moderated.

Sending goes through SMTP when it is configured (see AppConfig). When it is
not, the API returns the composed message so the console can open the admin's
own mail client instead. Nothing is ever silently "pretend-sent".
"""
import logging
import smtplib
from email.message import EmailMessage

from .config import get_config
from .models import LMSInstance

logger = logging.getLogger("lms_registry.email")

CATEGORY_PHRASE = {
    "inappropriate": "inappropriate or adult content",
    "scam": "a possible scam or phishing",
    "impersonation": "impersonating another organization",
    "spam": "spam or not being a real learning platform",
    "broken": "the platform not working or being inaccessible",
    "other": "a problem with the platform",
}


def summarize_reason(categories: list[str]) -> str:
    """Turn complaint categories into a human phrase, e.g. 'a scam, and adult content'."""
    phrases = [CATEGORY_PHRASE.get(c, CATEGORY_PHRASE["other"]) for c in dict.fromkeys(categories)]
    if not phrases:
        return CATEGORY_PHRASE["other"]
    if len(phrases) == 1:
        return phrases[0]
    return ", ".join(phrases[:-1]) + f", and {phrases[-1]}"


def compose_block_notice(lms: LMSInstance, categories: list[str], details: str = "") -> tuple[str, str]:
    """Return (subject, body) for a temporary-block notice to the owner."""
    cfg = get_config()
    provider = cfg.provider_name
    reason = summarize_reason(categories)

    subject = f"[{provider}] {lms.name} was temporarily removed from the app"

    lines = [
        f"Hello,",
        "",
        f"We received reports from learners about your platform \"{lms.name}\" "
        f"({lms.base_url}) in the {provider} app, regarding {reason}.",
        "",
        "While we look into this, we've temporarily removed the platform from the "
        "app catalog so it no longer appears to learners.",
    ]
    if details.strip():
        lines += ["", f"What was reported: {details.strip()}"]
    lines += [
        "",
        "Please review and address the issue. Once it's resolved, reply to this "
        "email and we'll restore your platform in the catalog.",
        "",
        f"Thanks,",
        f"The {provider} team",
    ]
    return subject, "\n".join(lines)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send via SMTP if configured. Returns True only on an actual send."""
    cfg = get_config()
    if not cfg.smtp_configured or not to:
        return False
    msg = EmailMessage()
    msg["From"] = cfg.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=15) as server:
            if cfg.smtp_use_tls:
                server.starttls()
            if cfg.smtp_user and cfg.smtp_password:
                server.login(cfg.smtp_user, cfg.smtp_password)
            server.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001 - notifying must not crash moderation
        logger.warning("Owner email to %s failed: %s", to, exc)
        return False
