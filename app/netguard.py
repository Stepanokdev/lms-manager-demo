"""
SSRF guard for the LMS reachability probe.

The probe fetches an owner-supplied URL, so it must not be usable to reach the
server's own network (localhost, link-local 169.254.169.254 metadata, private
ranges). We resolve the hostname and reject any non-public address.
"""
import ipaddress
import socket
from urllib.parse import urlparse


def is_public_url(url: str) -> bool:
    try:
        parsed = urlparse(url if "://" in url else f"https://{url}")
        if parsed.scheme not in ("http", "https"):
            return False
        host = parsed.hostname
        if not host:
            return False
        infos = socket.getaddrinfo(host, None)
    except (socket.gaierror, ValueError, UnicodeError, OSError):
        return False
    if not infos:
        return False
    for info in infos:
        addr = info[4][0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
    return True
