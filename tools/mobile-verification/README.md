# Checking the Profile tab without an LMS account

The apps only show "Report this LMS" when the directory comes from a live
service. Whether that holds can only be seen from inside a signed-in app, and
signing in needs an Open edX server — which is why this exists: `stub_lms.py`
answers the handful of endpoints the sign-in flow calls, accepts any password,
and lets the app reach the Profile tab against nothing at all.

Nothing here ships. It lives in this repo because the behaviour it checks is the
contract between this registry and the two apps.

## What was checked, and what it showed

Both apps, both ways of reading a directory, signed in, screenshots in
`evidence/`:

| build reads | iOS | Android |
| --- | --- | --- |
| a document (`…/directory.json`) | no reporting | no reporting |
| a live service | reporting offered | reporting offered |

The second row is the one worth explaining. Each app was **first** run against
the document, so it recorded "this directory is curated", and **then** rebuilt
against a service **without clearing its data** — the upgrade path where the
platform picker never runs again and nothing would overwrite that answer. The
entry point came back, which is what the source-stamped state is for.

## Running it

```bash
python3 stub_lms.py 8099          # the stand-in LMS
python3 -m http.server 8100       # serving directory-*.json, from this folder
```

iOS reaches the host as `127.0.0.1`; the Android emulator as `10.0.2.2`, which
is why there are two documents.

In the app's `default_config/dev/config.yaml`:

```yaml
LMS_DIRECTORY:
  ENABLED: true
  DIRECTORY_URL: "http://127.0.0.1:8100/directory-ios.json"   # or a service base URL
```

For the service side, run this registry with `MODE=search` and point its one LMS
row at the stub.

**iOS** needs `LMSDirectoryProfileUITests.swift` in a UI-test target, and the
simulator's hardware keyboard connected (Simulator → I/O → Keyboard). Two things
cost an hour to learn and are worth keeping: `XCUIApplication.typeText` never
reaches a SwiftUI `SecureField`, so the test taps the screen's own reveal button
and types into the plain field it becomes; and with the hardware keyboard off,
whatever language the software keyboard happens to be in silently eats Latin
text. Pass the expectation in as `TEST_RUNNER_EXPECT_REPORTING=1|0`.

**Android** needs `android:usesCleartextTraffic="true"` in a debug manifest to
talk to a plain-HTTP stub, and drives with `adb shell input tap`.
