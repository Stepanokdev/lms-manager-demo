#!/usr/bin/env bash
# Run all four Profile-tab cases and fail if any of them is wrong.
#
#   iOS      + document → reporting hidden      iOS      + service → reporting offered
#   Android  + document → reporting hidden      Android  + service → reporting offered
#
# The service runs are deliberately NOT fresh installs: each follows its own
# document run with the app's data intact, which is the upgrade path where the
# platform picker never runs again and a remembered answer would go unchallenged.
#
# Needs a booted simulator and a running emulator. Restores every config file it
# edits, whatever happens.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY="$(cd "$HERE/../.." && pwd)"
IOS_REPO="${IOS_REPO:-$REGISTRY/../openedx-app-ios}"
ANDROID_REPO="${ANDROID_REPO:-$REGISTRY/../../openedx-app-android}"
SIMULATOR="${SIMULATOR:-iPhone 17 Pro}"
WORK="$(mktemp -d)"
SHOTS="${SHOTS:-$WORK/shots}"
mkdir -p "$SHOTS"

IOS_CONFIG="$IOS_REPO/default_config/dev/config.yaml"
ANDROID_CONFIG="$ANDROID_REPO/default_config/dev/config.yaml"
ANDROID_DEBUG_MANIFEST="$ANDROID_REPO/app/src/debug/AndroidManifest.xml"

fail() { echo "‼️  $*" >&2; exit 1; }
step() { echo; echo "── $*"; }

[ -d "$IOS_REPO" ] || fail "no iOS repo at $IOS_REPO (set IOS_REPO)"
[ -d "$ANDROID_REPO" ] || fail "no Android repo at $ANDROID_REPO (set ANDROID_REPO)"
command -v adb >/dev/null || fail "adb is not on PATH"
xcrun simctl list devices booted | grep -q "$SIMULATOR" || fail "no booted simulator named '$SIMULATOR'"
adb devices | grep -qw device || fail "no Android device or emulator attached"

cp "$IOS_CONFIG" "$WORK/ios-config.yaml"
cp "$ANDROID_CONFIG" "$WORK/android-config.yaml"
HAD_DEBUG_MANIFEST=$([ -f "$ANDROID_DEBUG_MANIFEST" ] && echo yes || echo no)

cleanup() {
    local code=$?
    cp "$WORK/ios-config.yaml" "$IOS_CONFIG" 2>/dev/null || true
    cp "$WORK/android-config.yaml" "$ANDROID_CONFIG" 2>/dev/null || true
    [ "$HAD_DEBUG_MANIFEST" = no ] && rm -f "$ANDROID_DEBUG_MANIFEST"
    rmdir "$(dirname "$ANDROID_DEBUG_MANIFEST")" 2>/dev/null || true
    [ -n "${DOC_PID:-}" ] && kill "$DOC_PID" 2>/dev/null || true
    [ -n "${REG_PID:-}" ] && kill "$REG_PID" 2>/dev/null || true
    # The stub reports what it was asked for that it did not recognise, and exits
    # non-zero if there was anything. A pass has to be a pass on its terms too.
    if [ -n "${STUB_PID:-}" ]; then
        kill -TERM "$STUB_PID" 2>/dev/null || true
        if ! wait "$STUB_PID"; then
            echo "‼️  the stub was asked for routes it does not know — see above" >&2
            code=1
        fi
    fi
    echo; [ "$code" = 0 ] && echo "✅ all four cases behaved" || echo "❌ failed (exit $code)"
    exit "$code"
}
trap cleanup EXIT

set_directory() {  # <config file> <url>
    python3 - "$1" "$2" <<'PY'
import re, sys
path, url = sys.argv[1], sys.argv[2]
text = open(path).read()
text = re.sub(r'(DIRECTORY_URL:\s*)".*?"', lambda m: m.group(1) + f'"{url}"', text, count=1)
text = re.sub(r'(DIRECTORY_MODE:\s*)".*?"', lambda m: m.group(1) + '""', text, count=1)
open(path, "w").write(text)
PY
}

step "starting the stub LMS, the document, and a registry in search mode"
python3 "$HERE/stub_lms.py" 8099 & STUB_PID=$!
(cd "$HERE" && python3 -m http.server 8100 >/dev/null 2>&1) & DOC_PID=$!
(cd "$REGISTRY" && DATABASE_URL="sqlite:///$WORK/verify.db" SEED_DEMO=1 MODE=search \
    SECRET_KEY=verification .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8101 >"$WORK/registry.log" 2>&1) & REG_PID=$!
sleep 5
curl -sf http://127.0.0.1:8100/directory-ios.json >/dev/null || fail "the document is not being served"
curl -sf http://127.0.0.1:8101/api/v1/config >/dev/null || fail "the registry did not start (see $WORK/registry.log)"

# One platform, pointing at the stub, so the registry can be signed in through.
python3 - "$WORK/verify.db" <<'PY'
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
db.execute("DELETE FROM lms_instances WHERE id <> 1")
db.execute("""UPDATE lms_instances SET base_url='http://10.0.2.2:8099', name='Stub College',
              platform_name='Stub College', description='Stub platform', accent_color='#2e7d32',
              status='approved', visibility='public' WHERE id = 1""")
db.commit()
PY

ios_case() {  # <url> <expect reporting> <fresh?>
    local url="$1" expect="$2" fresh="$3"
    set_directory "$IOS_CONFIG" "$url"
    [ "$fresh" = fresh ] && xcrun simctl uninstall booted org.openedx.app.dev >/dev/null 2>&1 || true
    TEST_RUNNER_LMS_DIRECTORY_UITEST=1 \
    TEST_RUNNER_EXPECT_REPORTING="$expect" \
    TEST_RUNNER_LMS_PLATFORM="Stub College" \
    TEST_RUNNER_LMS_USERNAME="night_tester@example.com" \
    TEST_RUNNER_LMS_PASSWORD="stubpassword" \
    xcodebuild -workspace "$IOS_REPO/OpenEdX.xcworkspace" -scheme OpenEdXDev \
        -configuration DebugDev -destination "platform=iOS Simulator,name=$SIMULATOR" \
        -only-testing:LMSDirectoryUITests test >"$WORK/ios-$expect.log" 2>&1 \
        || { tail -40 "$WORK/ios-$expect.log"; fail "iOS case (expect reporting=$expect) failed"; }
    grep -q "with 1 test skipped" "$WORK/ios-$expect.log" && fail "the iOS test skipped instead of running"
    echo "   iOS ok (expect reporting=$expect)"
}

android_case() {  # <url> <expect reporting> <fresh?>
    local url="$1" expect="$2" fresh="$3"
    set_directory "$ANDROID_CONFIG" "$url"
    mkdir -p "$(dirname "$ANDROID_DEBUG_MANIFEST")"
    cat > "$ANDROID_DEBUG_MANIFEST" <<'MANIFEST'
<?xml version="1.0" encoding="utf-8"?>
<!-- Verification only: lets a debug build reach a plain-HTTP stub on the host. -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
    <application
        android:usesCleartextTraffic="true"
        tools:replace="android:usesCleartextTraffic" />
</manifest>
MANIFEST
    (cd "$ANDROID_REPO" && ./gradlew --console=plain :app:assembleDevelopDebug) >"$WORK/android-build-$expect.log" 2>&1 \
        || { tail -30 "$WORK/android-build-$expect.log"; fail "Android build failed"; }
    adb install -r -d "$ANDROID_REPO/app/build/outputs/apk/develop/debug/app-develop-debug.apk" >/dev/null
    local flags=(--expect-reporting "$expect" --shot "$SHOTS/android-$expect.png")
    [ "$fresh" = fresh ] && flags+=(--fresh)
    python3 "$HERE/drive_android.py" "${flags[@]}" || fail "Android case (expect reporting=$expect) failed"
    echo "   Android ok (expect reporting=$expect)"
}

step "iOS: a document offers no reporting"
ios_case "http://127.0.0.1:8100/directory-ios.json" 0 fresh

step "iOS: the same install, now reading a service, offers it again"
ios_case "http://127.0.0.1:8101" 1 keep

step "Android: a document offers no reporting"
android_case "http://10.0.2.2:8100/directory-android.json" 0 fresh

step "Android: the same install, now reading a service, offers it again"
android_case "http://10.0.2.2:8101" 1 keep

echo; echo "screenshots in $SHOTS"
