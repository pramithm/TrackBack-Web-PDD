# Dependency Vulnerability Report

**Date:** 2026-06-21 10:30:48 UTC · **Build:** #15

## Tools Used
- npm audit (Frontend + Mobile)
- Trivy filesystem scan

## Audit Results

```
## 📦 Frontend Dependency Audit
Serialize JavaScript is Vulnerable to RCE via RegExp.flags and Date.prototype.toISOString() - https://github.com/advisories/GHSA-5c6j-r48x-rmvq
Serialize JavaScript has CPU Exhaustion Denial of Service via crafted array-like objects - https://github.com/advisories/GHSA-qj8w-gfj5-8c6v
fix available via `npm audit fix --force`
Will install mocha@11.3.0, which is a breaking change
node_modules/serialize-javascript

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix --force`
Will install exceljs@3.4.0, which is a breaking change
node_modules/uuid
  exceljs  >=3.5.0
  Depends on vulnerable versions of uuid
  node_modules/exceljs

vite  8.0.0 - 8.0.15
Severity: high
launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows - https://github.com/advisories/GHSA-v6wh-96g9-6wx3
vite: `server.fs.deny` bypass on Windows alternate paths - https://github.com/advisories/GHSA-fx2h-pf6j-xcff
fix available via `npm audit fix`
Frontend/node_modules/vite

6 vulnerabilities (1 low, 3 moderate, 2 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

## 📦 Mobile Dependency Audit
          Depends on vulnerable versions of expo-constants
          node_modules/expo-linking
          expo-router  <=0.0.33 || 4.0.13-canary-20241211-61c49bd || 4.0.18-canary-20250124-42fe332 - 4.0.18-canary-20250306-d9d3e02 || 4.0.20-canary-20250320-7a205d3 || 4.0.21 - 5.0.2-preview.6 || 5.2.0-canary-20250611-f0afe80 - 55.0.0-canary-20260223-05214f1 || 55.0.3-canary-20260424-7bedc9d - 55.0.3-canary-20260429-a5e59cf || 55.0.9-canary-20260327-0789fbc - 55.0.9-canary-20260402-9da566b || 56.0.0-canary-20260212-4f61309 - 56.0.0-canary-20260506-964f25d
          Depends on vulnerable versions of expo-constants
          Depends on vulnerable versions of expo-linking
          node_modules/expo-router
      @expo/prebuild-config  *
      Depends on vulnerable versions of @expo/config
      Depends on vulnerable versions of @expo/config-plugins
      node_modules/@expo/prebuild-config
        expo-splash-screen  <=0.0.1-canary-20240418-8d74597 || 0.11.0 - 56.0.0-canary-20260506-964f25d
        Depends on vulnerable versions of @expo/prebuild-config
        node_modules/expo-splash-screen

ws  6.0.0 - 6.2.3 || 7.0.0 - 7.5.10
Severity: high
ws: Memory exhaustion DoS from tiny fragments and data chunks - https://github.com/advisories/GHSA-96hv-2xvq-fx4p
ws: Memory exhaustion DoS from tiny fragments and data chunks - https://github.com/advisories/GHSA-96hv-2xvq-fx4p
fix available via `npm audit fix`
node_modules/@react-native/dev-middleware/node_modules/ws
node_modules/react-native/node_modules/ws
node_modules/ws

24 vulnerabilities (1 low, 21 moderate, 1 high, 1 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

```

## Recommendations
- Run `npm audit fix` to auto-remediate low-risk vulnerabilities.
- Review and manually update packages flagged as HIGH or CRITICAL.
- Consider pinning dependency versions and using `npm ci` in production.
