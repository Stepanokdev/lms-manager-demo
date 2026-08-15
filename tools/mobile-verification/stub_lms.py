"""
A stand-in Open edX LMS, just complete enough for a mobile app to sign in and
reach the Profile tab. Verification scaffolding only — never shipped.

Accepts any credentials. Logs every path it is asked for, so anything missing
shows up immediately.
"""
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

USERNAME = "night_tester"
EMAIL = "night_tester@example.com"
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
        "image_url_full": "http://127.0.0.1:8099/static/default.png",
        "image_url_large": "http://127.0.0.1:8099/static/default.png",
        "image_url_medium": "http://127.0.0.1:8099/static/default.png",
        "image_url_small": "http://127.0.0.1:8099/static/default.png",
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


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _route(self, method):
        path = urlparse(self.path).path
        print(f"{method} {path}", file=sys.stderr, flush=True)

        if path == "/oauth2/access_token":
            return self._send(TOKEN)
        if path in ("/api/mobile/v0.5/my_user_info", "/api/mobile/v1/my_user_info"):
            return self._send(USER_INFO)
        if path.startswith("/api/user/v1/accounts/"):
            return self._send(ACCOUNT)
        if "enrollments" in path:
            return self._send({"next": None, "previous": None, "count": 0, "num_pages": 1, "results": []})
        if path == "/oauth2/revoke_token/":
            return self._send({})
        if path.startswith("/api/mobile/v1/notifications"):
            return self._send({})
        # Anything else: an empty, well-formed answer keeps the app moving and
        # the log above says exactly what was asked for.
        return self._send({"results": [], "count": 0, "next": None, "previous": None})

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length:
            self.rfile.read(length)
        self._route("POST")

    def do_PATCH(self):
        self.do_POST()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
    print(f"stub LMS on http://127.0.0.1:{port}", file=sys.stderr, flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
