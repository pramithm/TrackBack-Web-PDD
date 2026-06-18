/**
 * TrackBack Android – Page Object: Home / Dashboard Screen
 */

class HomePage {
  constructor(driver) {
    this.driver = driver;
  }

  // ─── Accessibility ID selectors (testID-based) ──────────────────────────
  get bottomTabBar()   { return this.driver.$('~bottom-tab-bar'); }
  get lostTab()        { return this.driver.$('~tab-lost'); }
  get foundTab()       { return this.driver.$('~tab-found'); }
  get searchTab()      { return this.driver.$('~tab-search'); }
  get chatTab()        { return this.driver.$('~tab-chat'); }
  get reportButton()   { return this.driver.$('~report-item-btn'); }
  get avatarButton()   { return this.driver.$('~avatar-button'); }

  // ─── XPath fallbacks (text-based) ─────────────────────────────────────
  get lostTabXP()      { return this.driver.$('//android.widget.TextView[contains(@text,"Lost")]'); }
  get foundTabXP()     { return this.driver.$('//android.widget.TextView[contains(@text,"Found")]'); }
  get searchTabXP()    { return this.driver.$('//android.widget.TextView[contains(@text,"Search")]'); }
  get chatTabXP()      { return this.driver.$('//android.widget.TextView[contains(@text,"Chat")]'); }

  // ─── Wait until home/dashboard screen is ready ──────────────────────────
  async waitForDashboard(timeoutMs = 25000) {
    // Primary: accessibility-id tab bar
    try {
      await this.bottomTabBar.waitForExist({ timeout: timeoutMs });
      return;
    } catch { /* fall through */ }
    // Secondary: any tab text containing "Lost" or "Home"
    try {
      await this.lostTabXP.waitForExist({ timeout: timeoutMs });
      return;
    } catch { /* fall through */ }
    // Tertiary: avatar button visible = we are on home screen
    await this.avatarButton.waitForExist({ timeout: timeoutMs });
  }

  // ─── Check if dashboard is visible ─────────────────────────────────────
  async isVisible() {
    // Try accessibility ID first
    try {
      const tabBar = await this.bottomTabBar;
      if (await tabBar.isExisting()) return await tabBar.isDisplayed();
    } catch { /* fall through */ }
    // Fallback: check for any tab label via XPath
    try {
      const el = await this.lostTabXP;
      if (await el.isExisting()) return await el.isDisplayed();
    } catch { /* fall through */ }
    return false;
  }

  // ─── Tab navigation actions ─────────────────────────────────────────────
  async tapLostTab() {
    try {
      const el = await this.lostTab;
      if (await el.isExisting()) { await el.click(); return; }
    } catch { /* fall through */ }
    try {
      const el = await this.lostTabXP;
      await el.waitForExist({ timeout: 5000 });
      await el.click();
    } catch (err) {
      throw new Error(`tapLostTab failed: ${err.message}`);
    }
  }

  async tapFoundTab() {
    try {
      const el = await this.foundTab;
      if (await el.isExisting()) { await el.click(); return; }
    } catch { /* fall through */ }
    try {
      const el = await this.foundTabXP;
      await el.waitForExist({ timeout: 5000 });
      await el.click();
    } catch (err) {
      throw new Error(`tapFoundTab failed: ${err.message}`);
    }
  }

  async tapSearchTab() {
    try {
      const el = await this.searchTab;
      if (await el.isExisting()) { await el.click(); return; }
    } catch { /* fall through */ }
    const el = await this.searchTabXP;
    await el.waitForExist({ timeout: 5000 });
    await el.click();
  }

  async tapChatTab() {
    try {
      const el = await this.chatTab;
      if (await el.isExisting()) { await el.click(); return; }
    } catch { /* fall through */ }
    const el = await this.chatTabXP;
    await el.waitForExist({ timeout: 5000 });
    await el.click();
  }
}

module.exports = HomePage;
