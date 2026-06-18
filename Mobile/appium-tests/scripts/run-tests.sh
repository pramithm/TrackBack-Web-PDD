#!/bin/bash
# Create logs and screenshots dirs
mkdir -p "Test Results/Logs" "Test Results/Screenshots" "Test Results/Excel" "Test Results/Summary" "Test Results/HTML"

# Start Appium in background
appium --log appium.log --log-level info &
APPIUM_PID=$!

# Start logcat in background
adb logcat -v time > android_logcat.log &
LOGCAT_PID=$!

# Wait for Appium to start on port 4723
echo "Waiting for Appium server to start..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:4723/status > /dev/null; then
    echo "✅ Appium server is up and running!"
    break
  fi
  echo "Waiting..."
  sleep 2
done

# Run tests and capture exit code
set +e
npm run test:ci
TEST_EXIT_CODE=$?
set -e

# Clean up Appium and Logcat
kill $APPIUM_PID 2>/dev/null || true
kill $LOGCAT_PID 2>/dev/null || true

# Copy raw logs into Test Results directory
cp appium.log "Test Results/Logs/" 2>/dev/null || true
cp android_logcat.log "Test Results/Logs/" 2>/dev/null || true

# Exit with test status
exit $TEST_EXIT_CODE
