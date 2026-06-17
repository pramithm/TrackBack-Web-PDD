/**
 * Setup test output directories before running Appium tests.
 * Called via `pretest` npm hook.
 */
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIRS = [
  'Test Results',
  'Test Results/HTML',
  'Test Results/Excel',
  'Test Results/Screenshots',
  'Test Results/Logs',
  'Test Results/Summary',
];

DIRS.forEach(d => {
  fs.mkdirSync(path.join(ROOT, d), { recursive: true });
});

// Clean up existing results JSON if present
const resultsFilePath = path.join(ROOT, 'Test Results/recorded-results.json');
if (fs.existsSync(resultsFilePath)) {
  try {
    fs.unlinkSync(resultsFilePath);
    console.log('🧹 Cleaned up old recorded-results.json');
  } catch (err) {
    console.warn(`⚠️ Could not delete old results file: ${err.message}`);
  }
}

console.log('📁 Test output directories created.');
