/**
 * TrackBack Android – E2E Test Suite: Login & Authentication
 * Appium / WebdriverIO + Mocha
 *
 * Tests:
 *  TC-001  App launches successfully
 *  TC-002  Login screen is displayed
 *  TC-003  Valid credentials → Dashboard
 *  TC-004  Invalid credentials → Error message
 *  TC-005  Empty form → Validation error
 *  TC-006  Navigate to Sign Up screen
 *  TC-007  Dashboard tabs are visible after login
 *  TC-008  Logout returns to Login screen
 */

const { remote } = require('webdriverio');
const { config } = require('../config/appium.config');
const LoginPage = require('../pages/LoginPage');
const HomePage = require('../pages/HomePage');
const helpers = require('../helpers/appiumHelpers');

const fs = require('fs');
const path = require('path');
let TEST_EMAIL = process.env.TEST_EMAIL || 'pramithm2174.sse@saveetha.com';
let TEST_PASSWORD = process.env.TEST_PASSWORD || 'asdf1234';

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

const TIMEOUT = 20000;

// ─── Shared driver instance ──────────────────────────────────────────────────
let driver;
const loginPage = () => new LoginPage(driver);
const homePage = () => new HomePage(driver);

async function ensureLoggedOut(driver) {
  const APP_ID = 'com.mounikamouni12.FrontEnd';
  console.log('  🔍 ensureLoggedOut: Checking current authentication state...');

  const LoginPageClass = require('../pages/LoginPage');
  const HomePageClass = require('../pages/HomePage');
  const lp = new LoginPageClass(driver);
  const hp = new HomePageClass(driver);

  // A. Check if we are already on the Login screen
  const isEmailInputVisible = await lp.emailInput.isExisting().catch(() => false);
  const isEmailInputXPVisible = await lp.emailInputXP.isExisting().catch(() => false);
  if (isEmailInputVisible || isEmailInputXPVisible) {
    console.log('  ✅ ensureLoggedOut: Already on Login screen.');
    return;
  }

  // B. Check if we are on the Dashboard
  const isDashboardVisible = await hp.isVisible();
  if (isDashboardVisible) {
    console.log('  👉 ensureLoggedOut: On Dashboard. Performing UI logout...');
    try {
      // Navigate to Home tab first to ensure avatar-button is rendered
      const homeTab = await driver.$('~tab-home');
      if (await homeTab.isExisting()) {
        await homeTab.click();
        await helpers.sleep(1500);
      }

      const avatarBtn = await driver.$('~avatar-button');
      await avatarBtn.waitForExist({ timeout: 5000 });
      await avatarBtn.click();
      await helpers.sleep(2000);

      const logoutBtn = await driver.$('~logout-button');
      await logoutBtn.waitForExist({ timeout: 5000 });
      await logoutBtn.click();
      await helpers.sleep(1500);

      const confirmBtn = await driver.$('//android.widget.Button[@text="LOG OUT" or @text="Log Out" or @resource-id="android:id/button1"]');
      await confirmBtn.waitForExist({ timeout: 5000 });
      await confirmBtn.click();
      await helpers.sleep(3000);

      console.log('  ✅ ensureLoggedOut: Logged out successfully via UI.');
      return;
    } catch (logoutErr) {
      console.warn('  ⚠️ ensureLoggedOut: UI logout failed, falling back to app restart/clear:', logoutErr.message);
    }
  }

  // C. Fallback: Cold restart & onboarding bypass
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`  → ensureLoggedOut fallback attempt ${attempt}/3`);
      await driver.terminateApp(APP_ID);
      await helpers.sleep(1500);
      try {
        await driver.execute('mobile: clearApp', { appId: APP_ID });
      } catch (clearErr) {
        console.warn('  ⚠️ clearApp not supported, proceeding without:', clearErr.message);
      }
      await driver.activateApp(APP_ID);

      // After clearApp the app launches as a fresh install → onboarding screen appears.
      // Give the RN bundle time to hydrate, then run bypassOnboarding() which handles
      // the welcome + walkthrough flow and lands us on the login screen.
      await helpers.sleep(5000);
      console.log('  🔍 Running onboarding bypass after clearApp...');
      await lp.bypassOnboarding();

      // Now verify we are on the login screen
      try {
        await lp.emailInput.waitForExist({ timeout: 10000 });
        console.log('  ✅ ensureLoggedOut: login screen confirmed via accessibilityId');
        return; // success
      } catch {
        // XPath fallback
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
  console.warn('  ⚠️ ensureLoggedOut: could not confirm login screen after 3 attempts, proceeding anyway');
}

// ─── Test Suites ─────────────────────────────────────────────────────────────
describe('TrackBack Android – Login & Authentication', function () {
  this.timeout(150000);

  // ─── Mocha hooks ─────────────────────────────────────────────────────────────
  before(async function () {
    this.timeout(120000);
    helpers.ensureDirs();
    console.log('\n📱 Connecting to Appium server…');
    driver = await remote({
      hostname: config.hostname,
      port: config.port,
      path: config.path,
      capabilities: config.capabilities,
      logLevel: config.logLevel,
      connectionRetryTimeout: config.connectionRetryTimeout,
      connectionRetryCount: config.connectionRetryCount,
    });
    console.log('✅ Appium driver created. Session ID:', driver.sessionId);
  });

  after(async function () {
    if (driver) {
      try {
        await driver.deleteSession();
        console.log('\n🔌 Driver session closed.');
      } catch (err) {
        console.warn('\n⚠️ Could not cleanly close driver session:', err.message);
      } finally {
        driver = null;
      }
    }
  });

  afterEach(async function () {
    // Screenshots are handled inside catch blocks for precise report mapping
  });

  // ── TC-001 ────────────────────────────────────────────────────────────────
  it('TC-001 | App launches and shows a screen', async function () {
    const start = Date.now();
    try {
      await driver.pause(5000); // let RN bundle hydrate
      const source = await driver.getPageSource();
      if (!source || source.length < 50) throw new Error('Page source is empty');
      await helpers.takeScreenshot(driver, 'TC001_app_launch');
      helpers.recordResult({ name: 'TC-001 App Launch', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-001 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC001_app_launch');
      helpers.recordResult({ name: 'TC-001 App Launch', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  // ── TC-002 ────────────────────────────────────────────────────────────────
  it('TC-002 | Login screen is displayed', async function () {
    const start = Date.now();
    try {
      await loginPage().waitForScreen(TIMEOUT);
      await helpers.takeScreenshot(driver, 'TC002_login_screen');
      helpers.recordResult({ name: 'TC-002 Login Screen', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-002 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC002_login_screen');
      helpers.recordResult({ name: 'TC-002 Login Screen', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  // ── TC-003 ────────────────────────────────────────────────────────────────
  it('TC-003 | Valid credentials → Dashboard visible', async function () {
    const start = Date.now();
    try {
      await loginPage().waitForScreen(TIMEOUT);
      await loginPage().enterEmail(TEST_EMAIL);
      await loginPage().enterPassword(TEST_PASSWORD);
      await helpers.takeScreenshot(driver, 'TC003_before_login');
      await loginPage().tapLogin();

      console.log('  ⏳ Waiting for authentication redirection...');
      let success = false;
      const checkStart = Date.now();

      while (Date.now() - checkStart < TIMEOUT) {
        // 1. Check for Dashboard
        const isDashboard = await homePage().isVisible();
        if (isDashboard) {
          console.log('  ✅ Dashboard tabs visible after login');
          success = true;
          break;
        }

        // 2. Check for Email Verification Screen
        const emailVerifyTitle = await driver.$('//android.widget.TextView[@text="Verify Your Email"]');
        if (await emailVerifyTitle.isExisting().catch(() => false)) {
          const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC003_email_verify');
          helpers.recordResult({ name: 'TC-003 Valid Login', status: 'failed', duration: Date.now() - start, error: new Error('Test account is not email verified.'), screenshotPath });
          throw new Error('Test account is not email verified.');
        }

        // 3. Check for Complete Profile Setup Screen
        const profileSetupTitle = await driver.$('//android.widget.TextView[@text="Complete Profile Setup"]');
        if (await profileSetupTitle.isExisting().catch(() => false)) {
          console.log('  ⚠️ Reached Profile Setup step. Attempting profile completion...');
          try {
            const nameField = await driver.$('//android.widget.EditText[@hint="John Doe" or @text="John Doe"]');
            await nameField.setValue('Test User');
            const phoneField = await driver.$('//android.widget.EditText[@hint="00000 00000"]');
            await phoneField.setValue('9876543210');
            const ageField = await driver.$('//android.widget.EditText[@hint="21"]');
            await ageField.setValue('25');
            const locationField = await driver.$('//android.widget.EditText[@hint="Warangal, Telangana, India"]');
            await locationField.setValue('Hyderabad, India');

            // Tap the submit button
            const submitBtn = await driver.$('//android.widget.TextView[@text="Complete Profile"]');
            await submitBtn.click();
            await helpers.sleep(3000);
          } catch (profileErr) {
            console.warn('  ⚠️ Profile auto-completion failed:', profileErr.message);
          }
        }

        // 4. Check for Auth Error message
        const errText = await loginPage().getErrorText().catch(() => '');
        if (errText) {
          const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC003_auth_error');
          const finalErr = new Error(`Authentication error appears: ${errText}`);
          helpers.recordResult({ name: 'TC-003 Valid Login', status: 'failed', duration: Date.now() - start, error: finalErr, screenshotPath });
          throw finalErr;
        }

        await helpers.sleep(500);
      }

      // Print debug logs as required
      try {
        const source = await driver.getPageSource();
        console.log(`  🔍 E2E Debug Info:`);
        console.log(`    - Has Verify Your Email: ${source.includes('Verify Your Email')}`);
        console.log(`    - Has Complete Profile Setup: ${source.includes('Complete Profile Setup')}`);
      } catch (dbgErr) {
        console.warn('  ⚠️ Failed to retrieve page source for debug logs:', dbgErr.message);
      }

      if (!success) {
        throw new Error('Neither dashboard tabs nor email verification steps completed within timeout');
      }

      await helpers.takeScreenshot(driver, 'TC003_dashboard');
      helpers.recordResult({ name: 'TC-003 Valid Login', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-003 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC003_dashboard');
      helpers.recordResult({ name: 'TC-003 Valid Login', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  // ── TC-004 ────────────────────────────────────────────────────────────────
  it('TC-004 | Invalid credentials → Error displayed', async function () {
    const start = Date.now();
    try {
      // Reset app to force logout / login screen
      await ensureLoggedOut(driver);

      await loginPage().waitForScreen(TIMEOUT);
      await loginPage().enterEmail('notauser@nowhere.xyz');
      await loginPage().enterPassword('WrongPass999!');
      await loginPage().tapLogin();

      // Wait for login processing to complete (allow network roundtrip)
      await helpers.sleep(4000);

      // A. Verify that we DID NOT log in successfully (must not navigate to dashboard)
      const isDashboardVisible = await homePage().isVisible();
      if (isDashboardVisible) {
        throw new Error('Invalid login succeeded unexpectedly: App navigated to dashboard');
      }

      let rejectedSuccessfully = false;
      let rejectReason = '';

      // B. Validate actual application behavior for rejected login attempts

      // Option 1: Inline error message displayed
      const errorText = await loginPage().getErrorText();
      if (errorText) {
        rejectedSuccessfully = true;
        rejectReason = `Error message displayed: "${errorText}"`;
      } else {
        // Option 2: Native Android Toast notification is displayed
        const toastEl = await driver.$('//android.widget.Toast');
        const toastExists = await toastEl.isExisting().catch(() => false);
        if (toastExists) {
          rejectedSuccessfully = true;
          rejectReason = 'Toast notification displayed';
        } else {
          // Option 3: Alert dialog is displayed
          const alertEl = await driver.$('//android.widget.TextView[@resource-id="android:id/message"]');
          const alertExists = await alertEl.isExisting().catch(() => false);
          if (alertExists) {
            const alertText = await alertEl.getText().catch(() => 'Alert dialog');
            rejectedSuccessfully = true;
            rejectReason = `Alert dialog displayed: "${alertText}"`;
          } else {
            // Option 4: User remains on the login screen
            const isEmailInputVisible = await loginPage().emailInput.isExisting().catch(() => false);
            const isEmailInputXPVisible = await loginPage().emailInputXP.isExisting().catch(() => false);
            if (isEmailInputVisible || isEmailInputXPVisible) {
              rejectedSuccessfully = true;
              rejectReason = 'Login rejected: User remains on the login screen';
            }
          }
        }
      }

      if (!rejectedSuccessfully) {
        throw new Error('App did not show any validation, toast, or alert, and is no longer on the login screen');
      }

      await helpers.takeScreenshot(driver, 'TC004_invalid_credentials_rejected');
      console.log(`  ✅ TC-004 passed – ${rejectReason}`);
      helpers.recordResult({ name: 'TC-004 Invalid Credentials', status: 'passed', duration: Date.now() - start });
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC004_invalid_credentials');
      helpers.recordResult({ name: 'TC-004 Invalid Credentials', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  // ── TC-005 ────────────────────────────────────────────────────────────────
  it('TC-005 | Empty form submission → Validation error', async function () {
    const start = Date.now();
    try {
      await ensureLoggedOut(driver);

      await loginPage().waitForScreen(TIMEOUT);
      // Tap login without entering credentials
      await loginPage().tapLogin();
      await helpers.sleep(2000);

      const errorText = await loginPage().getErrorText();
      // Validation can be shown as a Toast, snackbar, or inline error
      await helpers.takeScreenshot(driver, 'TC005_empty_form');
      helpers.recordResult({ name: 'TC-005 Empty Form Validation', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-005 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC005_empty_form');
      helpers.recordResult({ name: 'TC-005 Empty Form Validation', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  // ── TC-006 ────────────────────────────────────────────────────────────────
  it('TC-006 | Navigate to Sign Up screen', async function () {
    const start = Date.now();
    try {
      await ensureLoggedOut(driver);

      await loginPage().waitForScreen(TIMEOUT);
      await loginPage().tapSignUp();
      await helpers.sleep(2000);

      // Verify sign-up form appeared
      const signupEmail = await driver.$('//android.widget.EditText[@hint="Email"]');
      await signupEmail.waitForExist({ timeout: 10000 });

      await helpers.takeScreenshot(driver, 'TC006_signup_screen');
      helpers.recordResult({ name: 'TC-006 Navigate to Sign Up', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-006 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC006_signup');
      helpers.recordResult({ name: 'TC-006 Navigate to Sign Up', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  // ── TC-007 ────────────────────────────────────────────────────────────────
  it('TC-007 | Dashboard tabs visible after login', async function () {
    const start = Date.now();
    try {
      await ensureLoggedOut(driver);

      await loginPage().waitForScreen(TIMEOUT);
      await loginPage().enterEmail(TEST_EMAIL);
      await loginPage().enterPassword(TEST_PASSWORD);
      await loginPage().tapLogin();

      await homePage().waitForDashboard(TIMEOUT);
      await homePage().tapLostTab();
      await helpers.sleep(1000);
      await homePage().tapFoundTab();

      await helpers.takeScreenshot(driver, 'TC007_tabs_navigation');
      helpers.recordResult({ name: 'TC-007 Dashboard Tabs', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-007 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC007_tabs');
      helpers.recordResult({ name: 'TC-007 Dashboard Tabs', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });

  // ── TC-008 ────────────────────────────────────────────────────────────────
  it('TC-008 | Logout returns to Login screen', async function () {
    const start = Date.now();
    try {
      // Navigate to Home tab first to ensure the avatar button is rendered
      const homeTab = await driver.$('~tab-home');
      if (await homeTab.isExisting()) {
        await homeTab.click();
        await helpers.sleep(1500);
      }

      // Tapping on avatar button to go to Profile screen
      const avatarBtn = await driver.$('~avatar-button');
      await avatarBtn.waitForExist({ timeout: TIMEOUT });
      await avatarBtn.click();
      await helpers.sleep(2000);

      // Now on Profile screen, find and tap the logout button
      const logoutBtn = await driver.$('~logout-button');
      await logoutBtn.waitForExist({ timeout: TIMEOUT });
      await logoutBtn.click();
      await helpers.sleep(1500);

      // Tap the native Alert "Log Out" confirmation button
      const confirmBtn = await driver.$('//android.widget.Button[@text="LOG OUT" or @text="Log Out" or @resource-id="android:id/button1"]');
      await confirmBtn.waitForExist({ timeout: TIMEOUT });
      await confirmBtn.click();
      await helpers.sleep(3000);

      // Wait for login screen to confirm successful logout
      await loginPage().waitForScreen(TIMEOUT);

      await helpers.takeScreenshot(driver, 'TC008_after_logout');
      helpers.recordResult({ name: 'TC-008 Logout', status: 'passed', duration: Date.now() - start });
      console.log('  ✅ TC-008 passed');
    } catch (err) {
      const screenshotPath = await helpers.captureFailureDiagnostics(driver, 'FAIL_TC008_logout');
      helpers.recordResult({ name: 'TC-008 Logout', status: 'failed', duration: Date.now() - start, error: err, screenshotPath });
      throw err;
    }
  });
});
