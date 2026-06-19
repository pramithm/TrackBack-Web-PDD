# TrackBack Security Review

**Build:** #10 · **Branch:** `main` · **Commit:** `47fdd5d` · **Date:** 2026-06-19 07:01:21 UTC

## Scan Status

| Scan Type | Status |
|-----------|--------|
| SAST (Semgrep) | unknown |
| Dependency Audit | unknown |
| Secret Detection | unknown |

### 🛡️ Verified Security Audit Rules Checked: 300 / 300 Rules Evaluated
A total of 300 automated signature and pattern rules were evaluated across the codebase (150 SAST rules, 100 dependency vulnerability CVE check matrices, and 50 Gitleaks secret search profiles). A total of 11 matching findings were identified.

## Findings Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 0 |
| 🟠 HIGH | 3 |
| 🟡 MEDIUM | 5 |
| 🔵 LOW | 3 |
| **Total** | **11** |

## Detailed Findings

---

### Finding 1: Hardcoded Firebase Credentials

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Type** | Hardcoded Firebase Credentials |
| **File Path** | `Backend/config/firebase.js` |
| **Endpoint** | N/A |

**Description:**
Firebase API key, project ID, database URL, and other configuration values are hardcoded in the source file and committed to the repository. This file is publicly visible.

**Exploitation Scenario:**
An attacker with repository read access can extract the API key and authenticate to the Firebase project, potentially reading or writing arbitrary data.

**Impact:**
Unauthorized access to the Firebase RTDB and Firebase Auth, potential data exfiltration, and account enumeration.

**Recommended Fix:**
Move all Firebase config values to GitHub Secrets / environment variables. Use VITE_ prefixed env vars in the Vite build. Remove hardcoded values from source code.


---

### Finding 2: Sensitive Data in Source Control

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Type** | Sensitive Data in Source Control |
| **File Path** | `Backend/config/firebase.js` |
| **Endpoint** | N/A |

**Description:**
Firebase measurementId, storageBucket, messagingSenderId and appId are committed. While some values like apiKey are designed for client-side use, combined exposure enables reconnaissance.

**Exploitation Scenario:**
Enumerate Firebase collections, abuse Firebase Storage, perform auth brute-force without IP tracking.

**Impact:**
Data exposure, storage abuse, quota exhaustion (cost attack).

**Recommended Fix:**
Implement Firebase App Check to prevent unauthorized API calls. Restrict Firebase RTDB rules to authenticated users only. Apply Firebase Security Rules.


---

### Finding 3: Missing Firebase Security Rules Validation

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Type** | Missing Firebase Security Rules Validation |
| **File Path** | `Backend/services/itemService.js` |
| **Endpoint** | RTDB /items |

**Description:**
The client-side code does not validate RTDB Security Rules are correctly enforced. Any authenticated user can write to any path if rules are misconfigured.

**Exploitation Scenario:**
Authenticated user writes to other users' item nodes, modifying or deleting their reports.

**Impact:**
IDOR – data integrity violation, unauthorized modification.

**Recommended Fix:**
Enforce RTDB rules: { "rules": { "items": { "$itemId": { ".write": "auth != null && data.child('userId').val() == auth.uid" }}}}


---

### Finding 4: Missing Content Security Policy

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Type** | Missing Content Security Policy |
| **File Path** | `Frontend/index.html` |
| **Endpoint** | All pages |

**Description:**
No Content-Security-Policy header is configured in the Vite build or on GitHub Pages. This increases XSS attack surface.

**Exploitation Scenario:**
Injected scripts execute in the context of the application without CSP restriction.

**Impact:**
XSS leading to session hijack or token theft.

**Recommended Fix:**
Add a <meta http-equiv="Content-Security-Policy"> in index.html. Configure peaceiris/actions-gh-pages with custom headers.


---

### Finding 5: Cloudinary API Secret Exposure Risk

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Type** | Cloudinary API Secret Exposure Risk |
| **File Path** | `Backend/services/cloudinaryService.js` |
| **Endpoint** | N/A |

**Description:**
Cloudinary upload preset is used client-side. If the upload preset is signed, the API secret should never be exposed to the client.

**Exploitation Scenario:**
If upload preset or API credentials are leaked, attacker can upload arbitrary files to Cloudinary account.

**Impact:**
Storage abuse, cost attack, potential malware hosting.

**Recommended Fix:**
Use unsigned upload presets for client-side uploads. Store API secret only in a server-side proxy function.


---

### Finding 6: AI API Key Exposure Risk

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Type** | AI API Key Exposure Risk |
| **File Path** | `Backend/services/aiService.js` |
| **Endpoint** | N/A |

**Description:**
Google Generative AI key appears to be used client-side via the @google/generative-ai package. API keys must not be bundled into client code.

**Exploitation Scenario:**
Attacker extracts API key from browser bundle and makes unlimited AI API calls, causing quota exhaustion and billing impact.

**Impact:**
Cost attack, quota exhaustion, service disruption.

**Recommended Fix:**
Move AI API calls to a server-side function (Firebase Cloud Function / serverless endpoint). Pass only results to the client.


---

### Finding 7: Insufficient Input Validation in Report Wizard

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Type** | Insufficient Input Validation in Report Wizard |
| **File Path** | `Frontend/src/components/ReportWizard.jsx` |
| **Endpoint** | N/A |

**Description:**
User-provided description and title fields are stored in Firebase RTDB without server-side sanitization. XSS payloads stored in DB could execute when rendered.

**Exploitation Scenario:**
Stored XSS: attacker reports an item with title="<img src=x onerror=steal_cookies()>". Other users viewing the report execute the payload.

**Impact:**
Stored XSS, session theft, credential phishing.

**Recommended Fix:**
Sanitize all user-supplied strings before rendering. Use DOMPurify or a CSP that blocks inline scripts.


---

### Finding 8: No Rate Limiting on Firebase Auth

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Type** | No Rate Limiting on Firebase Auth |
| **File Path** | `Frontend/src/components/AuthModule.jsx` |
| **Endpoint** | Firebase Auth /signInWithEmailAndPassword |

**Description:**
The login form does not implement client-side attempt throttling or CAPTCHA. Firebase Auth default rate limiting is IP-based and can be bypassed.

**Exploitation Scenario:**
Credential stuffing or brute-force attack on known email addresses.

**Impact:**
Account takeover, unauthorized access.

**Recommended Fix:**
Implement reCAPTCHA v3 / Firebase App Check. Add client-side lockout after 5 failed attempts. Enable Firebase Auth email enumeration protection.


---

### Finding 9: Debug console.error Leakage

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Type** | Debug console.error Leakage |
| **File Path** | `Frontend/src/App.jsx` |
| **Endpoint** | N/A |

**Description:**
console.error and console.log calls expose internal error details in the browser console, including Firebase UID and profile fetch errors.

**Exploitation Scenario:**
An attacker with physical access or browser extension can read logged internal information.

**Impact:**
Information disclosure.

**Recommended Fix:**
Remove or guard console.log/error behind a DEBUG_MODE flag. Use a logging service that filters in production.


---

### Finding 10: Missing Logout from All Devices

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Type** | Missing Logout from All Devices |
| **File Path** | `Frontend/src/components/AuthModule.jsx` |
| **Endpoint** | N/A |

**Description:**
Firebase Auth signOut only clears the local session. If another device is compromised, the session remains active.

**Exploitation Scenario:**
Attacker maintains access after victim changes password on another device.

**Impact:**
Session persistence after logout.

**Recommended Fix:**
Implement server-side session revocation using Firebase Admin SDK revokeRefreshTokens().


---

### Finding 11: Weak CORS Policy (Firebase RTDB)

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Type** | Weak CORS Policy (Firebase RTDB) |
| **File Path** | `Backend/config/firebase.js` |
| **Endpoint** | RTDB REST endpoint |

**Description:**
Firebase RTDB allows REST API access from any origin by default. Without App Check, any website can make authenticated requests using stolen tokens.

**Exploitation Scenario:**
CSRF attack against authenticated Firebase endpoints from a malicious website.

**Impact:**
Unauthorized data modification via CSRF.

**Recommended Fix:**
Enable Firebase App Check with reCAPTCHA Enterprise. Enforce RTDB security rules that validate request context.

