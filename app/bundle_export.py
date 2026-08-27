"""
Export a directory as a zip: the document plus the images it points at.

The point is to remove the fiddly half of shipping a directory inside an app.
Downloading the JSON is easy; hunting down every logo, saving it, renaming it and
editing the file to match is not. This does that part.

Only images this deployment hosts are packed. A field pointing somewhere else is
left as the address it already was — the server does not fetch arbitrary URLs on
someone's behalf, because an endpoint that did would be a way to make this server
issue requests to anywhere its network can reach.
"""
import io
import re
import zipfile
from pathlib import Path

UPLOAD_ROOT = Path("data/uploads")
UPLOAD_PREFIX = "/uploads/"

# Fields that hold an image, and the stem each one gets in the zip.
_IMAGE_FIELDS = [
    (("logo",), "logo"),
    (("theme", "login_background"), "background"),
]

README = """This is your directory, ready to ship inside your app.

  lms_directory.json   the platform list
  *.png / *.jpg / …    the images it refers to

The JSON refers to the images by file name, so keep them together.

iOS
  1. Drag every file in this folder into your app target in Xcode
     (tick "Copy items if needed" and your app target).
  2. In default_config/<env>/config.yaml:

       LMS_DIRECTORY:
         ENABLED: true
         DIRECTORY_URL: ""
         DIRECTORY_FILE: "lms_directory.json"

Android
  1. Copy every file in this folder into app/src/main/assets/.
  2. In default_config/<env>/config.yaml:

       LMS_DIRECTORY:
         ENABLED: true
         DIRECTORY_URL: ""
         DIRECTORY_FILE: "lms_directory.json"

Rebuild, and the app reads its platform list from the file. It asks the network
for nothing, so it works on a device that has never been online.

To go back to a hosted list, clear DIRECTORY_FILE and put your directory URL in
DIRECTORY_URL instead.

The two are the same list in the same format, but not the same file: this copy
has its image fields rewritten to the file names beside it, and each download
carries its own generated_at. Whichever you use, the app reads it the same way.

{external_note}"""

EXTERNAL_NOTE = """One note: {count} image{plural} in this directory {verb} hosted somewhere
other than the registry, so {they} could not be packed. {their} address{es} {are}
still in the JSON and will be downloaded at runtime. To make this bundle fully
offline, save {them} next to this file and replace the address with the file name.
"""


def _safe_stem(value: str) -> str:
    """A file name that is recognisable in Finder and safe in a zip."""
    cleaned = re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower()).strip("-")
    return cleaned or "platform"


def _read_hosted_image(relative_url: str) -> tuple[bytes, str] | None:
    """
    Read an image this deployment hosts.

    `relative_url` comes from our own upload endpoint, but it is still resolved
    against the upload directory and checked, so a crafted value cannot walk out
    of it and read something else.
    """
    if not relative_url.startswith(UPLOAD_PREFIX):
        return None
    name = relative_url[len(UPLOAD_PREFIX):]
    if not name:
        return None
    root = UPLOAD_ROOT.resolve()
    try:
        path = (root / name).resolve()
        path.relative_to(root)
    except (ValueError, OSError):
        return None
    if not path.is_file():
        return None
    try:
        return path.read_bytes(), path.suffix or ".png"
    except OSError:
        return None


def _get(node: dict, path: tuple[str, ...]):
    for key in path[:-1]:
        node = node.get(key) or {}
        if not isinstance(node, dict):
            return None
    return node.get(path[-1])


def _set(node: dict, path: tuple[str, ...], value):
    for key in path[:-1]:
        nxt = node.get(key)
        if not isinstance(nxt, dict):
            return
        node = nxt
    node[path[-1]] = value


def build_zip(document: dict, origin: str) -> bytes:
    """
    Pack `document` and its hosted images into a zip.

    `document` must carry image fields as this deployment stores them — relative
    "/uploads/..." paths for hosted images — so the caller builds it with an empty
    origin. Anything left relative after packing is turned into a real address, so
    the file never ships a path that means nothing outside this server.
    """
    doc = _clone(document)
    files: dict[str, bytes] = {}
    used: set[str] = set()
    external = 0

    entries: list[tuple[dict, str]] = [
        (platform, _safe_stem(platform.get("name") or platform.get("url") or ""))
        for platform in doc.get("include", [])
    ]
    provider = doc.get("provider")
    if isinstance(provider, dict):
        entries.append((provider, "provider"))

    for node, stem in entries:
        for path, suffix in _IMAGE_FIELDS:
            value = _get(node, path)
            if not isinstance(value, str) or not value:
                continue
            hosted = _read_hosted_image(value)
            if hosted is None:
                if value.startswith("/"):
                    # Relative but not something we hold: make it addressable.
                    _set(node, path, origin.rstrip("/") + value)
                else:
                    external += 1
                continue
            data, ext = hosted
            name = f"{stem}-{suffix}{ext}"
            counter = 2
            while name in used and files.get(name) != data:
                name = f"{stem}-{suffix}-{counter}{ext}"
                counter += 1
            used.add(name)
            files[name] = data
            _set(node, path, name)

    note = ""
    if external:
        note = EXTERNAL_NOTE.format(
            count=external,
            plural="" if external == 1 else "s",
            verb="is" if external == 1 else "are",
            they="it" if external == 1 else "they",
            their="Its" if external == 1 else "Their",
            es="" if external == 1 else "es",
            are="is" if external == 1 else "are",
            them="it" if external == 1 else "them",
        )

    import json

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("lms_directory.json", json.dumps(doc, indent=2, ensure_ascii=False))
        archive.writestr("README.txt", README.format(external_note=note).rstrip() + "\n")
        for name, data in sorted(files.items()):
            archive.writestr(name, data)
    return buffer.getvalue()


def _clone(value):
    """Deep copy through plain containers — the document is JSON, nothing else."""
    if isinstance(value, dict):
        return {k: _clone(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_clone(v) for v in value]
    return value
