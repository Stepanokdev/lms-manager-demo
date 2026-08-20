"""
Drive the Android app to the Profile tab and assert on the reporting entry point.

The Android counterpart of the iOS UI test: it signs in against the stub LMS,
opens Profile, and exits non-zero unless "Report this LMS" is in the state the
caller says it should be. Reads the screen through `uiautomator dump`, so it
asserts on what the app actually rendered rather than on where a finger landed.

    python3 drive_android.py --expect-reporting 1 [--fresh] [--shot out.png]

`--fresh` wipes app data first; leaving it off is what reproduces the upgrade
case, where a platform is already selected and the picker never runs again.
"""
import argparse
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

PACKAGE = "org.openedx.app"
PLATFORM = "Stub College"
USERNAME = "night_tester@example.com"
PASSWORD = "stubpassword"
REPORTING = "Report this LMS"
PROFILE_MARKER = "Edit Profile"


def adb(*args: str, binary: bool = False):
    result = subprocess.run(
        ["adb", *args],
        capture_output=True,
        check=False,
    )
    if result.returncode != 0 and not binary:
        raise SystemExit(f"adb {' '.join(args)} failed: {result.stderr.decode(errors='replace')}")
    return result.stdout if binary else result.stdout.decode(errors="replace")


def screen() -> ET.Element:
    """The current view hierarchy, as the accessibility layer sees it."""
    adb("shell", "uiautomator", "dump", "/sdcard/window_dump.xml")
    return ET.fromstring(adb("shell", "cat", "/sdcard/window_dump.xml").strip())


def find(root: ET.Element, text: str, clickable: bool = False):
    """
    The node showing `text`.

    `clickable` matters more than it looks: the sign-in screen's title and its
    button both read "Sign in", and the title comes first.
    """
    matches = [
        node for node in root.iter("node")
        if node.get("text") == text or node.get("content-desc") == text
    ]
    if clickable:
        matches = [n for n in matches if n.get("clickable") == "true"] or matches[-1:]
    return matches[0] if matches else None


def centre(node: ET.Element) -> tuple[int, int]:
    left, top, right, bottom = map(int, re.findall(r"-?\d+", node.get("bounds")))
    return (left + right) // 2, (top + bottom) // 2


def tap(node: ET.Element) -> None:
    x, y = centre(node)
    adb("shell", "input", "tap", str(x), str(y))


def wait_for(text: str, timeout: int = 40, clickable: bool = False):
    deadline = time.time() + timeout
    while time.time() < deadline:
        node = find(screen(), text, clickable=clickable)
        if node is not None:
            return node
        time.sleep(2)
    return None


def type_into(placeholder: str, value: str, attempts: int = 3) -> None:
    """
    Put `value` in the field showing `placeholder`, and check that it landed.

    `adb shell input text` drops and doubles characters often enough to matter —
    a doubled first letter once sent the stub a username it rightly rejected,
    which surfaced as "never signed in" three steps later. So: clear, type, read
    the field back, and try again rather than carrying on with a half-typed word.
    """
    for attempt in range(attempts):
        field = find(screen(), placeholder)
        if field is None:
            field = find_by_prefix(value)
        if field is None:
            raise SystemExit(f"no field for {placeholder!r}")
        tap(field)
        time.sleep(1)
        adb("shell", "input", "keyevent", "KEYCODE_MOVE_END")
        for _ in range(len(value) + 8):
            adb("shell", "input", "keyevent", "KEYCODE_DEL")
        adb("shell", "input", "text", value)
        time.sleep(1)
        if find(screen(), value) is not None:
            return
        print(f"retyping {placeholder!r} (attempt {attempt + 1} did not land)", file=sys.stderr)
    raise SystemExit(f"could not type into {placeholder!r}")


def find_by_prefix(value: str):
    """The field already holding part of what we tried to type."""
    for node in screen().iter("node"):
        text = node.get("text") or ""
        if text and (value.startswith(text) or text.startswith(value[:4])):
            return node
    return None


def sign_in() -> None:
    if wait_for("Enter email or username", timeout=20) is None:
        raise SystemExit("sign-in form never appeared")
    type_into("Enter email or username", USERNAME)

    # The password renders as dots, so it cannot be read back the same way; its
    # length is the most the screen will admit to.
    password = find(screen(), "Enter password")
    if password is None:
        raise SystemExit("password field never appeared")
    tap(password)
    time.sleep(1)
    adb("shell", "input", "text", PASSWORD)
    time.sleep(1)

    # The keyboard covers the button; put it away before reaching for it.
    adb("shell", "input", "keyevent", "4")
    time.sleep(1)
    button = find(screen(), "Sign in", clickable=True)
    if button is None:
        raise SystemExit("no sign-in button")
    tap(button)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expect-reporting", choices=["0", "1"], required=True)
    parser.add_argument("--fresh", action="store_true", help="wipe app data first")
    parser.add_argument("--shot", help="where to save a screenshot of the Profile tab")
    args = parser.parse_args()
    expected = args.expect_reporting == "1"

    if args.fresh:
        adb("shell", "pm", "clear", PACKAGE)
    else:
        adb("shell", "am", "force-stop", PACKAGE)

    adb("shell", "monkey", "-p", PACKAGE, "-c", "android.intent.category.LAUNCHER", "1")

    # Wait for the app to settle on one of the two screens it can start on
    # rather than for a fixed number of seconds: a freshly installed build takes
    # its time, and tapping a list that is still drawing does nothing at all.
    deadline = time.time() + 60
    platform = None
    while time.time() < deadline:
        current = screen()
        platform = find(current, PLATFORM)
        if platform is not None or find(current, "Profile", clickable=True) is not None:
            break
        time.sleep(2)

    # A signed-in build skips the picker entirely — the case that matters most.
    if platform is not None:
        for attempt in range(3):
            tap(platform)
            if wait_for("Enter email or username", timeout=15) is not None:
                break
            print(f"the platform row did not open (attempt {attempt + 1})", file=sys.stderr)
            found = find(screen(), PLATFORM)
            if found is not None:
                platform = found
        # Submitting is its own retry: the button sits under the keyboard, and a
        # tap that lands on the keyboard instead looks exactly like a slow login.
        for attempt in range(3):
            sign_in()
            if wait_for("Profile", timeout=25, clickable=True) is not None:
                break
            if find(screen(), "Enter email or username") is None:
                break
            print(f"still on the sign-in screen (attempt {attempt + 1})", file=sys.stderr)

    profile_tab = wait_for("Profile", timeout=40, clickable=True)
    if profile_tab is None:
        raise SystemExit("never signed in: no Profile tab")
    tap(profile_tab)

    if wait_for(PROFILE_MARKER, timeout=30) is None:
        raise SystemExit("Profile tab never rendered")

    present = find(screen(), REPORTING) is not None

    if args.shot:
        with open(args.shot, "wb") as handle:
            handle.write(adb("exec-out", "screencap", "-p", binary=True))

    if present != expected:
        print(f"FAIL reporting present={present}, expected={expected}", file=sys.stderr)
        return 1
    print(f"ok: reporting present={present}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
