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
  get loginButtonXP()   { return this.driver.$('//android.view.ViewGroup[@content-desc="login-button"] | //android.widget.TextView[@text="Log In" or @text="LOG IN" or @text="Sign In" or @text="SIGN IN"]'); }
  get signupButtonXP()  { return this.driver.$('//android.view.ViewGroup[@content-desc="signup-button"] | //android.widget.TextView[@text="Sign Up" or @text="SIGN UP"]'); }

  // ─── Actions ──────────────────────────────────────────────────────────────
  async bypassOnboarding() {
    // After a cold start (e.g. clearApp), the RN bundle needs extra time to hydrate.
    // Use generous timeouts and inter-step sleeps so navigation animations complete.
    try {
      console.log('🔍 Checking if Welcome onboarding is visible...');
      const welcomeBtn = await this.driver.$('~welcome-get-started-btn');
      if (await welcomeBtn.waitForExist({ timeout: 12000 })) {
        console.log('👉 Found Welcome Screen. Tapping "Get Started"...');
        await welcomeBtn.click();
        await this.driver.pause(2500); // wait for walkthrough navigation

        const skipBtn = await this.driver.$('~walkthrough-skip-btn');
        if (await skipBtn.waitForExist({ timeout: 10000 })) {
          console.log('👉 Found Walkthrough Screen. Tapping "Skip"...');
          await skipBtn.click();
          await this.driver.pause(2000); // wait for final step to render

          const loginBtn = await this.driver.$('~walkthrough-login-btn');
          if (await loginBtn.waitForExist({ timeout: 10000 })) {
            console.log('👉 Tapping "Log In" on walkthrough end...');
            await loginBtn.click();
            await this.driver.pause(2500); // wait for login screen to render
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
      // Native Android Scroll to accessibility ID / description
      const el = await this.driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().description("signup-button"))');
      await el.click();
      return;
    } catch { /* fall through */ }
    try {
      // Native Android Scroll to text contains "Sign Up"
      const el = await this.driver.$('android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().textContains("Sign Up"))');
      await el.click();
      return;
    } catch { /* fall through */ }
    try {
      const el = await this.signupButton;
      if (await el.isExisting()) { await el.click(); return; }
    } catch { /* fall through */ }
    await (await this.signupButtonXP).click();
  }

  async getErrorText() {
    try {
      const el = await this.errorMessage;
      if (await el.isExisting()) {
        const txt = await el.getText();
        if (txt) return txt;
      }
    } catch { /* fall through */ }
    try {
      const errEl = await this.driver.$('//android.widget.TextView[contains(@text,"Invalid") or contains(@text,"Error") or contains(@text,"failed") or contains(@text,"incorrect") or contains(@text,"Firebase")]');
      if (await errEl.isExisting()) return await errEl.getText();
    } catch { /* fall through */ }
    return '';
  }
}

module.exports = LoginPage;
