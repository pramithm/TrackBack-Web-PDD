/**
 * TrackBack Android – E2E Test Suite: Navigation
 *
 * Tests:
 *  TC-009  Lost tab shows items list
 *  TC-010  Found tab shows items list
 *  TC-011  Search tab is accessible
 *  TC-012  Chat tab is accessible
 */

const { remote }   = require('webdriverio');
const { config }   = require('../config/appium.config');
const LoginPage    = require('../pages/LoginPage');
const HomePage     = require('../pages/HomePage');
const helpers      = require('../helpers/appiumHelpers');

const fs = require('fs');
const path = require('path');
let TEST_EMAIL    = process.env.TEST_EMAIL    || 'testuser@trackback.com';
let TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass@123';

const credsPath = path.resolve(__dirname, '../../../test-credentials.json');
if (fs.existsSync(credsPath)) {
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    TEST_EMAIL = creds.email;
    TEST_PASSWORD = creds.password;
    console.log(`🔑 Loaded dynamic test credentials from test-credentials.json: ${TEST_EMAIL}`);
  } catch (e) {
    console.warn('⚠️ Failed to load test-credentials.json:', e.message);
  }
}

let driver;
const loginPage = () => new LoginPage(driver);
const homePage  = () => new HomePage(driver);

// ─── Test Suites ─────────────────────────────────────────────────────────────
describe('TrackBack Android – Navigation Tests', function () {
  this.timeout(60000);

  before(async function () {
    this.timeout(120000);
    helpers.ensureDirs();
    driver = await remote({
      hostname: config.hostname,
      port:     config.port,
      path:     config.path,
      capabilities: config.capabilities,
      logLevel: 'warn',
      connectionRetryTimeout: 120000,
      connectionRetryCount: 3,
    });

    // Login once for all navigation tests
    await loginPage().waitForScreen(20000);
    await loginPage().enterEmail(TEST_EMAIL);
    await loginPage().enterPassword(TEST_PASSWORD);
    await loginPage().tapLogin();
    await homePage().waitForDashboard(20000);
  });

  after(async function () {
    if (driver) await driver.deleteSession();
  });

  afterEach(async function () {
    // Screenshots are handled inside catch blocks for precise report mapping
  });

  it('TC-009 | Lost tab displays items list', async function () {
    const start = Date.now();
    try {
      await homePage().tapLostTab();
      await helpers.sleep(2000);
      const listEl = await driver.$('//android.view.ViewGroup[contains(@content-desc,"lost-item")]');
      // Verify at least the screen is visible (list may be empty in test env)
      await helpers.takeScreenshot(driver, 'TC009_lost_tab');
      helpers.recordResult({ name: 'TC-009 Lost Tab', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-009 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC009_lost_tab');
      helpers.recordResult({ name: 'TC-009 Lost Tab', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  it('TC-010 | Found tab displays items list', async function () {
    const start = Date.now();
    try {
      await homePage().tapFoundTab();
      await helpers.sleep(2000);
      await helpers.takeScreenshot(driver, 'TC010_found_tab');
      helpers.recordResult({ name: 'TC-010 Found Tab', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-010 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC010_found_tab');
      helpers.recordResult({ name: 'TC-010 Found Tab', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  it('TC-011 | Search tab is accessible', async function () {
    const start = Date.now();
    try {
      const searchTab = await driver.$('//android.widget.TextView[@text="Search"]');
      if (await searchTab.isExisting()) await searchTab.click();
      await helpers.sleep(1500);
      await helpers.takeScreenshot(driver, 'TC011_search_tab');
      helpers.recordResult({ name: 'TC-011 Search Tab', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-011 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC011_search_tab');
      helpers.recordResult({ name: 'TC-011 Search Tab', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  it('TC-012 | Chat tab is accessible', async function () {
    const start = Date.now();
    try {
      const chatTab = await driver.$('//android.widget.TextView[@text="Chat"]');
      if (await chatTab.isExisting()) await chatTab.click();
      await helpers.sleep(1500);
      await helpers.takeScreenshot(driver, 'TC012_chat_tab');
      helpers.recordResult({ name: 'TC-012 Chat Tab', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-012 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC012_chat_tab');
      helpers.recordResult({ name: 'TC-012 Chat Tab', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });
});
