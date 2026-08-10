const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CHARACTER_GROUPS,
  DEFAULT_EXCLUDED,
  generatePassword,
  generatePasswords,
  normalizeOptions,
} = require('../tools/20260810_random-password-generator/password-core.js');

const zeroCrypto = {
  getRandomValues(array) {
    array.fill(0);
    return array;
  },
};

test('default character groups and confusing-character exclusions are defined', () => {
  assert.equal(CHARACTER_GROUPS.digits, '0123456789');
  assert.equal(CHARACTER_GROUPS.lowercase, 'abcdefghijklmnopqrstuvwxyz');
  assert.equal(CHARACTER_GROUPS.uppercase, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  assert.match(CHARACTER_GROUPS.symbols, /!.*@.*#/);
  assert.equal(DEFAULT_EXCLUDED, '0oO1ilILq9');
});

test('generated password satisfies every selected group and required character', () => {
  const password = generatePassword({
    groups: ['digits', 'lowercase', 'uppercase', 'symbols'],
    minLength: 14,
    maxLength: 14,
    includeCharacters: 'Z?',
    excludeCharacters: DEFAULT_EXCLUDED,
  }, zeroCrypto);

  assert.equal([...password].length, 14);
  assert.match(password, /[2-8]/);
  assert.match(password, /[a-z]/);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[!@#$%^&*()\-_=+\[\]{};:,.?/]/);
  assert.ok(password.includes('Z'));
  assert.ok(password.includes('?'));
  for (const excluded of DEFAULT_EXCLUDED) {
    assert.ok(!password.includes(excluded));
  }
});

test('batch generation respects count and inclusive length range', () => {
  const passwords = generatePasswords({
    groups: ['digits'],
    count: 3,
    minLength: 8,
    maxLength: 12,
    includeCharacters: '',
    excludeCharacters: '',
  }, zeroCrypto);

  assert.equal(passwords.length, 3);
  assert.ok(passwords.every(password => password.length === 8));
  assert.ok(passwords.every(password => /^\d+$/.test(password)));
});

test('normalization accepts a blank maximum as a fixed length', () => {
  const options = normalizeOptions({
    groups: ['lowercase'],
    count: '2',
    minLength: '20',
    maxLength: '',
    includeCharacters: '',
    excludeCharacters: '',
  });

  assert.equal(options.count, 2);
  assert.equal(options.minLength, 20);
  assert.equal(options.maxLength, 20);
});

test('invalid or impossible configurations return actionable errors', () => {
  assert.throws(() => generatePassword({
    groups: [],
    minLength: 12,
    maxLength: 12,
    includeCharacters: '',
    excludeCharacters: '',
  }, zeroCrypto), /至少选择一个字符组/);

  assert.throws(() => generatePassword({
    groups: ['digits', 'lowercase'],
    minLength: 3,
    maxLength: 3,
    includeCharacters: '@#',
    excludeCharacters: '',
  }, zeroCrypto), /密码长度至少需要 4 位/);

  assert.throws(() => generatePassword({
    groups: ['digits'],
    minLength: 8,
    maxLength: 8,
    includeCharacters: '2',
    excludeCharacters: '2',
  }, zeroCrypto), /同时出现在包含字符和排除字符中/);
});
