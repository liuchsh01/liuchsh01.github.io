const test = require('node:test');
const assert = require('node:assert/strict');
const {
  IDENTIFIER_TYPES,
  generateIdentifiers,
  generateUlid,
  generateUuidV4,
  generateUuidV7,
  normalizeOptions,
} = require('../tools/20260811_uuid-ulid-generator/identifier-core.js');

const zeroCrypto = {
  getRandomValues(array) {
    array.fill(0);
    return array;
  },
};

const sequenceCrypto = {
  next: 0,
  getRandomValues(array) {
    for (let index = 0; index < array.length; index += 1) {
      array[index] = this.next % 256;
      this.next += 1;
    }
    return array;
  },
};

test('UUID v4 sets RFC version and variant bits', () => {
  const uuid = generateUuidV4(zeroCrypto);
  assert.equal(uuid, '00000000-0000-4000-8000-000000000000');
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('UUID v7 stores the millisecond timestamp and sets version and variant bits', () => {
  const uuid = generateUuidV7(zeroCrypto, 0x0123456789ab);
  assert.equal(uuid, '01234567-89ab-7000-8000-000000000000');
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('ULID uses canonical Crockford Base32 encoding', () => {
  assert.equal(generateUlid(zeroCrypto, 0), '00000000000000000000000000');
  assert.equal(generateUlid(zeroCrypto, 1), '00000000010000000000000000');
  sequenceCrypto.next = 0;
  assert.match(generateUlid(sequenceCrypto, 0), /^[0-9A-HJKMNP-TV-Z]{26}$/);
});

test('batch generation applies count, case and UUID hyphen options', () => {
  sequenceCrypto.next = 0;
  const identifiers = generateIdentifiers({
    type: IDENTIFIER_TYPES.UUID_V4,
    count: 3,
    letterCase: 'upper',
    hyphens: false,
  }, sequenceCrypto);

  assert.equal(identifiers.length, 3);
  assert.ok(identifiers.every(identifier => /^[0-9A-F]{32}$/.test(identifier)));
  assert.equal(new Set(identifiers).size, 3);
});

test('ULID ignores UUID hyphen formatting and supports lowercase output', () => {
  const [identifier] = generateIdentifiers({
    type: IDENTIFIER_TYPES.ULID,
    count: 1,
    letterCase: 'lower',
    hyphens: true,
  }, zeroCrypto, () => 0);

  assert.equal(identifier, '00000000000000000000000000');
  assert.equal(identifier.includes('-'), false);
});

test('normalization validates count and falls back to UUID v4', () => {
  assert.equal(normalizeOptions({ count: 2, type: 'unknown' }).type, IDENTIFIER_TYPES.UUID_V4);
  assert.throws(() => normalizeOptions({ count: 0 }), /1–500/);
  assert.throws(() => normalizeOptions({ count: 501 }), /1–500/);
  assert.throws(() => normalizeOptions({ count: '1.5' }), /1–500/);
});
