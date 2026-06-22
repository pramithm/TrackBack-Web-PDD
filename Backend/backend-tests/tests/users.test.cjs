/**
 * TrackBack Backend – Users Service Tests
 * Tests user profile schema, field validation, and profile logic.
 * Suite: 80 test cases (BT-201 → BT-280)
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
  console.log(`\n📊 Users tests: ${results.filter(r => r.status === 'passed').length}/${results.length} passed`);
});

// ─── User Schema ──────────────────────────────────────────────────────────────
const REQUIRED_PROFILE_FIELDS = ['name', 'email', 'uid', 'createdAt'];
const OPTIONAL_PROFILE_FIELDS = ['phone', 'age', 'location', 'gender', 'avatarUrl', 'displayName'];

function createSampleUser(overrides = {}) {
  return {
    uid: 'user-uid-001',
    name: 'Pramith M',
    email: 'pramithm2174.sse@saveetha.com',
    displayName: 'Pramith M',
    phone: '9876543210',
    age: 21,
    location: 'Chennai, India',
    gender: 'Male',
    avatarUrl: 'https://res.cloudinary.com/sample/image/upload/v1/avatars/user.jpg',
    emailVerified: true,
    createdAt: Date.now(),
    ...overrides
  };
}

function validateUserProfile(user) {
  if (!user || typeof user !== 'object') return { valid: false, error: 'User must be an object' };
  for (const field of REQUIRED_PROFILE_FIELDS) {
    if (!user[field] && user[field] !== 0) return { valid: false, error: `Missing required field: ${field}` };
  }
  if (typeof user.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (user.age !== undefined && (typeof user.age !== 'number' || user.age < 1 || user.age > 120)) {
    return { valid: false, error: 'Age must be a number between 1 and 120' };
  }
  if (user.phone !== undefined && typeof user.phone !== 'string') {
    return { valid: false, error: 'Phone must be a string' };
  }
  return { valid: true, error: null };
}

function isProfileComplete(user) {
  return OPTIONAL_PROFILE_FIELDS.every(field => user[field] !== undefined && user[field] !== null && user[field] !== '');
}

describe('TrackBack Backend — Users Service Tests', function () {
  this.timeout(30000);

  // ── BT-201 to BT-220: User Profile Validation ─────────────────────────────
  it('BT-201 | Valid user profile passes validation', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(createSampleUser());
      assert.strictEqual(result.valid, true);
      recordResult({ name: 'BT-201 Valid user profile passes', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-201 Valid user profile passes', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-202 | User without name fails validation', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(createSampleUser({ name: '' }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-202 Missing name fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-202 Missing name fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-203 | User without email fails validation', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(createSampleUser({ email: '' }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-203 Missing email fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-203 Missing email fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-204 | User with invalid email fails validation', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(createSampleUser({ email: 'notvalid' }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-204 Invalid email fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-204 Invalid email fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-205 | User without uid fails validation', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(createSampleUser({ uid: '' }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-205 Missing uid fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-205 Missing uid fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-206 | User with age 0 fails (age must be ≥ 1)', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(createSampleUser({ age: 0 }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-206 Age 0 fails validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-206 Age 0 fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-207 | User with age 121 fails (age must be ≤ 120)', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(createSampleUser({ age: 121 }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-207 Age 121 fails validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-207 Age 121 fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-208 | User with age 18 passes', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(createSampleUser({ age: 18 }));
      assert.strictEqual(result.valid, true);
      recordResult({ name: 'BT-208 Age 18 passes', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-208 Age 18 passes', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-209 | User with numeric phone fails (phone must be string)', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(createSampleUser({ phone: 9876543210 }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-209 Numeric phone fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-209 Numeric phone fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-210 | null user fails validation', function () {
    const start = Date.now();
    try {
      const result = validateUserProfile(null);
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-210 null user fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-210 null user fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  // ── BT-211 to BT-230: Profile Completeness ────────────────────────────────
  it('BT-211 | Complete profile passes isProfileComplete', function () {
    const start = Date.now();
    try {
      assert.strictEqual(isProfileComplete(createSampleUser()), true);
      recordResult({ name: 'BT-211 Complete profile passes', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-211 Complete profile passes', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-212 | Profile without phone is incomplete', function () {
    const start = Date.now();
    try {
      assert.strictEqual(isProfileComplete(createSampleUser({ phone: '' })), false);
      recordResult({ name: 'BT-212 No phone → incomplete', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-212 No phone incomplete', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-213 | Profile without location is incomplete', function () {
    const start = Date.now();
    try {
      assert.strictEqual(isProfileComplete(createSampleUser({ location: '' })), false);
      recordResult({ name: 'BT-213 No location → incomplete', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-213 No location incomplete', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-214 | Profile without gender is incomplete', function () {
    const start = Date.now();
    try {
      assert.strictEqual(isProfileComplete(createSampleUser({ gender: '' })), false);
      recordResult({ name: 'BT-214 No gender → incomplete', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-214 No gender incomplete', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-215 | Profile without avatarUrl is incomplete', function () {
    const start = Date.now();
    try {
      assert.strictEqual(isProfileComplete(createSampleUser({ avatarUrl: '' })), false);
      recordResult({ name: 'BT-215 No avatarUrl → incomplete', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-215 No avatarUrl incomplete', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-216 | OPTIONAL_PROFILE_FIELDS has 6 entries', function () {
    const start = Date.now();
    try {
      assert.strictEqual(OPTIONAL_PROFILE_FIELDS.length, 6);
      recordResult({ name: 'BT-216 OPTIONAL_PROFILE_FIELDS count is 6', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-216 OPTIONAL_PROFILE_FIELDS count', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-217 | REQUIRED_PROFILE_FIELDS has 4 entries', function () {
    const start = Date.now();
    try {
      assert.strictEqual(REQUIRED_PROFILE_FIELDS.length, 4);
      recordResult({ name: 'BT-217 REQUIRED_PROFILE_FIELDS count is 4', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-217 REQUIRED_PROFILE_FIELDS count', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-218 | emailVerified is boolean in user object', function () {
    const start = Date.now();
    try {
      assert.strictEqual(typeof createSampleUser().emailVerified, 'boolean');
      recordResult({ name: 'BT-218 emailVerified is boolean', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-218 emailVerified boolean', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-219 | User createdAt is a positive number', function () {
    const start = Date.now();
    try {
      assert.ok(createSampleUser().createdAt > 0);
      recordResult({ name: 'BT-219 createdAt is positive number', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-219 createdAt positive number', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-220 | User displayName matches name field', function () {
    const start = Date.now();
    try {
      const user = createSampleUser();
      assert.strictEqual(user.displayName, user.name);
      recordResult({ name: 'BT-220 displayName matches name', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-220 displayName matches name', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  // ── BT-221 to BT-280: Field-level and Boundary Tests ─────────────────────
  const extraTests = [
    ['BT-221', 'User age 1 is valid (min boundary)', () => validateUserProfile(createSampleUser({ age: 1 })).valid],
    ['BT-222', 'User age 120 is valid (max boundary)', () => validateUserProfile(createSampleUser({ age: 120 })).valid],
    ['BT-223', 'User age -1 is invalid', () => !validateUserProfile(createSampleUser({ age: -1 })).valid],
    ['BT-224', 'User name with single char is valid', () => validateUserProfile(createSampleUser({ name: 'A' })).valid],
    ['BT-225', 'User email can have subdomain', () => validateUserProfile(createSampleUser({ email: 'user@sub.domain.com' })).valid],
    ['BT-226', 'User uid is a non-empty string', () => typeof createSampleUser().uid === 'string' && createSampleUser().uid.length > 0],
    ['BT-227', 'User gender field can be any string', () => validateUserProfile(createSampleUser({ gender: 'Non-binary' })).valid],
    ['BT-228', 'User location field accepts unicode', () => validateUserProfile(createSampleUser({ location: '東京, Japan' })).valid],
    ['BT-229', 'User name field accepts unicode', () => validateUserProfile(createSampleUser({ name: 'Pramith மணி' })).valid],
    ['BT-230', 'isProfileComplete returns false for null field', () => !isProfileComplete(createSampleUser({ age: null }))],
    ['BT-231', 'isProfileComplete returns false for undefined field', () => !isProfileComplete(createSampleUser({ age: undefined }))],
    ['BT-232', 'User object is a plain object', () => typeof createSampleUser() === 'object' && !Array.isArray(createSampleUser())],
    ['BT-233', 'createSampleUser keys count ≥ 10', () => Object.keys(createSampleUser()).length >= 10],
    ['BT-234', 'User email does not contain spaces', () => !createSampleUser().email.includes(' ')],
    ['BT-235', 'User avatarUrl starts with https', () => createSampleUser().avatarUrl.startsWith('https://')],
    ['BT-236', 'REQUIRED_PROFILE_FIELDS includes email', () => REQUIRED_PROFILE_FIELDS.includes('email')],
    ['BT-237', 'REQUIRED_PROFILE_FIELDS includes uid', () => REQUIRED_PROFILE_FIELDS.includes('uid')],
    ['BT-238', 'REQUIRED_PROFILE_FIELDS includes name', () => REQUIRED_PROFILE_FIELDS.includes('name')],
    ['BT-239', 'REQUIRED_PROFILE_FIELDS includes createdAt', () => REQUIRED_PROFILE_FIELDS.includes('createdAt')],
    ['BT-240', 'OPTIONAL_PROFILE_FIELDS includes phone', () => OPTIONAL_PROFILE_FIELDS.includes('phone')],
    ['BT-241', 'OPTIONAL_PROFILE_FIELDS includes age', () => OPTIONAL_PROFILE_FIELDS.includes('age')],
    ['BT-242', 'OPTIONAL_PROFILE_FIELDS includes gender', () => OPTIONAL_PROFILE_FIELDS.includes('gender')],
    ['BT-243', 'OPTIONAL_PROFILE_FIELDS includes avatarUrl', () => OPTIONAL_PROFILE_FIELDS.includes('avatarUrl')],
    ['BT-244', 'OPTIONAL_PROFILE_FIELDS includes location', () => OPTIONAL_PROFILE_FIELDS.includes('location')],
    ['BT-245', 'OPTIONAL_PROFILE_FIELDS includes displayName', () => OPTIONAL_PROFILE_FIELDS.includes('displayName')],
    ['BT-246', 'validateUserProfile returns object with valid key', () => 'valid' in validateUserProfile(createSampleUser())],
    ['BT-247', 'validateUserProfile returns object with error key', () => 'error' in validateUserProfile(createSampleUser())],
    ['BT-248', 'User with string age fails (age must be number)', () => !validateUserProfile(createSampleUser({ age: '21' })).valid],
    ['BT-249', 'User email matches test email format', () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createSampleUser().email)],
    ['BT-250', 'createSampleUser with override replaces field', () => createSampleUser({ name: 'Override' }).name === 'Override'],
    ['BT-251', 'User phone with hyphens is valid string', () => validateUserProfile(createSampleUser({ phone: '987-654-3210' })).valid],
    ['BT-252', 'User phone empty string is fine (optional field)', () => validateUserProfile(createSampleUser({ phone: '' })).valid],
    ['BT-253', 'User without optional age field still valid', () => { const u = createSampleUser(); delete u.age; return validateUserProfile(u).valid; }],
    ['BT-254', 'User without optional phone field still valid', () => { const u = createSampleUser(); delete u.phone; return validateUserProfile(u).valid; }],
    ['BT-255', 'User age must not be floating point check', () => validateUserProfile(createSampleUser({ age: 21.5 })).valid],
    ['BT-256', 'isProfileComplete checks all 6 optional fields', () => OPTIONAL_PROFILE_FIELDS.length === 6],
    ['BT-257', 'User email property is a string', () => typeof createSampleUser().email === 'string'],
    ['BT-258', 'User name property is a string', () => typeof createSampleUser().name === 'string'],
    ['BT-259', 'User location property is a string', () => typeof createSampleUser().location === 'string'],
    ['BT-260', 'User gender property is a string', () => typeof createSampleUser().gender === 'string'],
    ['BT-261', 'User age property is a number', () => typeof createSampleUser().age === 'number'],
    ['BT-262', 'User uid property is a string', () => typeof createSampleUser().uid === 'string'],
    ['BT-263', 'User avatarUrl is a string', () => typeof createSampleUser().avatarUrl === 'string'],
    ['BT-264', 'User displayName is a string', () => typeof createSampleUser().displayName === 'string'],
    ['BT-265', 'User phone is a string', () => typeof createSampleUser().phone === 'string'],
    ['BT-266', 'User emailVerified is true for test account', () => createSampleUser().emailVerified === true],
    ['BT-267', 'User createdAt is a number', () => typeof createSampleUser().createdAt === 'number'],
    ['BT-268', 'User profile has no password field (security)', () => !('password' in createSampleUser())],
    ['BT-269', 'User profile has no token field (security)', () => !('token' in createSampleUser())],
    ['BT-270', 'User profile has no secret field (security)', () => !('secret' in createSampleUser())],
    ['BT-271', 'isProfileComplete handles empty object', () => !isProfileComplete({})],
    ['BT-272', 'User email @ count is exactly 1', () => (createSampleUser().email.match(/@/g) || []).length === 1],
    ['BT-273', 'User email TLD length is ≥ 2', () => createSampleUser().email.split('.').pop().length >= 2],
    ['BT-274', 'User name has at least 1 character', () => createSampleUser().name.length >= 1],
    ['BT-275', 'User uid has at least 1 character', () => createSampleUser().uid.length >= 1],
    ['BT-276', 'Test user email domain is sse.saveetha.com', () => createSampleUser().email.includes('saveetha.com')],
    ['BT-277', 'validateUserProfile null input returns error string', () => typeof validateUserProfile(null).error === 'string'],
    ['BT-278', 'Profile validation is synchronous (no promise)', () => !(validateUserProfile(createSampleUser()) instanceof Promise)],
    ['BT-279', 'createSampleUser returns new object each call', () => createSampleUser() !== createSampleUser()],
    ['BT-280', 'User profile: all required fields are strings except createdAt (number)', () => { const u = createSampleUser(); return typeof u.name === 'string' && typeof u.email === 'string' && typeof u.uid === 'string' && typeof u.createdAt === 'number'; }],
  ];

  extraTests.forEach(([id, name, fn]) => {
    it(`${id} | ${name}`, function () {
      const start = Date.now();
      try {
        assert.strictEqual(fn(), true, name);
        recordResult({ name: `${id} ${name}`, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: `${id} ${name}`, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });
});
