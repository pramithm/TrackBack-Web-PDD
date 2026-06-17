/**
 * TrackBack Android – Page Object: Login Screen
 * Appium / WebdriverIO Page Object Model
 */

class LoginPage {
  constructor(driver) {
    this.driver = driver;
  }

  // ─── Element Locators ──────────────────────────────────────────────────────
  get emailInput()    { return this.driver.$('~email-input'); }
  get passwordInput() { return this.driver.$('~password-input'); }
  get loginButton()   { return this.driver.$('~login-button'); }
  get signupButton()  { return this.driver.$('~signup-button'); }
  get errorMessage()  { return this.driver.$('~auth-error'); }
  get welcomeText()   { return this.driver.$('~welcome-title'); }

  // XPath fallbacks (for React Native Text / TextInput components)
  get emailInputXP()    { return this.driver.$('//android.widget.EditText[@hint="Email"]'); }
  get passwordInputXP() { return this.driver.$('//android.widget.EditText[@hint="Password"]'); }
  get loginButtonXP()   { return this.driver.$('//android.widget.Button[@text="Sign In"]'); }
  get signupButtonXP()  { return this.driver.$('//android.widget.Button[@text="Sign Up"]'); }

  // ─── Actions ──────────────────────────────────────────────────────────────
  async bypassOnboarding() {
    try {
      console.log('🔍 Checking if Welcome onboarding is visible...');
      const welcomeBtn = await this.driver.$('~welcome-get-started-btn');
      if (await welcomeBtn.waitForExist({ timeout: 4000 })) {
        console.log('👉 Found Welcome Screen. Tapping "Get Started"...');
        await welcomeBtn.click();
        
        const skipBtn = await this.driver.$('~walkthrough-skip-btn');
        if (await skipBtn.waitForExist({ timeout: 4000 })) {
          console.log('👉 Found Walkthrough Screen. Tapping "Skip"...');
          await skipBtn.click();
          
          const loginBtn = await this.driver.$('~walkthrough-login-btn');
          if (await loginBtn.waitForExist({ timeout: 4000 })) {
            console.log('👉 Tapping "Log In" on walkthrough end...');
            await loginBtn.click();
          }
        }
      }
    } catch (err) {
      console.log('ℹ️ Welcome screen onboarding bypass skipped or not visible:', err.message);
    }
  }

  async waitForScreen(timeoutMs = 15000) {
    // Attempt onboarding bypass first
    await this.bypassOnboarding();

    try {
      await this.emailInput.waitForExist({ timeout: timeoutMs });
    } catch {
      await this.emailInputXP.waitForExist({ timeout: timeoutMs });
    }
  }

  async enterEmail(email) {
    try {
      const el = await this.emailInput;
      if (await el.isExisting()) {
        await el.clearValue();
        await el.setValue(email);
        return;
      }
    } catch { /* fall through */ }
    const el = await this.emailInputXP;
    await el.clearValue();
    await el.setValue(email);
  }

  async enterPassword(password) {
    try {
      const el = await this.passwordInput;
      if (await el.isExisting()) {
        await el.clearValue();
        await el.setValue(password);
        return;
      }
    } catch { /* fall through */ }
    const el = await this.passwordInputXP;
    await el.clearValue();
    await el.setValue(password);
  }

  async tapLogin() {
    try {
      const el = await this.loginButton;
      if (await el.isExisting()) { await el.click(); return; }
    } catch { /* fall through */ }
    await (await this.loginButtonXP).click();
  }

  async tapSignUp() {
    try {
      const el = await this.signupButton;
      if (await el.isExisting()) { await el.click(); return; }
    } catch { /* fall through */ }
    await (await this.signupButtonXP).click();
  }

  async getErrorText() {
    try {
      const el = await this.errorMessage;
      if (await el.isExisting()) return el.getText();
    } catch { /* fall through */ }
    // Try finding any error TextView
    const errEl = await this.driver.$('//android.widget.TextView[contains(@text,"Invalid") or contains(@text,"Error") or contains(@text,"failed")]');
    return errEl.isExisting() ? errEl.getText() : '';
  }
}

module.exports = LoginPage;
