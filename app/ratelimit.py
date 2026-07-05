"""
Tiny in-process rate limiter (sliding window). No external dependency.

Good enough for the pilot to blunt abuse of the public endpoints. Note: it is
per-process, so behind multiple workers the effective limit is limit*workers —
put a reverse-proxy / gateway limit in front for hard guarantees.
"""
import time
from collections import defaultdict, deque
from threading import Lock


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, limit: int, window_seconds: float) -> bool:
        now = time.monotonic()
        with self._lock:
            dq = self._hits[key]
            cutoff = now - window_seconds
            while dq and dq[0] <= cutoff:
                dq.popleft()
            if len(dq) >= limit:
                return False
            dq.append(now)
            # Opportunistic cleanup so the dict doesn't grow unbounded.
            if len(self._hits) > 10000:
                for k in [k for k, v in list(self._hits.items()) if not v]:
                    self._hits.pop(k, None)
            return True


reports_limiter = RateLimiter()
validate_limiter = RateLimiter()


def client_ip(request) -> str:
    """Best-effort client IP, honoring a single X-Forwarded-For hop (Traefik)."""
    xff = request.headers.get("x-forwarded-for") if request else None
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request and request.client else "unknown"
