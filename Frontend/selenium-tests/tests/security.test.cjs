const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, set, get, goOffline } = require('firebase/database');

const testResults = [];

const REPO_OWNER = process.env.REPO_OWNER || 'pramithm';
const REPO_NAME = process.env.REPO_NAME || 'TrackBack-Web-PDD';
const BASE_URL = process.env.BASE_URL || `https://${REPO_OWNER}.github.io/${REPO_NAME}/`;

const TEST_EMAIL = 'pramithm2174.sse@saveetha.com';
const TEST_PASSWORD = 'asdf1234';

const TIMEOUT = 20000;

// Firebase configuration for secondary testing of rules
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAe3PhCyMJigvguh3oxf1vCX_1MYvfSfMk",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "trackback-1c73e.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "trackback-1c73e",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "trackback-1c73e.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "792883031609",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:792883031609:web:fe36fa5823b2b91ed5a7e8",
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || "https://trackback-1c73e-default-rtdb.asia-southeast1.firebasedatabase.app"
};

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
  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

describe('TrackBack — Security E2E & Rules Verification Tests', function () {
  this.timeout(90000);
  let driver;
  let firebaseApp;

  before(async () => {
    driver = await buildDriver();
    firebaseApp = initializeApp(firebaseConfig);
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

    testResults.push({
      name: `Security — ${title}`,
      status: state === 'passed' ? 'passed' : (state === 'failed' ? 'failed' : 'skipped'),
      duration,
      error
    });
  });

  after(async () => {
    if (driver) await driver.quit();

    if (firebaseApp) {
      try {
        const db = getDatabase(firebaseApp);
        if (db) {
          goOffline(db);
        }
      } catch (err) {
        console.warn('⚠️ Error during firebase database offline:', err.message);
      }
      try {
        await deleteApp(firebaseApp);
      } catch (err) {
        console.warn('⚠️ Error during firebase deleteApp:', err.message);
      }
    }

    const resultsDir = path.resolve(__dirname, '../../Test Results');
    fs.mkdirSync(resultsDir, { recursive: true });

    const resultsFile = path.join(resultsDir, 'recorded-results.json');
    let currentResults = [];
    if (fs.existsSync(resultsFile)) {
      try {
        currentResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      } catch (e) { }
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
    console.log(`Security recorded results merged and saved to recorded-results.json (${currentResults.length} total cases)`);

    const reportPath = path.join(resultsDir, 'security-e2e-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2), 'utf8');
    console.log(`Security E2E report saved to: ${reportPath}`);
  });

  // ─── Section 1: Authentication & Session ──────────────────────────────────
  it('should reject login for invalid credentials', async () => {
    await driver.get(BASE_URL);
    const signinBtn = await driver.wait(until.elementLocated(By.id('landing-signin-btn')), TIMEOUT);
    await signinBtn.click();

    const emailField = await driver.wait(until.elementLocated(By.id('login-email')), TIMEOUT);
    const passwordField = await driver.findElement(By.id('login-password'));
    const loginBtn = await driver.findElement(By.id('login-submit-btn'));

    await emailField.clear();
    await emailField.sendKeys('malicious-hacker@attacker.org');
    await passwordField.clear();
    await passwordField.sendKeys('WrongPass1234');
    await loginBtn.click();

    await driver.wait(
      until.elementLocated(By.className('auth-error')),
      TIMEOUT,
      'No authentication error message shown for invalid login attempt'
    );
  });

  it('should enforce session termination and clean storage upon logout', async () => {
    await driver.get(BASE_URL);
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

    // Verify logged in
    await driver.wait(until.elementLocated(By.className('sidebar')), TIMEOUT);

    // Go to profile edit settings
    await driver.executeScript(() => {
      const btns = document.querySelectorAll('.icon-btn-circle');
      if (btns && btns.length > 1) {
        btns[1].click(); // settings icon
      }
    });

    await driver.sleep(1000);

    // Click logout
    await driver.executeScript(() => {
      const logoutBtn = document.querySelector('.btn-danger');
      if (logoutBtn) logoutBtn.click();
    });

    await driver.sleep(1000);

    // Confirm logout in modal
    await driver.executeScript(() => {
      const confirmBtn = document.querySelector('.btn-confirm-accept');
      if (confirmBtn) confirmBtn.click();
    });

    await driver.sleep(2000);

    // Verify localStorage auth keys are cleared
    const authKeysExist = await driver.executeScript(() => {
      for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i).startsWith('firebase:authUser')) {
          return true;
        }
      }
      return false;
    });

    if (authKeysExist) {
      throw new Error('Local storage authentication session keys were not cleanly cleared on logout');
    }
  });

  it('should prevent access to protected routes/dashboard for unauthenticated users', async () => {
    await driver.get(BASE_URL);
    await driver.executeScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await driver.get(BASE_URL);
    await driver.sleep(2000);

    const sidebar = await driver.findElements(By.className('sidebar'));
    if (sidebar.length > 0) {
      throw new Error('Access control bypass: Sidebar rendered for unauthenticated visitor.');
    }
  });

  // ─── Section 2: Firebase Security Rules ───────────────────────────────────
  it('should block unauthorized database write attempts to restricted user paths', async () => {
    const db = getDatabase(firebaseApp);
    const targetPath = ref(db, 'users/unauthorized_victim_uid');

    let writeError = null;
    try {
      await set(targetPath, {
        name: "Hacked Profile",
        isProfileVerified: true
      });
    } catch (err) {
      writeError = err;
    }

    const errMsg = writeError ? writeError.message.toUpperCase() : '';
    if (!writeError || (!errMsg.includes('PERMISSION_DENIED') && !errMsg.includes('PERMISSION DENIED'))) {
      throw new Error(`Security Rules Violation: Path users/ restricted access write succeeded or returned unexpected error: ${writeError ? writeError.message : 'Success'}`);
    }
  });

  it('should block unauthorized database read attempts to restricted user profiles', async () => {
    const db = getDatabase(firebaseApp);
    const targetPath = ref(db, 'users/unauthorized_victim_uid');

    let readError = null;
    try {
      await get(targetPath);
    } catch (err) {
      readError = err;
    }

    const errMsg = readError ? readError.message.toUpperCase() : '';
    if (!readError || (!errMsg.includes('PERMISSION_DENIED') && !errMsg.includes('PERMISSION DENIED'))) {
      throw new Error(`Security Rules Violation: Path users/ restricted access read succeeded or returned unexpected error: ${readError ? readError.message : 'Success'}`);
    }
  });

  // ─── Section 3: Input Validation & XSS ────────────────────────────────────
  it('should securely sanitize and encode XSS script payloads in text fields', async () => {
    await driver.get(BASE_URL);
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

    await driver.wait(until.elementLocated(By.className('sidebar')), TIMEOUT);

    // Go to profile edit settings
    await driver.executeScript(() => {
      const btns = document.querySelectorAll('.icon-btn-circle');
      if (btns && btns.length > 1) {
        btns[1].click(); // settings icon
      }
    });

    await driver.sleep(1000);

    // Click edit profile
    await driver.executeScript(() => {
      const editBtn = document.querySelector('.btn-primary');
      if (editBtn) editBtn.click();
    });

    await driver.sleep(1000);

    // Input XSS payload into Name input
    const xssPayload = '<script id="xss-test-trigger">console.error("XSS_COMPROMISE")</script>';
    const nameInput = await driver.findElement(By.css('input[type="text"]'));
    await nameInput.clear();
    await nameInput.sendKeys(xssPayload);

    // Submit form
    const saveBtn = await driver.findElement(By.css('button[type="submit"]'));
    await saveBtn.click();
    await driver.sleep(1500);

    const scriptElements = await driver.findElements(By.id('xss-test-trigger'));
    if (scriptElements.length > 0) {
      throw new Error('Stored XSS Vulnerability: script tag payload executed or inserted directly into the DOM');
    }

    const logs = await driver.manage().logs().get('browser').catch(() => []);
    const compromiseFound = logs.some(log => log.message.includes('XSS_COMPROMISE'));
    if (compromiseFound) {
      throw new Error('Stored XSS Vulnerability: payload script executed successfully in browser context');
    }

    // Restore profile name
    await driver.executeScript(() => {
      const editBtn = document.querySelector('.btn-primary');
      if (editBtn) editBtn.click();
    });
    await driver.sleep(1000);
    const restoreInput = await driver.findElement(By.css('input[type="text"]'));
    await restoreInput.clear();
    await restoreInput.sendKeys('Test User');
    const restoreSave = await driver.findElement(By.css('button[type="submit"]'));
    await restoreSave.click();
    await driver.sleep(1500);
  });
});
