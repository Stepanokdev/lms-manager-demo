"""
Outgoing webhook delivery for new complaints.

When ``WEBHOOK_URL`` is configured, every new report is POSTed there so an
admin channel (Slack, Discord, a custom endpoint, ...) is notified in real
time. Delivery is best-effort: failures are logged and never affect the
mobile user's request.
"""
import logging

import httpx

from .config import get_config
from .models import Report, LMSInstance

logger = logging.getLogger("lms_registry.webhook")


def build_payload(report: Report, lms: LMSInstance | None) -> dict:
    return {
        "event": "complaint.created",
        "report": {
            "id": report.id,
            "category": report.category.value,
            "severity": report.severity.value,
            "status": report.status.value,
            "message": report.message,
            "reporter_email": report.reporter_email or None,
            "platform": report.platform or None,
            "app_version": report.app_version or None,
            "created_at": report.created_at.isoformat() if report.created_at else None,
        },
        "lms": {
            "id": lms.id if lms else None,
            "name": lms.name if lms else None,
            "base_url": (lms.base_url if lms else report.reported_base_url) or None,
        },
    }


async def deliver(payload: dict) -> None:
    """Send the payload to the configured webhook. Swallows all errors."""
    cfg = get_config()
    if not cfg.webhook_url:
        return
    headers = {"Content-Type": "application/json"}
    if cfg.webhook_secret:
        headers["X-Webhook-Secret"] = cfg.webhook_secret
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(cfg.webhook_url, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.warning("Webhook returned %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:  # noqa: BLE001 - delivery must never raise
        logger.warning("Webhook delivery failed: %s", exc)
