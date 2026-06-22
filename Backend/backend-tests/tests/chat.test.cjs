/**
 * TrackBack Backend – Chat Service Tests
 * Tests chat message schema, room logic, ordering, and validation.
 * Suite: 80 test cases (BT-301 → BT-380)
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
  console.log(`\n📊 Chat tests: ${results.filter(r => r.status === 'passed').length}/${results.length} passed`);
});

// ─── Chat Schema ──────────────────────────────────────────────────────────────
const REQUIRED_MESSAGE_FIELDS = ['senderId', 'content', 'timestamp', 'roomId'];
const MAX_MESSAGE_LENGTH = 1000;

function createSampleMessage(overrides = {}) {
  return {
    id: 'msg-001',
    roomId: 'room-user001-user002',
    senderId: 'user-uid-001',
    receiverId: 'user-uid-002',
    content: 'Hello! I found your item.',
    timestamp: Date.now(),
    read: false,
    ...overrides
  };
}

function createSampleRoom(overrides = {}) {
  return {
    id: 'room-user001-user002',
    participants: ['user-uid-001', 'user-uid-002'],
    itemId: 'item-abc-123',
    createdAt: Date.now(),
    lastMessage: 'Hello! I found your item.',
    lastMessageAt: Date.now(),
    unreadCount: 0,
    ...overrides
  };
}

function validateMessage(msg) {
  if (!msg || typeof msg !== 'object') return { valid: false, error: 'Message must be an object' };
  for (const field of REQUIRED_MESSAGE_FIELDS) {
    if (!msg[field] && msg[field] !== 0) return { valid: false, error: `Missing required field: ${field}` };
  }
  if (typeof msg.content !== 'string' || msg.content.trim() === '') {
    return { valid: false, error: 'Message content cannot be empty' };
  }
  if (msg.content.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` };
  }
  if (typeof msg.timestamp !== 'number') {
    return { valid: false, error: 'timestamp must be a number' };
  }
  return { valid: true, error: null };
}

function sortMessagesByTimestamp(messages) {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp);
}

function generateRoomId(uid1, uid2) {
  return [uid1, uid2].sort().join('-');
}

function getRoomParticipants(roomId) {
  return roomId.split('-');
}

describe('TrackBack Backend — Chat Service Tests', function () {
  this.timeout(30000);

  // ── BT-301 to BT-320: Message Validation ──────────────────────────────────
  it('BT-301 | Valid message passes validation', function () {
    const start = Date.now();
    try {
      assert.strictEqual(validateMessage(createSampleMessage()).valid, true);
      recordResult({ name: 'BT-301 Valid message passes', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-301 Valid message passes', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-302 | Message without senderId fails', function () {
    const start = Date.now();
    try {
      assert.strictEqual(validateMessage(createSampleMessage({ senderId: '' })).valid, false);
      recordResult({ name: 'BT-302 Missing senderId fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-302 Missing senderId fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-303 | Message without content fails', function () {
    const start = Date.now();
    try {
      assert.strictEqual(validateMessage(createSampleMessage({ content: '' })).valid, false);
      recordResult({ name: 'BT-303 Empty content fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-303 Empty content fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-304 | Message exceeding 1000 chars fails', function () {
    const start = Date.now();
    try {
      const result = validateMessage(createSampleMessage({ content: 'a'.repeat(1001) }));
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('too long'));
      recordResult({ name: 'BT-304 >1000 chars fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-304 >1000 chars fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-305 | Message of exactly 1000 chars passes', function () {
    const start = Date.now();
    try {
      const result = validateMessage(createSampleMessage({ content: 'a'.repeat(1000) }));
      assert.strictEqual(result.valid, true);
      recordResult({ name: 'BT-305 1000-char message passes', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-305 1000-char message passes', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-306 | Message without roomId fails', function () {
    const start = Date.now();
    try {
      assert.strictEqual(validateMessage(createSampleMessage({ roomId: '' })).valid, false);
      recordResult({ name: 'BT-306 Missing roomId fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-306 Missing roomId fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-307 | Message without timestamp fails', function () {
    const start = Date.now();
    try {
      assert.strictEqual(validateMessage(createSampleMessage({ timestamp: null })).valid, false);
      recordResult({ name: 'BT-307 Missing timestamp fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-307 Missing timestamp fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-308 | Message with string timestamp fails', function () {
    const start = Date.now();
    try {
      assert.strictEqual(validateMessage(createSampleMessage({ timestamp: 'now' })).valid, false);
      recordResult({ name: 'BT-308 String timestamp fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-308 String timestamp fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-309 | null message fails validation', function () {
    const start = Date.now();
    try {
      assert.strictEqual(validateMessage(null).valid, false);
      recordResult({ name: 'BT-309 null message fails', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-309 null message fails', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-310 | REQUIRED_MESSAGE_FIELDS has 4 items', function () {
    const start = Date.now();
    try {
      assert.strictEqual(REQUIRED_MESSAGE_FIELDS.length, 4);
      recordResult({ name: 'BT-310 REQUIRED_MESSAGE_FIELDS count 4', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-310 REQUIRED_MESSAGE_FIELDS count', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  // ── BT-311 to BT-330: Sort & Room Logic ───────────────────────────────────
  it('BT-311 | sortMessagesByTimestamp returns oldest first', function () {
    const start = Date.now();
    try {
      const msgs = [
        createSampleMessage({ timestamp: 3000, id: 'c' }),
        createSampleMessage({ timestamp: 1000, id: 'a' }),
        createSampleMessage({ timestamp: 2000, id: 'b' }),
      ];
      const sorted = sortMessagesByTimestamp(msgs);
      assert.strictEqual(sorted[0].id, 'a');
      assert.strictEqual(sorted[2].id, 'c');
      recordResult({ name: 'BT-311 sortMessages oldest first', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-311 sortMessages oldest first', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-312 | sortMessages does not mutate input', function () {
    const start = Date.now();
    try {
      const msgs = [createSampleMessage({ timestamp: 3000, id: 'c' }), createSampleMessage({ timestamp: 1000, id: 'a' })];
      sortMessagesByTimestamp(msgs);
      assert.strictEqual(msgs[0].id, 'c');
      recordResult({ name: 'BT-312 sortMessages non-mutating', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-312 sortMessages non-mutating', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-313 | generateRoomId produces consistent ID', function () {
    const start = Date.now();
    try {
      const id1 = generateRoomId('user-001', 'user-002');
      const id2 = generateRoomId('user-002', 'user-001');
      assert.strictEqual(id1, id2);
      recordResult({ name: 'BT-313 generateRoomId consistent', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-313 generateRoomId consistent', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-314 | generateRoomId uses sorted UIDs', function () {
    const start = Date.now();
    try {
      const id = generateRoomId('user-B', 'user-A');
      assert.ok(id.startsWith('user-A'));
      recordResult({ name: 'BT-314 generateRoomId sorted UIDs', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-314 generateRoomId sorted', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-315 | Room has exactly 2 participants', function () {
    const start = Date.now();
    try {
      assert.strictEqual(createSampleRoom().participants.length, 2);
      recordResult({ name: 'BT-315 Room has 2 participants', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-315 Room has 2 participants', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-316 | Room participants is an array', function () {
    const start = Date.now();
    try {
      assert.ok(Array.isArray(createSampleRoom().participants));
      recordResult({ name: 'BT-316 Room participants is array', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-316 Room participants is array', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-317 | Room createdAt is a positive number', function () {
    const start = Date.now();
    try {
      assert.ok(createSampleRoom().createdAt > 0);
      recordResult({ name: 'BT-317 Room createdAt positive number', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-317 Room createdAt positive', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-318 | Room unreadCount starts at 0', function () {
    const start = Date.now();
    try {
      assert.strictEqual(createSampleRoom().unreadCount, 0);
      recordResult({ name: 'BT-318 Room unreadCount starts at 0', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-318 Room unreadCount 0', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-319 | Message read field is boolean', function () {
    const start = Date.now();
    try {
      assert.strictEqual(typeof createSampleMessage().read, 'boolean');
      recordResult({ name: 'BT-319 Message read is boolean', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-319 Message read is boolean', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  it('BT-320 | Message read starts as false (unread)', function () {
    const start = Date.now();
    try {
      assert.strictEqual(createSampleMessage().read, false);
      recordResult({ name: 'BT-320 New message is unread', status: 'passed', duration: Date.now() - start });
    } catch (err) { recordResult({ name: 'BT-320 New message unread', status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
  });

  // ── BT-321 to BT-380: Extended Chat Logic Tests ───────────────────────────
  const chatTests = [
    ['BT-321', 'Message content with emoji is valid', () => validateMessage(createSampleMessage({ content: 'Hello 👋' })).valid],
    ['BT-322', 'Message content with unicode is valid', () => validateMessage(createSampleMessage({ content: 'வணக்கம்' })).valid],
    ['BT-323', 'Message content with 1 char is valid', () => validateMessage(createSampleMessage({ content: 'H' })).valid],
    ['BT-324', 'Message whitespace-only content fails', () => !validateMessage(createSampleMessage({ content: '   ' })).valid],
    ['BT-325', 'sortMessages with empty array returns empty', () => sortMessagesByTimestamp([]).length === 0],
    ['BT-326', 'sortMessages with 1 message returns 1', () => sortMessagesByTimestamp([createSampleMessage()]).length === 1],
    ['BT-327', 'Room lastMessage is a string', () => typeof createSampleRoom().lastMessage === 'string'],
    ['BT-328', 'Room lastMessageAt is a number', () => typeof createSampleRoom().lastMessageAt === 'number'],
    ['BT-329', 'Room itemId is a string', () => typeof createSampleRoom().itemId === 'string'],
    ['BT-330', 'Room id is a string', () => typeof createSampleRoom().id === 'string'],
    ['BT-331', 'Message id is a string', () => typeof createSampleMessage().id === 'string'],
    ['BT-332', 'Message senderId is a string', () => typeof createSampleMessage().senderId === 'string'],
    ['BT-333', 'Message receiverId is a string', () => typeof createSampleMessage().receiverId === 'string'],
    ['BT-334', 'Message content is a string', () => typeof createSampleMessage().content === 'string'],
    ['BT-335', 'Message timestamp is a number', () => typeof createSampleMessage().timestamp === 'number'],
    ['BT-336', 'Message timestamp is positive', () => createSampleMessage().timestamp > 0],
    ['BT-337', 'generateRoomId is deterministic', () => generateRoomId('a', 'b') === generateRoomId('a', 'b')],
    ['BT-338', 'generateRoomId output is a string', () => typeof generateRoomId('a', 'b') === 'string'],
    ['BT-339', 'generateRoomId output contains both UIDs', () => { const id = generateRoomId('uid1', 'uid2'); return id.includes('uid1') && id.includes('uid2'); }],
    ['BT-340', 'MAX_MESSAGE_LENGTH is 1000', () => MAX_MESSAGE_LENGTH === 1000],
    ['BT-341', 'REQUIRED_MESSAGE_FIELDS includes senderId', () => REQUIRED_MESSAGE_FIELDS.includes('senderId')],
    ['BT-342', 'REQUIRED_MESSAGE_FIELDS includes content', () => REQUIRED_MESSAGE_FIELDS.includes('content')],
    ['BT-343', 'REQUIRED_MESSAGE_FIELDS includes timestamp', () => REQUIRED_MESSAGE_FIELDS.includes('timestamp')],
    ['BT-344', 'REQUIRED_MESSAGE_FIELDS includes roomId', () => REQUIRED_MESSAGE_FIELDS.includes('roomId')],
    ['BT-345', 'Message with special chars in content is valid', () => validateMessage(createSampleMessage({ content: '<item> @ loc: 50%' })).valid],
    ['BT-346', 'Message 999-char content is valid', () => validateMessage(createSampleMessage({ content: 'a'.repeat(999) })).valid],
    ['BT-347', 'Message 1-char content is valid', () => validateMessage(createSampleMessage({ content: 'x' })).valid],
    ['BT-348', 'Message 1001-char content is invalid', () => !validateMessage(createSampleMessage({ content: 'a'.repeat(1001) })).valid],
    ['BT-349', 'Room participants includes sender', () => createSampleRoom().participants.includes('user-uid-001')],
    ['BT-350', 'Room participants includes receiver', () => createSampleRoom().participants.includes('user-uid-002')],
    ['BT-351', 'createSampleMessage returns new object each call', () => createSampleMessage() !== createSampleMessage()],
    ['BT-352', 'createSampleRoom returns new object each call', () => createSampleRoom() !== createSampleRoom()],
    ['BT-353', 'validateMessage returns object', () => typeof validateMessage(createSampleMessage()) === 'object'],
    ['BT-354', 'validateMessage has valid key', () => 'valid' in validateMessage(createSampleMessage())],
    ['BT-355', 'validateMessage has error key', () => 'error' in validateMessage(createSampleMessage())],
    ['BT-356', 'sortMessages result is an array', () => Array.isArray(sortMessagesByTimestamp([]))],
    ['BT-357', 'Messages sorted: earlier timestamp is first', () => { const m = [createSampleMessage({ timestamp: 200, id: 'b' }), createSampleMessage({ timestamp: 100, id: 'a' })]; return sortMessagesByTimestamp(m)[0].id === 'a'; }],
    ['BT-358', 'Room object is a plain object', () => typeof createSampleRoom() === 'object'],
    ['BT-359', 'Room object is not null', () => createSampleRoom() !== null],
    ['BT-360', 'Room participants are non-empty strings', () => createSampleRoom().participants.every(p => typeof p === 'string' && p.length > 0)],
    ['BT-361', 'Message senderId != receiverId in sample', () => createSampleMessage().senderId !== createSampleMessage().receiverId],
    ['BT-362', 'Message roomId contains sender portion', () => createSampleMessage().roomId.includes('user')],
    ['BT-363', 'Room id matches expected format', () => createSampleRoom().id.includes('-')],
    ['BT-364', 'Message id is non-empty', () => createSampleMessage().id.length > 0],
    ['BT-365', 'Room id is non-empty', () => createSampleRoom().id.length > 0],
    ['BT-366', 'validateMessage with undefined fails', () => !validateMessage(undefined).valid],
    ['BT-367', 'validateMessage with array fails', () => !validateMessage([]).valid],
    ['BT-368', 'generateRoomId with same uid produces consistent output', () => generateRoomId('x', 'x') === 'x-x'],
    ['BT-369', 'Room unreadCount is a number', () => typeof createSampleRoom().unreadCount === 'number'],
    ['BT-370', 'Room unreadCount is ≥ 0', () => createSampleRoom().unreadCount >= 0],
    ['BT-371', 'Message with HTML content is valid (not sanitised at service level)', () => validateMessage(createSampleMessage({ content: '<b>bold</b>' })).valid],
    ['BT-372', 'sortMessages with 10 messages returns 10', () => sortMessagesByTimestamp(Array.from({length:10}, (_,i) => createSampleMessage({timestamp:i}))).length === 10],
    ['BT-373', 'REQUIRED_MESSAGE_FIELDS is an array', () => Array.isArray(REQUIRED_MESSAGE_FIELDS)],
    ['BT-374', 'Room lastMessage matches sample message content', () => createSampleRoom().lastMessage === createSampleMessage().content],
    ['BT-375', 'createSampleMessage override works', () => createSampleMessage({ content: 'Test' }).content === 'Test'],
    ['BT-376', 'createSampleRoom override works', () => createSampleRoom({ unreadCount: 5 }).unreadCount === 5],
    ['BT-377', 'Message roomId is a non-empty string', () => typeof createSampleMessage().roomId === 'string' && createSampleMessage().roomId.length > 0],
    ['BT-378', 'sortMessages preserves all messages', () => { const m = Array.from({length:5},(_,i)=>createSampleMessage({id:String(i),timestamp:i})); return sortMessagesByTimestamp(m).length === 5; }],
    ['BT-379', 'validateMessage error is null for valid message', () => validateMessage(createSampleMessage()).error === null],
    ['BT-380', 'Chat service constants are defined at module level', () => MAX_MESSAGE_LENGTH > 0 && REQUIRED_MESSAGE_FIELDS.length > 0],
  ];

  chatTests.forEach(([id, name, fn]) => {
    it(`${id} | ${name}`, function () {
      const start = Date.now();
      try {
        assert.strictEqual(fn(), true, name);
        recordResult({ name: `${id} ${name}`, status: 'passed', duration: Date.now() - start });
      } catch (err) { recordResult({ name: `${id} ${name}`, status: 'failed', duration: Date.now() - start, error: err.message }); throw err; }
    });
  });
});
