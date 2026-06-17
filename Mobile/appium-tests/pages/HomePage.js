/**
 * TrackBack Android – Page Object: Home / Dashboard Screen
 */

class HomePage {
  constructor(driver) {
    this.driver = driver;
  }

  get bottomTabBar()   { return this.driver.$('~bottom-tab-bar'); }
  get lostTab()        { return this.driver.$('~tab-lost'); }
  get foundTab()       { return this.driver.$('~tab-found'); }
  get searchTab()      { return this.driver.$('~tab-search'); }
  get chatTab()        { return this.driver.$('~tab-chat'); }
  get reportButton()   { return this.driver.$('~report-item-btn'); }

  // Fallback XPaths
  get bottomTabBarXP() { return this.driver.$('//android.widget.HorizontalScrollView'); }
  get lostTabXP()      { return this.driver.$('//android.widget.TextView[@text="Lost"]'); }
  get foundTabXP()     { return this.driver.$('//android.widget.TextView[@text="Found"]'); }
  get searchTabXP()    { return this.driver.$('//android.widget.TextView[@text="Search"]'); }

  async waitForDashboard(timeoutMs = 20000) {
    // Wait for the tab bar OR any core nav element
    try {
      await this.bottomTabBar.waitForExist({ timeout: timeoutMs });
    } catch {
      await this.lostTabXP.waitForExist({ timeout: timeoutMs });
    }
  }

  async isVisible() {
    try {
      return (await this.lostTabXP).isDisplayed();
    } catch {
      return false;
    }
  }

  async tapLostTab() {
    try {
      const el = await this.lostTab;
      if (await el.isExisting()) { await el.click(); return; }
    } catch { /* */ }
    await (await this.lostTabXP).click();
  }

  async tapFoundTab() {
    try {
      const el = await this.foundTab;
      if (await el.isExisting()) { await el.click(); return; }
    } catch { /* */ }
    await (await this.foundTabXP).click();
  }
}

module.exports = HomePage;
