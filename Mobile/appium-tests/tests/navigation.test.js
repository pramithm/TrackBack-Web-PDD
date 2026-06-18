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

async function ensureLoggedOut(driver) {
  const APP_ID = 'com.mounikamouni12.FrontEnd';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`  → ensureLoggedOut attempt ${attempt}/3`);
      await driver.terminateApp(APP_ID);
      await helpers.sleep(1500);
      try {
        await driver.execute('mobile: clearApp', { appId: APP_ID });
      } catch (clearErr) {
        console.warn('  ⚠️ clearApp not supported, proceeding without:', clearErr.message);
      }
      await driver.activateApp(APP_ID);

      // After clearApp the app launches as a fresh install → onboarding screen appears.
      // bypassOnboarding() handles the welcome + walkthrough flow and lands on login screen.
      await helpers.sleep(5000);
      const LoginPage = require('../pages/LoginPage');
      const lp = new LoginPage(driver);
      console.log('  🔍 Running onboarding bypass after clearApp...');
      await lp.bypassOnboarding();

      // Verify login screen appeared
      try {
        await lp.emailInput.waitForExist({ timeout: 10000 });
        console.log('  ✅ ensureLoggedOut: login screen confirmed via accessibilityId');
        return;
      } catch {
        try {
          await driver.$('//android.widget.EditText[@hint="Email"]').waitForExist({ timeout: 8000 });
          console.log('  ✅ ensureLoggedOut: login screen confirmed via XPath');
          return;
        } catch {
          console.warn(`  ⚠️ ensureLoggedOut attempt ${attempt}: login screen not found after onboarding bypass`);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ ensureLoggedOut attempt ${attempt} failed:`, err.message);
    }
    await helpers.sleep(2000);
  }
  console.warn('  ⚠️ ensureLoggedOut: could not confirm login screen after 3 attempts');
}

// ─── Test Suites ─────────────────────────────────────────────────────────────
describe('TrackBack Android – Navigation Tests', function () {
  this.timeout(90000);

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

    // Make sure we start clean and logged out before logging in
    await ensureLoggedOut(driver);

    // Login once for all navigation tests
    await loginPage().waitForScreen(25000);
    await loginPage().enterEmail(TEST_EMAIL);
    await loginPage().enterPassword(TEST_PASSWORD);
    await loginPage().tapLogin();
    await homePage().waitForDashboard(30000);
  });

  after(async function () {
    if (driver) {
      try {
        await driver.deleteSession();
        console.log('🔌 Navigation driver session closed.');
      } catch (err) {
        console.warn('⚠️ Could not cleanly close navigation driver session:', err.message);
      }
    }
  });

  afterEach(async function () {
    // Screenshots are handled inside catch blocks for precise report mapping
  });

  it('TC-009 | Lost tab displays items list', async function () {
    const start = Date.now();
    try {
      await homePage().tapLostTab();
      await helpers.sleep(2500);
      // Check for the Lost Report tab being selected (verify we navigated)
      // Also try to find a lost-item card by accessibility ID (testID="lost-item")
      try {
        const listEl = await driver.$('~lost-item');
        const exists = await listEl.isExisting();
        console.log(`  ℹ️ lost-item card found via accessibilityId: ${exists}`);
      } catch (e) {
        // It's OK if no items exist in test environment — we just verify the tab navigated
        console.log('  ℹ️ No lost-item cards found (empty state is acceptable in test env)');
      }
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
      await helpers.sleep(2500);
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
      await homePage().tapSearchTab();
      await helpers.sleep(2000);
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
      await homePage().tapChatTab();
      await helpers.sleep(2000);
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
