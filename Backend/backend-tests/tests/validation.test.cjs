/**
 * TrackBack Backend – Input Validation Tests
 * Tests comprehensive input validation, sanitization, regex patterns, and data integrity.
 * Suite: 80 test cases (BT-401 → BT-480)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const results = [];
function recordResult(r) { results.push({ ...r, timestamp: new Date().toISOString() }); }

after(function () {
  const dir = path.resolve(__dirname, '../Test Results');
  fs.mkdirSync(dir, { recursive: true });
  const existing = path.join(dir, 'recorded-results.json');
  let all = [];
  if (fs.existsSync(existing)) { try { all = JSON.parse(fs.readFileSync(existing, 'utf8')); } catch { all = []; } }
  fs.writeFileSync(existing, JSON.stringify([...all, ...results], null, 2), 'utf8');
  console.log(`\n📊 Validation tests: ${results.filter(r => r.status === 'passed').length}/${results.length} passed`);
});

// ─── Validation Utilities ─────────────────────────────────────────────────────
const PHONE_REGEX = /^[0-9]{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;
const FIREBASE_KEY_REGEX = /^-[A-Za-z0-9_-]+$/;

function isValidPhone(phone) {
  return PHONE_REGEX.test(phone);
}

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email);
}

function isValidUrl(url) {
  return typeof url === 'string' && URL_REGEX.test(url);
}

function isValidFirebaseKey(key) {
  return typeof key === 'string' && FIREBASE_KEY_REGEX.test(key);
}

function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').replace(/['"`;]/g, '').trim();
}

function coerceToString(val) {
  if (val === null || val === undefined) return '';
  return String(val);
}

function isWithinRange(value, min, max) {
  return typeof value === 'number' && value >= min && value <= max;
}

function truncateString(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.length > maxLen ? str.substring(0, maxLen) : str;
}

function parseJSONSafe(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function capitalizeFirst(str) {
  if (typeof str !== 'string' || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

describe('TrackBack Backend — Input Validation Tests', function () {
  this.timeout(30000);

  // ── BT-401 to BT-420: Phone Number Validation ─────────────────────────────
  const validPhones = ['9876543210', '1234567890', '0000000000', '9999999999', '5555555555'];
  const invalidPhones = ['987654321', '98765432101', 'abcdefghij', '+919876543210', '9876543-21'];

  validPhones.forEach((phone, idx) => {
    it(`BT-${401 + idx} | Valid phone accepted: ${phone}`, function () {
      const start = Date.now();
      const label = `BT-${401 + idx} Valid phone: ${phone}`;
      try {
        assert.strictEqual(isValidPhone(phone), true);
        recordResult({ name: label, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: label, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });

  invalidPhones.forEach((phone, idx) => {
    it(`BT-${406 + idx} | Invalid phone rejected: "${phone}"`, function () {
      const start = Date.now();
      const label = `BT-${406 + idx} Invalid phone: "${phone}"`;
      try {
        assert.strictEqual(isValidPhone(phone), false);
        recordResult({ name: label, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: label, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });

  // ── BT-411 to BT-430: URL Validation ──────────────────────────────────────
  const validUrls = [
    'https://res.cloudinary.com/image.jpg',
    'http://example.com',
    'https://pramithm.github.io/TrackBack-Web-PDD/',
    'https://trackback-1c73e-default-rtdb.asia-southeast1.firebasedatabase.app',
    'https://www.sub.domain.co.uk/path?query=1',
  ];
  const invalidUrls = ['not-a-url', '', 'ftp://nothttp.com', 'justext', null];

  validUrls.forEach((url, idx) => {
    it(`BT-${411 + idx} | Valid URL accepted`, function () {
      const start = Date.now();
      const label = `BT-${411 + idx} Valid URL: ${String(url).substring(0, 40)}`;
      try {
        assert.strictEqual(isValidUrl(url), true);
        recordResult({ name: label, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: label, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });

  invalidUrls.forEach((url, idx) => {
    it(`BT-${416 + idx} | Invalid URL rejected: "${url}"`, function () {
      const start = Date.now();
      const label = `BT-${416 + idx} Invalid URL: "${url}"`;
      try {
        assert.strictEqual(isValidUrl(url), false);
        recordResult({ name: label, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: label, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });

  // ── BT-421 to BT-450: Sanitization Tests ─────────────────────────────────
  const sanitizeCases = [
    { input: '<script>alert(1)</script>', expected: 'alert(1)' },
    { input: 'Normal text', expected: 'Normal text' },
    { input: '<b>Bold</b>', expected: 'Bold' },
    { input: 'Hello "World"', expected: 'Hello World' },
    { input: "It's here", expected: 'Its here' },
    { input: '  spaces  ', expected: 'spaces' },
    { input: 'SELECT * FROM users;', expected: 'SELECT * FROM users' },
    { input: '<img onerror="evil()">', expected: '' },
    { input: 'Clean & safe', expected: 'Clean & safe' },
    { input: '', expected: '' },
    { input: '<>', expected: '' },
    { input: 'Back`tick', expected: 'Backtick' },
  ];

  sanitizeCases.forEach(({ input, expected }, idx) => {
    it(`BT-${421 + idx} | Sanitize: "${input.substring(0, 25)}"`, function () {
      const start = Date.now();
      const label = `BT-${421 + idx} sanitize "${input.substring(0, 20)}"`;
      try {
        assert.strictEqual(sanitizeString(input), expected);
        recordResult({ name: label, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: label, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });

  // ── BT-433 to BT-460: Type Coercion & Range Tests ─────────────────────────
  it('BT-433 | coerceToString(null) returns empty string', function () {
    const start = Date.now();
    try { assert.strictEqual(coerceToString(null), ''); recordResult({ name: 'BT-433 coerce null → ""', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-433 coerce null', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-434 | coerceToString(undefined) returns empty string', function () {
    const start = Date.now();
    try { assert.strictEqual(coerceToString(undefined), ''); recordResult({ name: 'BT-434 coerce undefined → ""', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-434 coerce undefined', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-435 | coerceToString(42) returns "42"', function () {
    const start = Date.now();
    try { assert.strictEqual(coerceToString(42), '42'); recordResult({ name: 'BT-435 coerce 42 → "42"', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-435 coerce 42', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-436 | coerceToString(true) returns "true"', function () {
    const start = Date.now();
    try { assert.strictEqual(coerceToString(true), 'true'); recordResult({ name: 'BT-436 coerce true → "true"', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-436 coerce true', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-437 | isWithinRange(50, 1, 100) is true', function () {
    const start = Date.now();
    try { assert.strictEqual(isWithinRange(50, 1, 100), true); recordResult({ name: 'BT-437 50 in [1,100]', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-437 isWithinRange 50', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-438 | isWithinRange(0, 1, 100) is false', function () {
    const start = Date.now();
    try { assert.strictEqual(isWithinRange(0, 1, 100), false); recordResult({ name: 'BT-438 0 not in [1,100]', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-438 isWithinRange 0', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-439 | isWithinRange(1, 1, 100) is true (min boundary)', function () {
    const start = Date.now();
    try { assert.strictEqual(isWithinRange(1, 1, 100), true); recordResult({ name: 'BT-439 1 at min boundary', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-439 min boundary', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-440 | isWithinRange(100, 1, 100) is true (max boundary)', function () {
    const start = Date.now();
    try { assert.strictEqual(isWithinRange(100, 1, 100), true); recordResult({ name: 'BT-440 100 at max boundary', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-440 max boundary', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-441 | isWithinRange("50", 1, 100) is false (not a number)', function () {
    const start = Date.now();
    try { assert.strictEqual(isWithinRange('50', 1, 100), false); recordResult({ name: 'BT-441 string arg not in range', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-441 string range check', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-442 | truncateString("Hello World", 5) returns "Hello"', function () {
    const start = Date.now();
    try { assert.strictEqual(truncateString('Hello World', 5), 'Hello'); recordResult({ name: 'BT-442 truncate to 5', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-442 truncate', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-443 | truncateString with str shorter than max returns original', function () {
    const start = Date.now();
    try { assert.strictEqual(truncateString('Hi', 10), 'Hi'); recordResult({ name: 'BT-443 truncate short str', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-443 truncate short', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-444 | truncateString with non-string returns empty', function () {
    const start = Date.now();
    try { assert.strictEqual(truncateString(42, 5), ''); recordResult({ name: 'BT-444 truncate non-string', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-444 truncate non-string', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-445 | parseJSONSafe valid JSON returns object', function () {
    const start = Date.now();
    try {
      const result = parseJSONSafe('{"name":"test"}');
      assert.strictEqual(result.name, 'test');
      recordResult({ name: 'BT-445 parseJSONSafe valid JSON', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-445 parseJSONSafe valid', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-446 | parseJSONSafe invalid JSON returns null', function () {
    const start = Date.now();
    try { assert.strictEqual(parseJSONSafe('not-json'), null); recordResult({ name: 'BT-446 parseJSONSafe invalid returns null', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-446 parseJSONSafe invalid', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-447 | parseJSONSafe empty string returns null', function () {
    const start = Date.now();
    try { assert.strictEqual(parseJSONSafe(''), null); recordResult({ name: 'BT-447 parseJSONSafe empty string', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-447 parseJSONSafe empty', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-448 | capitalizeFirst("hello") returns "Hello"', function () {
    const start = Date.now();
    try { assert.strictEqual(capitalizeFirst('hello'), 'Hello'); recordResult({ name: 'BT-448 capitalizeFirst works', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-448 capitalizeFirst', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-449 | capitalizeFirst("HELLO") returns "HELLO"', function () {
    const start = Date.now();
    try { assert.strictEqual(capitalizeFirst('HELLO'), 'HELLO'); recordResult({ name: 'BT-449 capitalizeFirst uppercase', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-449 capitalizeFirst uppercase', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-450 | capitalizeFirst("") returns ""', function () {
    const start = Date.now();
    try { assert.strictEqual(capitalizeFirst(''), ''); recordResult({ name: 'BT-450 capitalizeFirst empty', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-450 capitalizeFirst empty', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  // ── BT-451 to BT-480: Regex & Miscellaneous Validation ───────────────────
  const miscTests = [
    ['BT-451', 'PHONE_REGEX matches 10-digit string', () => PHONE_REGEX.test('9876543210')],
    ['BT-452', 'PHONE_REGEX rejects 9-digit string', () => !PHONE_REGEX.test('987654321')],
    ['BT-453', 'PHONE_REGEX rejects 11-digit string', () => !PHONE_REGEX.test('98765432101')],
    ['BT-454', 'PHONE_REGEX rejects alphabets', () => !PHONE_REGEX.test('abcdefghij')],
    ['BT-455', 'EMAIL_REGEX matches standard email', () => EMAIL_REGEX.test('user@example.com')],
    ['BT-456', 'EMAIL_REGEX rejects email without @', () => !EMAIL_REGEX.test('userexample.com')],
    ['BT-457', 'EMAIL_REGEX rejects email without domain', () => !EMAIL_REGEX.test('user@')],
    ['BT-458', 'URL_REGEX matches https URL', () => URL_REGEX.test('https://example.com')],
    ['BT-459', 'URL_REGEX matches http URL', () => URL_REGEX.test('http://example.com')],
    ['BT-460', 'URL_REGEX rejects plain text', () => !URL_REGEX.test('example.com')],
    ['BT-461', 'sanitizeString removes all HTML tags', () => !sanitizeString('<div>hello</div>').includes('<')],
    ['BT-462', 'sanitizeString trims leading/trailing spaces', () => sanitizeString('  hi  ') === 'hi'],
    ['BT-463', 'coerceToString(0) returns "0"', () => coerceToString(0) === '0'],
    ['BT-464', 'coerceToString(false) returns "false"', () => coerceToString(false) === 'false'],
    ['BT-465', 'coerceToString([1,2]) returns "1,2"', () => coerceToString([1,2]) === '1,2'],
    ['BT-466', 'isWithinRange(NaN, 1, 100) is false', () => !isWithinRange(NaN, 1, 100)],
    ['BT-467', 'isWithinRange(Infinity, 1, 100) is false', () => !isWithinRange(Infinity, 1, 100)],
    ['BT-468', 'truncateString at exact max returns unchanged', () => truncateString('Hello', 5) === 'Hello'],
    ['BT-469', 'truncateString at 0 max returns empty string', () => truncateString('Hello', 0) === ''],
    ['BT-470', 'parseJSONSafe returns array for JSON array', () => Array.isArray(parseJSONSafe('[1,2,3]'))],
    ['BT-471', 'parseJSONSafe returns null for undefined', () => parseJSONSafe(undefined) === null],
    ['BT-472', 'capitalizeFirst handles single char', () => capitalizeFirst('a') === 'A'],
    ['BT-473', 'capitalizeFirst does not touch rest of string', () => capitalizeFirst('hELLO') === 'HELLO'],
    ['BT-474', 'sanitizeString with null returns empty', () => sanitizeString(null) === ''],
    ['BT-475', 'sanitizeString with number returns empty', () => sanitizeString(123) === ''],
    ['BT-476', 'isValidPhone with null returns false', () => !isValidPhone(null)],
    ['BT-477', 'isValidEmail with null returns false', () => !isValidEmail(null)],
    ['BT-478', 'isValidUrl with null returns false', () => !isValidUrl(null)],
    ['BT-479', 'All regex constants are defined', () => [PHONE_REGEX, EMAIL_REGEX, URL_REGEX].every(r => r instanceof RegExp)],
    ['BT-480', 'All utility functions are callable', () => [isValidPhone, isValidEmail, isValidUrl, sanitizeString, coerceToString, isWithinRange, truncateString, parseJSONSafe, capitalizeFirst].every(f => typeof f === 'function')],
  ];

  miscTests.forEach(([id, name, fn]) => {
    it(`${id} | ${name}`, function () {
      const start = Date.now();
      try {
        assert.strictEqual(fn(), true, name);
        recordResult({ name: `${id} ${name}`, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: `${id} ${name}`, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });
});
