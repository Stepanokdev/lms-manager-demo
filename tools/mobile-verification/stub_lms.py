"""
A stand-in Open edX LMS, complete enough for a mobile app to sign in and reach
the Profile tab, and strict about everything else.

This is a regression double, not a substitute for a real deployment. It is
useful only because it is strict: it knows one account, rejects any other
credentials, and answers 404 to every route it was not written for. A route the
app asks for that is not listed here is recorded and reported at the end, so a
run cannot pass by having been quietly agreeable.

Exit code is 1 if anything unexpected was asked for, so a script can fail on it.
"""
import json
import signal
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

USERNAME = "night_tester"
EMAIL = "night_tester@example.com"
PASSWORD = "stubpassword"
NAME = "Night Tester"

ACCOUNT = {
    "username": USERNAME,
    "email": EMAIL,
    "name": NAME,
    "bio": "Verifying the Profile tab.",
    "country": "UA",
    "year_of_birth": 1990,
    "level_of_education": "m",
    "gender": "m",
    "goals": "",
    "language_proficiencies": [],
    "profile_image": {
        "has_image": False,
        "image_url_full": "",
        "image_url_large": "",
        "image_url_medium": "",
        "image_url_small": "",
    },
    "account_privacy": "all_users",
    "is_active": True,
    "date_joined": "2026-01-01T00:00:00Z",
    "accomplishments_shared": False,
    "requires_parental_consent": False,
    "social_links": [],
    "email_verified": True,
}

USER_INFO = {"id": 1, "username": USERNAME, "email": EMAIL, "name": NAME}

TOKEN = {
    "access_token": "stub-access-token",
    "refresh_token": "stub-refresh-token",
    "token_type": "Bearer",
    "expires_in": 86400,
    "scope": "read write profile email",
}

EMPTY_PAGE = {"next": None, "previous": None, "count": 0, "num_pages": 1, "results": []}

# Every route this stub is willing to answer. Anything else is a finding, not a
# default: an app asking for something unlisted means the flow changed, and a
# silent 200 would hide that.
KNOWN_PREFIXES = (
    "/api/user/v1/accounts/",
    "/api/mobile/v0.5/my_user_info",
    "/api/mobile/v1/my_user_info",
    "/api/courses/v1/courses",
    "/oauth2/login",
    "/oauth2/revoke_token",
)
KNOWN_SUBSTRINGS = ("enrollments",)

unexpected: list[str] = []


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _token(self, form):
        """One account, one password. Anything else is rejected like a real LMS."""
        username = (form.get("username") or [""])[0]
        password = (form.get("password") or [""])[0]
        if username not in (USERNAME, EMAIL) or password != PASSWORD:
            print(f"REJECTED login for {username!r}", file=sys.stderr, flush=True)
            return self._send({"error": "invalid_grant"}, status=400)
        return self._send(TOKEN)

    def _route(self, method, form=None):
        path = urlparse(self.path).path
        print(f"{method} {path}", file=sys.stderr, flush=True)

        if path.rstrip("/") == "/oauth2/access_token":
            return self._token(form or {})
        if path.startswith("/api/user/v1/accounts/"):
            return self._send(ACCOUNT)
        if path.rstrip("/") in ("/api/mobile/v0.5/my_user_info", "/api/mobile/v1/my_user_info"):
            return self._send(USER_INFO)
        if any(part in path for part in KNOWN_SUBSTRINGS) or path.startswith("/api/courses/v1/courses"):
            return self._send(EMPTY_PAGE)
        if path.startswith(("/oauth2/login", "/oauth2/revoke_token")):
            return self._send({})

        unexpected.append(f"{method} {path}")
        print(f"UNEXPECTED {method} {path}", file=sys.stderr, flush=True)
        return self._send({"detail": "not found"}, status=404)

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode() if length else ""
        self._route("POST", parse_qs(raw))

    def do_PATCH(self):
        self.do_POST()

    def log_message(self, *args):
        pass


def _report_and_exit(*_args):
    if unexpected:
        print(f"{len(unexpected)} unexpected request(s):", file=sys.stderr)
        for line in sorted(set(unexpected)):
            print(f"  {line}", file=sys.stderr)
        sys.exit(1)
    print("no unexpected requests", file=sys.stderr)
    sys.exit(0)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
    signal.signal(signal.SIGTERM, _report_and_exit)
    signal.signal(signal.SIGINT, _report_and_exit)
    print(f"stub LMS on http://127.0.0.1:{port}", file=sys.stderr, flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
