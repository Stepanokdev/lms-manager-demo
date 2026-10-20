"""
The LMS probe fetches addresses strangers type in, from inside our network.

These tests pin what it refuses: anything that resolves to a non-public address,
at check time or at connect time, and redirects. They run without the internet:
name resolution is replaced, and the one real connection attempt targets a
listener on 127.0.0.1 that must never see a byte.
"""
import asyncio
import socket
import ssl
import threading

import httpx
import pytest

from app import netguard


def _fake_dns(mapping: dict[str, list[str]]):
    def getaddrinfo(host, *args, **kwargs):
        if host not in mapping:
            raise socket.gaierror(f"unknown host {host}")
        return [
            (socket.AF_INET6 if ":" in ip else socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 0))
            for ip in mapping[host]
        ]
    return getaddrinfo


@pytest.mark.parametrize(
    "addresses",
    [
        ["127.0.0.1"],
        ["10.1.2.3"],
        ["172.16.0.9"],
        ["192.168.1.1"],
        ["169.254.169.254"],
        ["100.64.0.1"],
        ["0.0.0.0"],
        ["::1"],
        ["fd00::1"],
        ["fe80::1"],
        ["::ffff:10.0.0.1"],
        ["93.184.216.34", "10.0.0.1"],  # one private answer is enough to refuse
    ],
)
def test_non_public_addresses_are_refused(monkeypatch, addresses):
    monkeypatch.setattr(netguard.socket, "getaddrinfo", _fake_dns({"lms.example.edu": addresses}))

    assert netguard.resolve_public_address("lms.example.edu") is None
    assert not netguard.is_public_url("https://lms.example.edu")


def test_a_public_address_is_allowed_over_https_only(monkeypatch):
    monkeypatch.setattr(netguard.socket, "getaddrinfo", _fake_dns({"lms.example.edu": ["93.184.216.34"]}))

    assert netguard.is_public_url("https://lms.example.edu")
    assert not netguard.is_public_url("http://lms.example.edu")
    assert not netguard.is_public_url("file:///etc/passwd")


def test_an_unresolvable_name_is_refused(monkeypatch):
    monkeypatch.setattr(netguard.socket, "getaddrinfo", _fake_dns({}))

    assert not netguard.is_public_url("https://nowhere.example.edu")


def test_a_name_that_turns_private_after_the_check_is_never_connected_to(monkeypatch):
    """DNS rebinding: public when the form checks it, loopback when the probe connects."""
    seen = []
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    listener.listen()
    listener.settimeout(2)
    port = listener.getsockname()[1]

    def accept():
        try:
            conn, _ = listener.accept()
            seen.append(conn)
        except OSError:
            pass

    thread = threading.Thread(target=accept, daemon=True)
    thread.start()
    answers = iter([["93.184.216.34"], ["127.0.0.1"], ["127.0.0.1"]])

    def rebinding(host, *args, **kwargs):
        ips = next(answers, ["127.0.0.1"])
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 0)) for ip in ips]

    monkeypatch.setattr(netguard.socket, "getaddrinfo", rebinding)
    assert netguard.is_public_url("https://rebind.example.edu")  # the form's check passes

    async def fetch():
        async with netguard.probe_client(timeout=2) as client:
            await client.get(f"https://rebind.example.edu:{port}/")

    with pytest.raises(httpx.ConnectError):
        asyncio.run(fetch())
    listener.close()
    thread.join(timeout=3)
    assert seen == []


def test_the_probe_follows_no_redirects_and_verifies_tls():
    client = netguard.probe_client()
    try:
        assert client.follow_redirects is False
        pool = client._transport._pool
        assert isinstance(pool._network_backend, netguard._PublicOnlyBackend)
        assert pool._ssl_context.verify_mode == ssl.CERT_REQUIRED
        assert pool._ssl_context.check_hostname is True
    finally:
        asyncio.run(client.aclose())


def test_a_probe_body_is_read_only_up_to_the_cap():
    big = b"x" * (netguard.MAX_PROBE_BODY_BYTES * 4)

    async def run():
        transport = httpx.MockTransport(lambda request: httpx.Response(200, content=big))
        async with httpx.AsyncClient(transport=transport) as client:
            async with client.stream("GET", "https://lms.example.edu/") as response:
                return await netguard.read_capped(response)

    assert len(asyncio.run(run())) == netguard.MAX_PROBE_BODY_BYTES
