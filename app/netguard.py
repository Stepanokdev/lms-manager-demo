"""
SSRF guard for the LMS reachability probe.

The probe fetches an owner-supplied URL, so it must not be usable to reach the
server's own network (localhost, link-local 169.254.169.254 metadata, private
ranges).

Checking the name once before the request is not enough on its own: a redirect
can point somewhere else, and a name can resolve to a public address for the
check and to a private one a moment later for the request (DNS rebinding). So
the probe client below resolves the name itself at connect time, refuses unless
every address is public, and connects to the address it just checked. TLS is
still verified against the original host name, and redirects are never followed.
"""
import ipaddress
import socket
from urllib.parse import urlparse

import anyio
import httpcore
import httpx

#: The most of any probe response we read. The probe only looks for a status code
#: and a couple of error words, so anything past this is a server stalling us.
MAX_PROBE_BODY_BYTES = 64 * 1024


def _is_public_ip(addr: str) -> bool:
    try:
        ip = ipaddress.ip_address(addr)
    except ValueError:
        return False
    # An IPv4-mapped IPv6 address (::ffff:10.0.0.1) is judged by the IPv4 inside it.
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
        or not ip.is_global
    )


def resolve_public_address(host: str) -> str | None:
    """The address to connect to for `host`, or None unless every address it has is public."""
    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except (socket.gaierror, ValueError, UnicodeError, OSError):
        return None
    addresses = [info[4][0] for info in infos]
    if not addresses or not all(_is_public_ip(addr) for addr in addresses):
        return None
    return addresses[0]


def is_public_url(url: str) -> bool:
    """A quick answer for the form: an https URL whose host resolves only to public addresses."""
    try:
        parsed = urlparse(url if "://" in url else f"https://{url}")
    except ValueError:
        return False
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    return resolve_public_address(parsed.hostname) is not None


class _PublicOnlyBackend(httpcore.AsyncNetworkBackend):
    """Connects only to an address resolved and checked at the moment of connecting."""

    def __init__(self) -> None:
        self._inner = httpcore.AnyIOBackend()

    async def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        address = await anyio.to_thread.run_sync(resolve_public_address, host)
        if address is None:
            raise httpcore.ConnectError(f"{host} does not resolve to a public address")
        return await self._inner.connect_tcp(
            address, port, timeout=timeout, local_address=local_address, socket_options=socket_options
        )

    async def connect_unix_socket(self, path, timeout=None, socket_options=None):
        raise httpcore.ConnectError("Unix sockets are not reachable from the probe")

    async def sleep(self, seconds: float) -> None:
        await self._inner.sleep(seconds)


def probe_client(timeout: float = 10) -> httpx.AsyncClient:
    """
    The HTTP client every owner-supplied URL goes through.

    httpx 0.27 has no public hook for the network backend, so the transport's pool is
    replaced with one built on the guarded backend; requirements.txt pins httpx, and
    tests/test_probe_guard.py fails if that ever stops taking effect.
    """
    transport = httpx.AsyncHTTPTransport(retries=0)
    transport._pool = httpcore.AsyncConnectionPool(
        ssl_context=httpx.create_ssl_context(),
        network_backend=_PublicOnlyBackend(),
        retries=0,
    )
    return httpx.AsyncClient(transport=transport, timeout=timeout, follow_redirects=False)


async def read_capped(response: httpx.Response, limit: int = MAX_PROBE_BODY_BYTES) -> str:
    """At most `limit` bytes of a streamed response's body, decoded leniently."""
    chunks: list[bytes] = []
    size = 0
    async for chunk in response.aiter_bytes():
        chunks.append(chunk)
        size += len(chunk)
        if size >= limit:
            break
    return b"".join(chunks)[:limit].decode("utf-8", errors="replace")
