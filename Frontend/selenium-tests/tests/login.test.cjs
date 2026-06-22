const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

const testResults = [];

const REPO_OWNER = process.env.REPO_OWNER || 'pramithm';
const REPO_NAME = process.env.REPO_NAME || 'TrackBack-Web-PDD';
const BASE_URL = process.env.BASE_URL || `https://${REPO_OWNER}.github.io/${REPO_NAME}/`;
const TEST_EMAIL = 'pramithm2174.sse@saveetha.com';
const TEST_PASSWORD = 'asdf1234';

const TIMEOUT = 20000;

async function captureFailureDiagnostics(driver, name) {
  if (!driver) return;
  const timestamp = Date.now();
  const shotsDir = path.resolve(__dirname, '../../Test Results/Screenshots');
  const logsDir = path.resolve(__dirname, '../../Test Results/Logs');
  fs.mkdirSync(shotsDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });

  // 1. Screenshot
  try {
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync(path.join(shotsDir, `${name}_${timestamp}.png`), Buffer.from(screenshot, 'base64'));
    console.log(`  📸 Failure screenshot saved: ${name}_${timestamp}.png`);
  } catch (err) {
    console.warn(`  ⚠️ Screenshot capture failed: ${err.message}`);
  }

  // 2. HTML source code
  try {
    const source = await driver.getPageSource();
    fs.writeFileSync(path.join(logsDir, `${name}_${timestamp}_source.html`), source, 'utf8');
    console.log(`  📄 Failure page source HTML saved: ${name}_${timestamp}_source.html`);
  } catch (err) {
    console.warn(`  ⚠️ Page source dump failed: ${err.message}`);
  }
}

/**
 * Build a headless Chrome driver for CI environments.
 */
async function buildDriver() {
  const options = new chrome.Options();
  options.addArguments(
    '--headless',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1280,900',
    '--disable-http-cache',
    '--disable-application-cache',
    '--disk-cache-size=0',
    '--media-cache-size=0'
  );
  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
}

describe('TrackBack — Login E2E Tests', function () {
  this.timeout(90000);
  let driver;

  before(async () => {
    driver = await buildDriver();
    console.log(`\n🌐 Testing against: ${BASE_URL}`);
  });

  beforeEach(async () => {
    if (driver) {
      try {
        await driver.get(BASE_URL);
        await driver.manage().deleteAllCookies();
        await driver.executeScript(`
          try {
            window.localStorage.clear();
            window.sessionStorage.clear();
            if (window.indexedDB) {
              window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
            }
          } catch(e){}
        `);
      } catch (e) {
        console.warn('⚠️ Failed to clear session in beforeEach:', e.message);
      }
    }
  });

  afterEach(async function () {
    const title = this.currentTest.title;
    const state = this.currentTest.state || 'skipped';
    const duration = this.currentTest.duration || 0;
    const error = this.currentTest.err ? this.currentTest.err.message : null;

    let screenshotPath = null;
    if (state === 'failed' && driver) {
      try {
        const screenshot = await driver.takeScreenshot();
        const filename = `FAIL_${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
        const shotsDir = path.resolve(__dirname, '../../Test Results/Screenshots');
        fs.mkdirSync(shotsDir, { recursive: true });
        fs.writeFileSync(path.join(shotsDir, filename), Buffer.from(screenshot, 'base64'));
        screenshotPath = `Screenshots/${filename}`;
        console.log(`  📸 Failure screenshot saved: ${filename}`);
      } catch (err) {
        console.warn(`  ⚠️ Screenshot capture failed: ${err.message}`);
      }
    }

    testResults.push({
      name: title,
      status: state === 'passed' ? 'passed' : (state === 'failed' ? 'failed' : 'skipped'),
      duration,
      error,
      screenshotPath
    });
  });

  after(async () => {
    if (driver) await driver.quit();

    const resultsDir = path.resolve(__dirname, '../../Test Results');
    fs.mkdirSync(resultsDir, { recursive: true });

    const resultsFile = path.join(resultsDir, 'recorded-results.json');
    let currentResults = [];
    if (fs.existsSync(resultsFile)) {
      try {
        currentResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      } catch (e) {
        currentResults = [];
      }
    }

    testResults.forEach(newRes => {
      const idx = currentResults.findIndex(r => r.name === newRes.name);
      if (idx > -1) {
        currentResults[idx] = newRes;
      } else {
        currentResults.push(newRes);
      }
    });

    fs.writeFileSync(resultsFile, JSON.stringify(currentResults, null, 2), 'utf8');
    console.log(`Recorded results merged and saved to recorded-results.json (${currentResults.length} total cases)`);
  });

  // ─── Test 1: Page Load ────────────────────────────────────────────────────
  it('should load the TrackBack landing page', async () => {
    await driver.get(BASE_URL);

    // Wait for landing Sign In button (view = 'landing')
    await driver.wait(
      until.elementLocated(By.id('landing-signin-btn')),
      TIMEOUT,
      'Landing page did not load — Sign In button not found'
    );

    const title = await driver.getTitle();
    console.log(`  📄 Page title: "${title}"`);
  });

  // ─── Test 2: Navigate to Login ────────────────────────────────────────────
  it('should navigate to the login form', async () => {
    await driver.get(BASE_URL);

    const signinBtn = await driver.wait(
      until.elementLocated(By.id('landing-signin-btn')),
      TIMEOUT
    );
    await signinBtn.click();

    // Wait for login email input to appear
    await driver.wait(
      until.elementLocated(By.id('login-email')),
      TIMEOUT,
      'Login form did not appear after clicking Sign In'
    );
    console.log('  ✅ Login form loaded');
  });

  // ─── Test 3: Valid Login ──────────────────────────────────────────────────
  it('should login with valid credentials and reach the dashboard', async () => {
    await driver.get(BASE_URL);

    // Go to login
    const signinBtn = await driver.wait(until.elementLocated(By.id('landing-signin-btn')), TIMEOUT);
    await signinBtn.click();

    const emailField = await driver.wait(until.elementLocated(By.id('login-email')), TIMEOUT);
    const passwordField = await driver.findElement(By.id('login-password'));
    const loginBtn = await driver.findElement(By.id('login-submit-btn'));

    await emailField.clear();
    await emailField.sendKeys(TEST_EMAIL);
    await passwordField.clear();
    await passwordField.sendKeys(TEST_PASSWORD);
    await loginBtn.click();

    console.log('  ⏳ Waiting for authentication redirection...');
    let success = false;
    let errorMsg = '';
    const start = Date.now();

    while (Date.now() - start < TIMEOUT) {
      // 1. Check for Dashboard
      const sidebar = await driver.findElements(By.className('sidebar'));
      if (sidebar.length > 0) {
        console.log('  ✅ Dashboard loaded — login successful');
        success = true;
        break;
      }

      // 2. Check for Profile Verification (uncompleted profile)
      const verifyName = await driver.findElements(By.id('verify-name-input'));
      if (verifyName.length > 0) {
        console.log('  ⚠️ Profile setup incomplete — completing verification flow...');
        try {
          const nameInput = await driver.findElement(By.id('verify-name-input'));
          await nameInput.sendKeys('Test User');
          const phoneInput = await driver.findElement(By.id('verify-phone-input'));
          await phoneInput.sendKeys('9876543210');
          const ageInput = await driver.findElement(By.id('verify-age-input'));
          await ageInput.sendKeys('25');

          const genderInput = await driver.findElement(By.id('verify-gender-input'));
          await genderInput.sendKeys('Male');

          const locationInput = await driver.findElement(By.id('verify-location-input'));
          await locationInput.sendKeys('Hyderabad, Telangana, India');

          const submitBtn = await driver.findElement(By.id('verify-submit-btn'));
          await submitBtn.click();

          console.log('  Profile submitted, waiting for Dashboard...');
          await driver.wait(until.elementLocated(By.className('sidebar')), TIMEOUT);
          console.log('  ✅ Dashboard loaded after profile completion');
          success = true;
        } catch (setupErr) {
          console.error('  ❌ Profile completion failed:', setupErr.message);
        }
        break;
      }

      // 3. Check for Email Verification Screen
      const verifyCheck = await driver.findElements(By.id('verify-check-btn'));
      if (verifyCheck.length > 0) {
        await captureFailureDiagnostics(driver, 'FAIL_email_not_verified');
        throw new Error('Test account is not email verified.');
      }

      // 4. Check for Login Error
      const authError = await driver.findElements(By.id('login-error'));
      if (authError.length > 0) {
        const errorText = await authError[0].getText();
        await captureFailureDiagnostics(driver, 'FAIL_auth_error');
        throw new Error(`Authentication error appears: ${errorText}`);
      }

      await driver.sleep(500);
    }

    // Log debug information as required
    try {
      const url = await driver.getCurrentUrl();
      const userDetails = await driver.executeScript(() => {
        if (window.__firebase_auth && window.__firebase_auth.currentUser) {
          const user = window.__firebase_auth.currentUser;
          return {
            uid: user.uid,
            emailVerified: user.emailVerified,
            email: user.email
          };
        }
        return null;
      });
      console.log(`  🔍 E2E Debug Info:`);
      console.log(`    - URL: ${url}`);
      if (userDetails) {
        console.log(`    - Firebase UID: ${userDetails.uid}`);
        console.log(`    - emailVerified: ${userDetails.emailVerified}`);
      } else {
        console.log(`    - Firebase user: not authenticated`);
      }
    } catch (dbgErr) {
      console.warn('  ⚠️ Failed to retrieve debug logs from browser:', dbgErr.message);
    }

    if (!success) {
      await captureFailureDiagnostics(driver, 'FAIL_timeout_login');
      throw new Error('Neither dashboard nor verify step appeared after login');
    }
  });

  // ─── Test 4: Invalid Credentials ─────────────────────────────────────────
  it('should reject invalid credentials with an error message', async () => {
    await driver.get(BASE_URL);

    const signinBtn = await driver.wait(until.elementLocated(By.id('landing-signin-btn')), TIMEOUT);
    await signinBtn.click();

    const emailField = await driver.wait(until.elementLocated(By.id('login-email')), TIMEOUT);
    const passwordField = await driver.findElement(By.id('login-password'));
    const loginBtn = await driver.findElement(By.id('login-submit-btn'));

    await emailField.clear();
    await emailField.sendKeys('invalid.user@nowhere.com');
    await passwordField.clear();
    await passwordField.sendKeys('wrongpass999');
    await loginBtn.click();

    // Error div should appear
    await driver.wait(
      until.elementLocated(By.className('auth-error')),
      TIMEOUT,
      'No error message shown for invalid credentials'
    );
    console.log('  ✅ Invalid credentials correctly rejected');
  });

  // ─── Test 5: Navigate to Sign Up ─────────────────────────────────────────
  it('should open the sign-up form from landing', async () => {
    await driver.get(BASE_URL);

    const createBtn = await driver.wait(until.elementLocated(By.id('landing-signup-btn')), TIMEOUT);
    await createBtn.click();

    await driver.wait(
      until.elementLocated(By.id('signup-email')),
      TIMEOUT,
      'Sign-up form did not appear'
    );
    console.log('  ✅ Sign-up form loaded');
  });
});
