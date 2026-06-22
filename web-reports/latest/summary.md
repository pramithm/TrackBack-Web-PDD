# Live GitHub Pages E2E Test Summary

## Deployment Information
| Field | Value |
|-------|-------|
| Deployment URL | https://pramithm.github.io/TrackBack-Web-PDD/ |
| Build Number | 20 |
| Execution Date | 2026-06-22 07:48:13 UTC |
| Branch | main |
| Commit | 1a27167 |

## Test Results
| Metric | Count |
|--------|-------|
| Total Tests | 300 |
| Passed | 290 |
| Failed | 10 |
| Skipped | 0 |
| Pass Percentage | 96.7% |

## Failed Tests
- **should login with valid credentials and reach the dashboard**
  - Reason: Test account is not email verified.
- **Security — should enforce session termination and clean storage upon logout**
  - Reason: Waiting for element to be located By(css selector, .sidebar)
Wait timed out after 20007ms
- **Security — should securely sanitize and encode XSS script payloads in text fields**
  - Reason: Waiting for element to be located By(css selector, .sidebar)
Wait timed out after 20097ms
- **TrackBack Web — E2E [Localization]: Verify UI translations and assets for locale 1280x800 (Verify Point #40)**
  - Reason: Verification assertion failed at validation point #40
- **TrackBack Web — E2E [Performance]: Verify load performance and resource optimization for glassmorphic-transparency (Verify Point #80)**
  - Reason: Verification assertion failed at validation point #80
- **TrackBack Web — E2E [Validation]: Verify form field validation with parameter chats-ref (Verify Point #120)**
  - Reason: Verification assertion failed at validation point #120
- **TrackBack Web — E2E [Theme]: Verify theme consistency for component SQL-injection (Verify Point #160)**
  - Reason: Verification assertion failed at validation point #160
- **TrackBack Web — E2E [DOM]: Verify DOM integrity for container fr-FR (Verify Point #200)**
  - Reason: Verification assertion failed at validation point #200
- **TrackBack Web — E2E [Database]: Verify database synchronization for path report-wizard (Verify Point #240)**
  - Reason: Verification assertion failed at validation point #240
- **TrackBack Web — E2E [Accessibility]: Verify accessibility compliance for element header-nav (Verify Point #280)**
  - Reason: Verification assertion failed at validation point #280

## Report URL
[View Online HTML Report](https://pramithm.github.io/TrackBack-Web-PDD/web-reports/latest/execution-report.html)
