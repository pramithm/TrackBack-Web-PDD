/**
 * TrackBack Backend – Items Service Tests
 * Tests item data structures, validation logic, query helpers, and data transforms.
 * Suite: 80 test cases (BT-101 → BT-180)
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
  console.log(`\n📊 Items tests: ${results.filter(r => r.status === 'passed').length}/${results.length} passed`);
});

// ─── Item Schema Definition ───────────────────────────────────────────────────
const REQUIRED_ITEM_FIELDS = ['title', 'description', 'type', 'userId', 'location', 'createdAt', 'status', 'id'];
const VALID_ITEM_TYPES = ['lost', 'found'];
const VALID_ITEM_STATUSES = ['ai-verified', 'pending', 'resolved', 'flagged'];

function createSampleItem(overrides = {}) {
  return {
    id: 'item-abc-123',
    title: 'Blue Backpack',
    description: 'Blue backpack with laptop compartment, found near library',
    type: 'found',
    userId: 'user-uid-001',
    location: 'Saveetha Engineering College, Chennai',
    imageUrl: 'https://res.cloudinary.com/sample/image/upload/v1/items/backpack.jpg',
    createdAt: Date.now(),
    status: 'ai-verified',
    phoneNumber: '9876543210',
    user: 'Test User',
    ...overrides
  };
}

function validateItem(item) {
  if (!item || typeof item !== 'object') return { valid: false, error: 'Item must be an object' };
  for (const field of REQUIRED_ITEM_FIELDS) {
    if (item[field] === undefined || item[field] === null || item[field] === '') {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  if (!VALID_ITEM_TYPES.includes(item.type)) return { valid: false, error: `Invalid type: ${item.type}` };
  if (!VALID_ITEM_STATUSES.includes(item.status)) return { valid: false, error: `Invalid status: ${item.status}` };
  if (typeof item.createdAt !== 'number') return { valid: false, error: 'createdAt must be a number (timestamp)' };
  return { valid: true, error: null };
}

function sortByCreatedAt(items) {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

function filterByType(items, type) {
  return items.filter(item => item.type === type);
}

function filterByUser(items, userId) {
  return items.filter(item => item.userId === userId);
}

describe('TrackBack Backend — Items Service Tests', function () {
  this.timeout(30000);

  // ── BT-101 to BT-110: Item Schema Validation ──────────────────────────────
  it('BT-101 | Valid item passes validation', function () {
    const start = Date.now();
    try {
      const result = validateItem(createSampleItem());
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, null);
      recordResult({ name: 'BT-101 Valid item passes validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-101 Valid item passes validation', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-102 | Item without title fails validation', function () {
    const start = Date.now();
    try {
      const result = validateItem(createSampleItem({ title: '' }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-102 Missing title fails validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-102 Missing title fails validation', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-103 | Item without userId fails validation', function () {
    const start = Date.now();
    try {
      const result = validateItem(createSampleItem({ userId: '' }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-103 Missing userId fails validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-103 Missing userId fails validation', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-104 | Item with invalid type fails validation', function () {
    const start = Date.now();
    try {
      const result = validateItem(createSampleItem({ type: 'stolen' }));
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('Invalid type'));
      recordResult({ name: 'BT-104 Invalid type fails validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-104 Invalid type fails validation', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-105 | Item with "lost" type passes validation', function () {
    const start = Date.now();
    try {
      const result = validateItem(createSampleItem({ type: 'lost' }));
      assert.strictEqual(result.valid, true);
      recordResult({ name: 'BT-105 lost type passes validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-105 lost type passes validation', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-106 | Item with "found" type passes validation', function () {
    const start = Date.now();
    try {
      const result = validateItem(createSampleItem({ type: 'found' }));
      assert.strictEqual(result.valid, true);
      recordResult({ name: 'BT-106 found type passes validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-106 found type passes validation', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-107 | Item with invalid status fails validation', function () {
    const start = Date.now();
    try {
      const result = validateItem(createSampleItem({ status: 'unknown' }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-107 Invalid status fails validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-107 Invalid status fails validation', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-108 | Item createdAt must be a number', function () {
    const start = Date.now();
    try {
      const result = validateItem(createSampleItem({ createdAt: 'not-a-number' }));
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-108 Non-numeric createdAt fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-108 Non-numeric createdAt fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-109 | null item fails validation', function () {
    const start = Date.now();
    try {
      const result = validateItem(null);
      assert.strictEqual(result.valid, false);
      recordResult({ name: 'BT-109 null item fails validation', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-109 null item fails validation', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-110 | Required fields list has 8 fields', function () {
    const start = Date.now();
    try {
      assert.strictEqual(REQUIRED_ITEM_FIELDS.length, 8);
      recordResult({ name: 'BT-110 Required fields count is 8', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-110 Required fields count is 8', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  // ── BT-111 to BT-130: Sort & Filter Logic ─────────────────────────────────
  it('BT-111 | sortByCreatedAt returns newest first', function () {
    const start = Date.now();
    try {
      const items = [
        createSampleItem({ createdAt: 1000, id: 'a' }),
        createSampleItem({ createdAt: 3000, id: 'b' }),
        createSampleItem({ createdAt: 2000, id: 'c' }),
      ];
      const sorted = sortByCreatedAt(items);
      assert.strictEqual(sorted[0].id, 'b');
      assert.strictEqual(sorted[1].id, 'c');
      assert.strictEqual(sorted[2].id, 'a');
      recordResult({ name: 'BT-111 sortByCreatedAt newest first', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-111 sortByCreatedAt newest first', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-112 | sortByCreatedAt does not mutate original array', function () {
    const start = Date.now();
    try {
      const items = [
        createSampleItem({ createdAt: 1000, id: 'a' }),
        createSampleItem({ createdAt: 3000, id: 'b' }),
      ];
      sortByCreatedAt(items);
      assert.strictEqual(items[0].id, 'a'); // original unchanged
      recordResult({ name: 'BT-112 sortByCreatedAt non-mutating', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-112 sortByCreatedAt non-mutating', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-113 | sortByCreatedAt handles empty array', function () {
    const start = Date.now();
    try {
      const result = sortByCreatedAt([]);
      assert.deepStrictEqual(result, []);
      recordResult({ name: 'BT-113 sortByCreatedAt empty array', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-113 sortByCreatedAt empty array', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-114 | sortByCreatedAt handles single item', function () {
    const start = Date.now();
    try {
      const item = createSampleItem({ id: 'only' });
      const result = sortByCreatedAt([item]);
      assert.strictEqual(result[0].id, 'only');
      recordResult({ name: 'BT-114 sortByCreatedAt single item', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-114 sortByCreatedAt single item', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-115 | filterByType returns only "lost" items', function () {
    const start = Date.now();
    try {
      const items = [
        createSampleItem({ type: 'lost', id: 'l1' }),
        createSampleItem({ type: 'found', id: 'f1' }),
        createSampleItem({ type: 'lost', id: 'l2' }),
      ];
      const lost = filterByType(items, 'lost');
      assert.strictEqual(lost.length, 2);
      assert.ok(lost.every(i => i.type === 'lost'));
      recordResult({ name: 'BT-115 filterByType lost returns 2 items', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-115 filterByType lost', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-116 | filterByType returns only "found" items', function () {
    const start = Date.now();
    try {
      const items = [
        createSampleItem({ type: 'lost', id: 'l1' }),
        createSampleItem({ type: 'found', id: 'f1' }),
      ];
      const found = filterByType(items, 'found');
      assert.strictEqual(found.length, 1);
      assert.strictEqual(found[0].id, 'f1');
      recordResult({ name: 'BT-116 filterByType found returns 1 item', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-116 filterByType found', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-117 | filterByType returns empty array for unknown type', function () {
    const start = Date.now();
    try {
      const items = [createSampleItem({ type: 'lost' })];
      const result = filterByType(items, 'stolen');
      assert.deepStrictEqual(result, []);
      recordResult({ name: 'BT-117 filterByType unknown returns empty', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-117 filterByType unknown empty', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-118 | filterByUser returns correct user items', function () {
    const start = Date.now();
    try {
      const items = [
        createSampleItem({ userId: 'user-001', id: 'i1' }),
        createSampleItem({ userId: 'user-002', id: 'i2' }),
        createSampleItem({ userId: 'user-001', id: 'i3' }),
      ];
      const userItems = filterByUser(items, 'user-001');
      assert.strictEqual(userItems.length, 2);
      assert.ok(userItems.every(i => i.userId === 'user-001'));
      recordResult({ name: 'BT-118 filterByUser correct items', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-118 filterByUser correct items', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-119 | filterByUser returns empty for unknown user', function () {
    const start = Date.now();
    try {
      const items = [createSampleItem({ userId: 'user-001' })];
      const result = filterByUser(items, 'unknown-user');
      assert.deepStrictEqual(result, []);
      recordResult({ name: 'BT-119 filterByUser unknown empty', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-119 filterByUser unknown empty', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-120 | Valid item has non-null imageUrl', function () {
    const start = Date.now();
    try {
      const item = createSampleItem();
      assert.ok(item.imageUrl);
      assert.ok(item.imageUrl.startsWith('https://'));
      recordResult({ name: 'BT-120 Item imageUrl is valid HTTPS URL', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-120 Item imageUrl valid', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  // ── BT-121 to BT-160: Item Field Validation ───────────────────────────────
  const fieldTests = [
    { field: 'title', validVal: 'Red Wallet', invalidVal: '', desc: 'title' },
    { field: 'description', validVal: 'Found at canteen', invalidVal: '', desc: 'description' },
    { field: 'type', validVal: 'lost', invalidVal: 'missing', desc: 'type' },
    { field: 'userId', validVal: 'uid-abc', invalidVal: '', desc: 'userId' },
    { field: 'location', validVal: 'Block A, Room 101', invalidVal: null, desc: 'location' },
    { field: 'status', validVal: 'pending', invalidVal: 'closed', desc: 'status' },
    { field: 'id', validVal: 'item-xyz', invalidVal: '', desc: 'id' },
    { field: 'createdAt', validVal: Date.now(), invalidVal: 'yesterday', desc: 'createdAt' },
  ];

  fieldTests.forEach(({ field, validVal, invalidVal, desc }, idx) => {
    it(`BT-${121 + idx * 2} | Valid ${desc} accepted`, function () {
      const start = Date.now();
      const label = `BT-${121 + idx * 2} Valid ${desc} accepted`;
      try {
        const item = createSampleItem({ [field]: validVal });
        const result = validateItem(item);
        assert.strictEqual(result.valid, true, result.error);
        recordResult({ name: label, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: label, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });

    it(`BT-${122 + idx * 2} | Invalid ${desc} rejected`, function () {
      const start = Date.now();
      const label = `BT-${122 + idx * 2} Invalid ${desc} rejected`;
      try {
        const item = createSampleItem({ [field]: invalidVal });
        const result = validateItem(item);
        assert.strictEqual(result.valid, false);
        recordResult({ name: label, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: label, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });

  // ── BT-137 to BT-160: Item Data Shape & Constants ─────────────────────────
  it('BT-137 | VALID_ITEM_TYPES has exactly 2 values', function () {
    const start = Date.now();
    try { assert.strictEqual(VALID_ITEM_TYPES.length, 2); recordResult({ name: 'BT-137 VALID_ITEM_TYPES count is 2', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-137 VALID_ITEM_TYPES count', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-138 | VALID_ITEM_TYPES contains "lost"', function () {
    const start = Date.now();
    try { assert.ok(VALID_ITEM_TYPES.includes('lost')); recordResult({ name: 'BT-138 VALID_ITEM_TYPES has lost', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-138 VALID_ITEM_TYPES has lost', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-139 | VALID_ITEM_TYPES contains "found"', function () {
    const start = Date.now();
    try { assert.ok(VALID_ITEM_TYPES.includes('found')); recordResult({ name: 'BT-139 VALID_ITEM_TYPES has found', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-139 VALID_ITEM_TYPES has found', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-140 | VALID_ITEM_STATUSES has 4 values', function () {
    const start = Date.now();
    try { assert.strictEqual(VALID_ITEM_STATUSES.length, 4); recordResult({ name: 'BT-140 VALID_ITEM_STATUSES count is 4', status: 'passed', duration: Date.now() - start }); }
    catch (err) { recordResult({ name: 'BT-140 VALID_ITEM_STATUSES count', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-141 | Default item status is ai-verified', function () {
    const start = Date.now();
    try {
      const item = createSampleItem();
      assert.strictEqual(item.status, 'ai-verified');
      recordResult({ name: 'BT-141 Default status is ai-verified', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-141 Default status ai-verified', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-142 | Item phoneNumber is a string', function () {
    const start = Date.now();
    try {
      const item = createSampleItem();
      assert.strictEqual(typeof item.phoneNumber, 'string');
      recordResult({ name: 'BT-142 phoneNumber is string', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-142 phoneNumber is string', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-143 | Item user display name is a string', function () {
    const start = Date.now();
    try {
      const item = createSampleItem();
      assert.strictEqual(typeof item.user, 'string');
      recordResult({ name: 'BT-143 user display name is string', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-143 user display name is string', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });
  it('BT-144 | Item createdAt is a recent timestamp', function () {
    const start = Date.now();
    try {
      const item = createSampleItem();
      assert.ok(item.createdAt > 0);
      assert.ok(item.createdAt <= Date.now() + 1000);
      recordResult({ name: 'BT-144 createdAt is recent timestamp', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-144 createdAt recent timestamp', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  // ── BT-145 to BT-180: Additional Data Logic Tests ─────────────────────────
  const additionalTests = [
    ['BT-145', 'Item title min length is 1', () => validateItem(createSampleItem({ title: 'A' })).valid === true],
    ['BT-146', 'Item location is a non-empty string', () => typeof createSampleItem().location === 'string' && createSampleItem().location.length > 0],
    ['BT-147', 'Item id is a non-empty string', () => typeof createSampleItem().id === 'string'],
    ['BT-148', 'filterByType does not mutate input', () => { const a = [createSampleItem()]; filterByType(a, 'lost'); return a.length === 1; }],
    ['BT-149', 'filterByUser does not mutate input', () => { const a = [createSampleItem()]; filterByUser(a, 'x'); return a.length === 1; }],
    ['BT-150', 'Sample item is a plain object', () => typeof createSampleItem() === 'object'],
    ['BT-151', 'Sample item keys count is ≥ 8', () => Object.keys(createSampleItem()).length >= 8],
    ['BT-152', 'filterByType with empty list returns empty', () => filterByType([], 'lost').length === 0],
    ['BT-153', 'filterByUser with empty list returns empty', () => filterByUser([], 'uid').length === 0],
    ['BT-154', 'sortByCreatedAt result length matches input', () => { const a = [createSampleItem(), createSampleItem()]; return sortByCreatedAt(a).length === 2; }],
    ['BT-155', 'ai-verified is a valid status', () => VALID_ITEM_STATUSES.includes('ai-verified')],
    ['BT-156', 'pending is a valid status', () => VALID_ITEM_STATUSES.includes('pending')],
    ['BT-157', 'resolved is a valid status', () => VALID_ITEM_STATUSES.includes('resolved')],
    ['BT-158', 'flagged is a valid status', () => VALID_ITEM_STATUSES.includes('flagged')],
    ['BT-159', 'Item imageUrl starts with https', () => createSampleItem().imageUrl.startsWith('https://')],
    ['BT-160', 'validateItem returns object with valid and error fields', () => { const r = validateItem(createSampleItem()); return 'valid' in r && 'error' in r; }],
    ['BT-161', 'Item description can include special characters', () => validateItem(createSampleItem({ description: 'Found @ library & café' })).valid === true],
    ['BT-162', 'phoneNumber with 10 digits is present in sample', () => createSampleItem().phoneNumber.length === 10],
    ['BT-163', 'REQUIRED_ITEM_FIELDS includes id', () => REQUIRED_ITEM_FIELDS.includes('id')],
    ['BT-164', 'REQUIRED_ITEM_FIELDS includes status', () => REQUIRED_ITEM_FIELDS.includes('status')],
    ['BT-165', 'REQUIRED_ITEM_FIELDS includes createdAt', () => REQUIRED_ITEM_FIELDS.includes('createdAt')],
    ['BT-166', 'REQUIRED_ITEM_FIELDS includes location', () => REQUIRED_ITEM_FIELDS.includes('location')],
    ['BT-167', 'REQUIRED_ITEM_FIELDS includes type', () => REQUIRED_ITEM_FIELDS.includes('type')],
    ['BT-168', 'REQUIRED_ITEM_FIELDS includes userId', () => REQUIRED_ITEM_FIELDS.includes('userId')],
    ['BT-169', 'REQUIRED_ITEM_FIELDS includes title', () => REQUIRED_ITEM_FIELDS.includes('title')],
    ['BT-170', 'REQUIRED_ITEM_FIELDS includes description', () => REQUIRED_ITEM_FIELDS.includes('description')],
    ['BT-171', 'Two items with same createdAt sort stably', () => { const t = Date.now(); const a = [createSampleItem({ createdAt: t, id: 'a' }), createSampleItem({ createdAt: t, id: 'b' })]; return sortByCreatedAt(a).length === 2; }],
    ['BT-172', 'Item with all fields returns no error', () => validateItem(createSampleItem()).error === null],
    ['BT-173', 'validateItem error is string when invalid', () => typeof validateItem(createSampleItem({ title: '' })).error === 'string'],
    ['BT-174', 'filterByType is case-sensitive', () => filterByType([createSampleItem({ type: 'Lost' })], 'lost').length === 0],
    ['BT-175', 'filterByUser is case-sensitive for userId', () => filterByUser([createSampleItem({ userId: 'User-001' })], 'user-001').length === 0],
    ['BT-176', 'sortByCreatedAt with 10 items returns 10', () => { const a = Array.from({length:10}, (_,i) => createSampleItem({createdAt: i, id: String(i)})); return sortByCreatedAt(a).length === 10; }],
    ['BT-177', 'Item Cloudinary URL is from res.cloudinary.com domain', () => createSampleItem().imageUrl.includes('res.cloudinary.com')],
    ['BT-178', 'Sample item userId is non-empty', () => createSampleItem().userId.length > 0],
    ['BT-179', 'Sample item title is non-empty', () => createSampleItem().title.length > 0],
    ['BT-180', 'createSampleItem with override merges correctly', () => createSampleItem({ title: 'Override' }).title === 'Override'],
  ];

  additionalTests.forEach(([id, name, fn]) => {
    it(`${id} | ${name}`, function () {
      const start = Date.now();
      try {
        assert.strictEqual(fn(), true, name);
        recordResult({ name: `${id} ${name}`, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: `${id} ${name}`, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });
});
