#!/bin/bash
# ─── Setup directories ────────────────────────────────────────────────────────
mkdir -p "Test Results/Logs" "Test Results/Screenshots" "Test Results/Excel" "Test Results/Summary" "Test Results/HTML"

# ─── Start Appium in background ───────────────────────────────────────────────
appium --log appium.log --log-level info &
APPIUM_PID=$!

# ─── Start logcat in background ───────────────────────────────────────────────
adb logcat -v time > android_logcat.log &
LOGCAT_PID=$!

# ─── Wait for Appium to start on port 4723 ───────────────────────────────────
echo "Waiting for Appium server to start..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:4723/status > /dev/null; then
    echo "✅ Appium server is up and running!"
    break
  fi
  echo "Waiting..."
  sleep 2
done

# ─── Run tests and capture exit code ─────────────────────────────────────────
# NODE_OPTIONS: treat unhandled rejections as warnings (not crashes) so they
# appear in the log but do NOT cause Mocha to exit with code 3 (UNCAUGHT_EXCEPTION).
# Mocha --exit forces Node.js to terminate after all tests complete, preventing
# in-flight WebdriverIO polling timers from throwing uncaught exceptions.
set +e
NODE_OPTIONS="--unhandled-rejections=warn" npm run test:ci
TEST_EXIT_CODE=$?
set -e

echo "🔚 Mocha exited with code: $TEST_EXIT_CODE"

# ─── Clean up Appium and Logcat ───────────────────────────────────────────────
kill $APPIUM_PID 2>/dev/null || true
kill $LOGCAT_PID 2>/dev/null || true

# ─── Copy raw logs into Test Results directory ───────────────────────────────
cp appium.log "Test Results/Logs/" 2>/dev/null || true
cp android_logcat.log "Test Results/Logs/" 2>/dev/null || true

# ─── NOTE: The following Android emulator messages during shutdown are NORMAL ─
# "ERROR | stop: Not implemented"
# "WARNING | Emulator client has not yet been configured"
# "INFO | removeAll"
# These are internal QEMU/Android emulator stderr messages produced during
# 'adb emu kill'. They do NOT indicate test failures and can be safely ignored.

# ─── Exit with test status ────────────────────────────────────────────────────
exit $TEST_EXIT_CODE
