/**
 * Appium / WebdriverIO capabilities configuration
 * TrackBack Android E2E Test Suite
 */

const path = require('path');

const APK_PATH = process.env.APK_PATH
  || path.resolve(__dirname, '../apk/app-debug.apk');

const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'TrackBack_AVD',
  'appium:app': APK_PATH,
  'appium:appPackage': 'com.mounikamouni12.FrontEnd',
  'appium:appActivity': 'com.mounikamouni12.FrontEnd.MainActivity',
  'appium:noReset': false,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 300,
  'appium:autoGrantPermissions': true,
  'appium:skipUnlock': true,
  'appium:uiautomator2ServerInstallTimeout': 60000,
  'appium:androidInstallTimeout': 90000,
};

const config = {
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
  capabilities,
  logLevel: 'warn',
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
};

module.exports = { capabilities, config };
