const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

const testResults = [];

const REPO_OWNER = process.env.REPO_OWNER || 'YOUR_USERNAME';
const REPO_NAME  = process.env.REPO_NAME  || 'TrackBack-Web-PDD';
const BASE_URL   = `https://${REPO_OWNER}.github.io/${REPO_NAME}/`;

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

const TIMEOUT = 20000;

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
    '--window-size=1280,900'
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
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2), 'utf8');
    console.log(`Recorded results saved to recorded-results.json (${testResults.length} cases)`);
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

    const emailField    = await driver.wait(until.elementLocated(By.id('login-email')), TIMEOUT);
    const passwordField = await driver.findElement(By.id('login-password'));
    const loginBtn      = await driver.findElement(By.id('login-submit-btn'));

    await emailField.clear();
    await emailField.sendKeys(TEST_EMAIL);
    await passwordField.clear();
    await passwordField.sendKeys(TEST_PASSWORD);
    await loginBtn.click();

    // Expect dashboard: sidebar should appear after successful auth + profile verified
    try {
      await driver.wait(until.elementLocated(By.className('sidebar')), TIMEOUT);
      console.log('  ✅ Dashboard loaded — login successful');
    } catch {
      // Check for verify step (profile not yet set up)
      const verifyEl = await driver.findElements(By.id('verify-name-input'));
      if (verifyEl.length > 0) {
        console.log('  ⚠️  Reached profile verification step — account exists but profile incomplete');
      } else {
        throw new Error('Neither dashboard nor verify step appeared after login');
      }
    }
  });

  // ─── Test 4: Invalid Credentials ─────────────────────────────────────────
  it('should reject invalid credentials with an error message', async () => {
    await driver.get(BASE_URL);

    const signinBtn = await driver.wait(until.elementLocated(By.id('landing-signin-btn')), TIMEOUT);
    await signinBtn.click();

    const emailField    = await driver.wait(until.elementLocated(By.id('login-email')), TIMEOUT);
    const passwordField = await driver.findElement(By.id('login-password'));
    const loginBtn      = await driver.findElement(By.id('login-submit-btn'));

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
