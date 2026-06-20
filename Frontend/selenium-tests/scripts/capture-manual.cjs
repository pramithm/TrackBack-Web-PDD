const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

const BASE_URL = "http://localhost:5173/TrackBack-Web-PDD/";
const TEST_EMAIL = "test_run_local_3532@trackback.com";
const TEST_PASSWORD = "TestPass@123";
const OUTPUT_DIR = "C:/Users/HOME/.gemini/antigravity-ide/brain/2ea0ac48-8443-4563-87af-de31f48c6e5c/";

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

async function run() {
  console.log("🚀 Starting Selenium Capture script...");
  const driver = await buildDriver();
  try {
    console.log(`🌐 Navigating to ${BASE_URL}...`);
    await driver.get(BASE_URL);
    await driver.sleep(2000);

    // Save landing screenshot
    let landingScr = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, "verify_landing.png"), Buffer.from(landingScr, 'base64'));
    console.log("📸 Landing page screenshot saved.");

    // Sign in
    console.log("🔑 Logging in...");
    const signinBtn = await driver.wait(until.elementLocated(By.id('landing-signin-btn')), 10000);
    await signinBtn.click();
    await driver.sleep(1000);

    const emailField = await driver.wait(until.elementLocated(By.id('login-email')), 10000);
    const passwordField = await driver.findElement(By.id('login-password'));
    const loginBtn = await driver.findElement(By.id('login-submit-btn'));

    await emailField.clear();
    await emailField.sendKeys(TEST_EMAIL);
    await passwordField.clear();
    await passwordField.sendKeys(TEST_PASSWORD);
    await loginBtn.click();

    console.log("⏳ Waiting for dashboard...");
    await driver.wait(until.elementLocated(By.className('sidebar')), 20000);
    await driver.sleep(3000);

    // Save dashboard screenshot
    let dashScr = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, "verify_dashboard.png"), Buffer.from(dashScr, 'base64'));
    console.log("📸 Dashboard page screenshot saved.");

    // Click Notification Bell to open dropdown
    console.log("🔔 Clicking notification bell...");
    const bellBtn = await driver.findElement(By.css('.global-header-actions button[title="Notifications"]'));
    await bellBtn.click();
    await driver.sleep(1000);
    let bellScr = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, "verify_bell_dropdown.png"), Buffer.from(bellScr, 'base64'));
    console.log("📸 Bell dropdown screenshot saved.");
    await bellBtn.click(); // Close
    await driver.sleep(1000);

    // Click Claims Center in sidebar
    console.log("📋 Clicking Claims Center sidebar option...");
    const claimsSidebar = await driver.findElement(By.xpath("//span[text()='Claims Center']/.."));
    await claimsSidebar.click();
    await driver.sleep(2000);
    let claimsScr = await driver.takeScreenshot();
    fs.writeFileSync(path.join(OUTPUT_DIR, "verify_claims_center.png"), Buffer.from(claimsScr, 'base64'));
    console.log("📸 Claims center page screenshot saved.");

  } catch (err) {
    console.error("❌ Error encountered:", err);
  } finally {
    await driver.quit();
    console.log("🏁 Driver closed.");
  }
}

run();
