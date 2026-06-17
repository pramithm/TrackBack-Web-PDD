# TrackBack – CI/CD, Testing & Security Setup Guide

## Repository
`pramithm/TrackBack-Web-PDD`

---

## 📁 Folder Structure

```
TrackBack Web Application/
├── .github/
│   ├── workflows/
│   │   ├── android-e2e.yml          ← Android Appium E2E + GitHub Pages report
│   │   ├── deploy-and-test.yml      ← Web deploy + Selenium E2E + report publish
│   │   └── security-review.yml      ← SAST + Dependency + Secret scan
│   └── scripts/
│       └── generate-security-reports.js
│
├── Frontend/
│   ├── selenium-tests/
│   │   ├── tests/
│   │   │   └── login.test.js        ← Selenium E2E tests (5 test cases)
│   │   └── scripts/
│   │       └── generate-reports.js  ← HTML/Excel/MD report generator
│   └── package.json
│
└── Mobile/
    └── appium-tests/
        ├── config/
        │   └── appium.config.js     ← Appium capabilities
        ├── pages/
        │   ├── LoginPage.js         ← POM – Login screen
        │   └── HomePage.js          ← POM – Dashboard
        ├── helpers/
        │   └── appiumHelpers.js     ← Screenshot, result recording utilities
        ├── tests/
        │   ├── login.test.js        ← TC-001 to TC-008 (Auth tests)
        │   └── navigation.test.js   ← TC-009 to TC-012 (Navigation tests)
        ├── scripts/
        │   ├── generate-reports.js  ← HTML/Excel/MD generator
        │   └── setup-test-dirs.js   ← Pre-test dir creation
        └── package.json
```

---

## 🔐 Required GitHub Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | Required By |
|-------------|-------------|-------------|
| `TEST_EMAIL` | Firebase test user email | Web Selenium + Android Appium |
| `TEST_PASSWORD` | Firebase test user password | Web Selenium + Android Appium |
| `VITE_FIREBASE_API_KEY` | Firebase API key | Web build |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Web build |
| `VITE_FIREBASE_DATABASE_URL` | Firebase RTDB URL | Web build |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Web build |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Web build |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | Web build |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | Web build |
| `SEMGREP_APP_TOKEN` | Semgrep cloud token (optional) | Security scan |
| `GITLEAKS_LICENSE` | Gitleaks license (optional) | Secret detection |

---

## ⚙️ Required GitHub Pages Settings

1. Go to **Settings → Pages**
2. Set Source: **GitHub Actions** (not from a branch)
   - OR set Source: **Deploy from a branch** → branch: `gh-pages` → folder: `/ (root)`
3. After first push, your Pages URL will be:
   `https://pramithm.github.io/TrackBack-Web-PDD/`

---

## 🌐 Web Frontend – GitHub Actions Workflow

**File:** `.github/workflows/deploy-and-test.yml`

**Trigger:** push to `main`, pull_request, workflow_dispatch

### Pipeline Steps:
1. Checkout → Install → Build Vite app
2. Deploy `Frontend/dist` to GitHub Pages (`gh-pages` branch)
3. Wait 45s → Verify HTTP 200 from live URL (5 retries)
4. Run Selenium E2E tests against live URL (headless Chrome)
5. Generate HTML + Excel + Markdown reports
6. Upload artifacts: `selenium-e2e-reports-<build>`
7. Publish reports to GitHub Pages at `/web-reports/latest/`
8. Publish GitHub Actions Summary

**Live Report URL after run:**
```
https://pramithm.github.io/TrackBack-Web-PDD/web-reports/latest/execution-report.html
```

### Local Execution:
```bash
cd Frontend
export BASE_URL=https://pramithm.github.io/TrackBack-Web-PDD/
export TEST_EMAIL=your@email.com
export TEST_PASSWORD=yourpassword
npm run test:e2e        # run tests
npm run generate:report  # generate reports
```

---

## 📱 Android Frontend – Appium E2E Workflow

**File:** `.github/workflows/android-e2e.yml`

**Trigger:** push to `main`, pull_request, workflow_dispatch

### Pipeline Steps:
1. Build APK from `Mobile/android` using Gradle
2. Enable KVM for emulator acceleration
3. Start Android Emulator (API 29, Google APIs, x86_64)
4. Install Appium 2.x + UIAutomator2 driver
5. Start Appium server in background
6. Run 12 Appium test cases (TC-001 to TC-012)
7. Generate HTML + Excel + Markdown reports
8. Upload artifacts: `android-e2e-reports-<build>`
9. Publish reports to GitHub Pages at `/android-reports/`
10. Publish GitHub Actions Summary

**Test Cases:**
| ID | Test Case | Suite |
|----|-----------|-------|
| TC-001 | App launches successfully | Login |
| TC-002 | Login screen is displayed | Login |
| TC-003 | Valid credentials → Dashboard | Login |
| TC-004 | Invalid credentials → Error | Login |
| TC-005 | Empty form → Validation | Login |
| TC-006 | Navigate to Sign Up | Login |
| TC-007 | Dashboard tabs visible | Login |
| TC-008 | Logout → Login screen | Login |
| TC-009 | Lost tab shows list | Navigation |
| TC-010 | Found tab shows list | Navigation |
| TC-011 | Search tab accessible | Navigation |
| TC-012 | Chat tab accessible | Navigation |

**Live Report URL:**
```
https://pramithm.github.io/TrackBack-Web-PDD/android-reports/reports/latest/execution-report.html
```

### Local Execution:
```bash
# Ensure Appium server is running: appium --port 4723
# Ensure emulator is running: emulator -avd TrackBack_AVD
cd Mobile/appium-tests
npm install
export TEST_EMAIL=your@email.com
export TEST_PASSWORD=yourpassword
npm test
node scripts/generate-reports.js
```

---

## 🔒 Backend Security Review Workflow

**File:** `.github/workflows/security-review.yml`

**Trigger:** push to `main`, pull_request, workflow_dispatch

### Pipeline Steps:
1. Detect technology stack (React, Vite, Firebase, Expo)
2. Inventory all API endpoints and services
3. Run Semgrep SAST (JavaScript, React, secrets, OWASP Top 10)
4. Run npm audit (Frontend + Mobile)
5. Run Trivy filesystem scan
6. Run Gitleaks secret detection (full git history)
7. Generate security reports
8. Upload artifacts: `security-reports-<build>`
9. Fail on Critical findings

### Generated Reports:
```
Vulnerability Test Results/
├── security-review.md      ← Detailed findings (severity, type, fix)
├── executive-summary.md    ← Executive summary + security score
├── dependency-report.md    ← npm audit + Trivy results
├── findings.xlsx           ← Excel: Findings + Endpoints + Risk Summary
└── endpoint-inventory.xlsx ← Excel: Full API inventory
```

### Known Findings (Manual Review):
| # | Severity | Finding |
|---|----------|---------|
| 1 | HIGH | Hardcoded Firebase credentials in source |
| 2 | HIGH | Missing Firebase Security Rules enforcement |
| 3 | HIGH | Client-side AI API key exposure risk |
| 4 | MEDIUM | Missing Content Security Policy |
| 5 | MEDIUM | Cloudinary upload preset exposure risk |
| 6 | MEDIUM | No rate limiting on Firebase Auth |
| 7 | MEDIUM | Potential Stored XSS via user input |
| 8 | LOW | Debug console leakage |
| 9 | LOW | Missing logout-all-devices |
| 10 | LOW | Weak CORS (Firebase RTDB) |

**Security Score: ~55/100** (Needs Improvement – credentials exposure is primary risk)

---

## 📊 GitHub Pages Report Structure

After workflows run, GitHub Pages will serve:

```
https://pramithm.github.io/TrackBack-Web-PDD/
│
├── (Web App – root)
│
├── web-reports/
│   ├── latest/
│   │   ├── execution-report.html   ← Selenium E2E HTML report
│   │   ├── summary.md
│   │   ├── Screenshots/
│   │   └── Logs/
│   └── history/
│       ├── build-001/
│       └── build-002/
│
└── android-reports/
    └── reports/
        ├── latest/
        │   ├── execution-report.html  ← Appium E2E HTML report
        │   └── summary.md
        └── history/
            ├── build-001/
            └── build-002/
```

---

## 🚀 Quick Start

1. Push any change to `main`
2. Go to [GitHub Actions](https://github.com/pramithm/TrackBack-Web-PDD/actions)
3. All 3 workflows trigger automatically
4. After completion, visit:
   - Web App: `https://pramithm.github.io/TrackBack-Web-PDD/`
   - Web E2E Report: `https://pramithm.github.io/TrackBack-Web-PDD/web-reports/latest/execution-report.html`
   - Android Report: `https://pramithm.github.io/TrackBack-Web-PDD/android-reports/reports/latest/execution-report.html`
