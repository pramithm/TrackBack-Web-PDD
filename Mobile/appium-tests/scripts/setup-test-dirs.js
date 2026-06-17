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

console.log('📁 Test output directories created.');
