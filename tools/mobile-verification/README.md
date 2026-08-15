# Checking the Profile tab without an LMS account

The apps only offer "Report this LMS" when the directory is a live catalog that
has said it is open to anyone. Whether that holds can only be seen from inside a
signed-in app, and signing in needs an Open edX server.

`stub_lms.py` is a stand-in for one. It is a **regression double, not a
substitute for a real deployment**: it knows one account, rejects every other
credential, answers 404 to any route it was not written for, and exits non-zero
if it was asked for anything unrecognised — so a run cannot pass by having been
agreeable. What it proves is that the app's own logic behaves; what it cannot
prove is that a real Open edX behaves the way this stub does. `BLOCKED.md`
records the access still wanted for that.

## Running it

```bash
./run-all.sh
```

Needs a booted iOS simulator and a running Android emulator, and takes a few
minutes. It starts the stub, a document, and a registry in search mode, then
drives all four cases and fails if any of them is wrong. Every config file it
edits is restored on the way out, including on failure.

Override `IOS_REPO`, `ANDROID_REPO`, `SIMULATOR` or `SHOTS` if your checkout is
laid out differently. The script refuses to start rather than half-run when a
prerequisite is missing.

## The four cases

| build reads | expected |
| --- | --- |
| iOS, a document (`…/directory.json`) | reporting hidden |
| iOS, a live service — **same install, data kept** | reporting offered |
| Android, a document | reporting hidden |
| Android, a live service — **same install, data kept** | reporting offered |

The two "data kept" rows are the point. Each follows its own document run
without wiping the app, which is the upgrade path where a platform is already
selected, the picker never runs again, and nothing would overwrite what the
previous directory said. Getting reporting back there is what the launch-time
mode refresh and the source-stamped state exist to do.

Screenshots of all four are in `evidence/`, taken by the run itself.

## What drives each app

**iOS** — `LMSDirectoryUITests` in the iOS repository, which this script builds
and runs. It skips itself unless `TEST_RUNNER_LMS_DIRECTORY_UITEST=1` is set,
because it drives a real sign-in and has nothing to say otherwise; the script
sets that along with `TEST_RUNNER_EXPECT_REPORTING`, the platform name and the
credentials. Two things cost an hour to learn and are worth keeping:
`XCUIApplication.typeText` never reaches a SwiftUI `SecureField`, so the test
taps the screen's own reveal button and types into the plain field it becomes;
and with the simulator's hardware keyboard disconnected, whatever language the
software keyboard happens to be in silently eats Latin text (Simulator → I/O →
Keyboard → Connect Hardware Keyboard).

**Android** — `drive_android.py`, which reads the screen through `uiautomator
dump` and asserts on what was rendered rather than on where a finger landed. It
needs `android:usesCleartextTraffic="true"` to reach a plain-HTTP stub, which
the script writes into a debug manifest and removes afterwards.

iOS reaches the host as `127.0.0.1` and the Android emulator as `10.0.2.2`,
which is why there are two documents.
