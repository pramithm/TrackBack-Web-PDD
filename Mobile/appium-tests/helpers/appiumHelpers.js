/**
 * TrackBack Android – Appium Helper Utilities
 * Shared functions for screenshot capture, element waiting, etc.
 */

const fs   = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../Test Results/Screenshots');
const LOG_DIR        = path.resolve(__dirname, '../Test Results/Logs');

// Results store for report generation
const testResults = [];

/**
 * Ensure output directories exist.
 */
function ensureDirs() {
  [
    SCREENSHOT_DIR,
    LOG_DIR,
    path.resolve(__dirname, '../Test Results/HTML'),
    path.resolve(__dirname, '../Test Results/Excel'),
    path.resolve(__dirname, '../Test Results/Summary'),
  ].forEach(d => fs.mkdirSync(d, { recursive: true }));
}

/**
 * Take a screenshot and save with a timestamp.
 * @param {WebdriverIO.Browser} driver
 * @param {string} name – descriptive name (no extension)
 * @returns {string} absolute path to saved PNG
 */
async function takeScreenshot(driver, name) {
  ensureDirs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename  = `${name}_${timestamp}.png`;
  const filepath  = path.join(SCREENSHOT_DIR, filename);
  try {
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync(filepath, Buffer.from(screenshot, 'base64'));
    console.log(`  📸 Screenshot: ${filename}`);
  } catch (err) {
    console.warn(`  ⚠️  Screenshot failed: ${err.message}`);
  }
  return `Screenshots/${filename}`;
}

/**
 * Record a test result.
 */
function recordResult({ name, status, duration, error, screenshotPath }) {
  ensureDirs();
  const resultsFilePath = path.resolve(__dirname, '../Test Results/recorded-results.json');
  
  let currentResults = [];
  if (fs.existsSync(resultsFilePath)) {
    try {
      currentResults = JSON.parse(fs.readFileSync(resultsFilePath, 'utf8'));
    } catch (e) {
      currentResults = [];
    }
  }

  const newResult = {
    name,
    status,        // 'passed' | 'failed' | 'skipped'
    duration,
    error: error ? String(error.message || error) : null,
    screenshotPath: screenshotPath || null,
    timestamp: new Date().toISOString(),
  };

  const existingIndex = currentResults.findIndex(r => r.name === name);
  if (existingIndex > -1) {
    currentResults[existingIndex] = newResult;
  } else {
    currentResults.push(newResult);
  }

  fs.writeFileSync(resultsFilePath, JSON.stringify(currentResults, null, 2), 'utf8');
  
  // Also keep in-memory representation for compatibility
  testResults.push(newResult);
}

/**
 * Sleep for ms milliseconds.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get all recorded test results (used by report generator).
 */
function getResults() {
  return [...testResults];
}

module.exports = { ensureDirs, takeScreenshot, recordResult, sleep, getResults, testResults };
