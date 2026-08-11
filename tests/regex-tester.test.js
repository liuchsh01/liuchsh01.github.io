'use strict';

const assert = require('node:assert/strict');
const {
  normalizeFlags,
  collectMatches,
  replaceMatches,
} = require('../tools/20260811_regex-tester/regex-core.js');

assert.equal(normalizeFlags('miiggx'), 'gim');

const globalMatches = collectMatches('a+', 'aa b aaa', 'g');
assert.deepEqual(globalMatches.matches.map(match => [match.value, match.index, match.end]), [
  ['aa', 0, 2],
  ['aaa', 5, 8],
]);

const singleMatch = collectMatches('\\d+', '1 22 333', '');
assert.equal(singleMatch.matches.length, 1);
assert.equal(singleMatch.matches[0].value, '1');

const namedMatch = collectMatches('(?<name>[a-z]+)@(?<host>[a-z.]+)', 'user@example.com', 'i');
assert.deepEqual(namedMatch.matches[0].namedGroups, [
  { name: 'name', value: 'user' },
  { name: 'host', value: 'example.com' },
]);

const zeroWidthMatches = collectMatches('(?=a)', 'aaa', 'g');
assert.deepEqual(zeroWidthMatches.matches.map(match => match.index), [0, 1, 2]);

assert.equal(
  replaceMatches('(\\w+)@(\\w+\\.\\w+)', 'a@example.com b@example.com', 'g', '$1 [$2]'),
  'a [example.com] b [example.com]',
);

assert.throws(() => collectMatches('[', 'text', 'g'), SyntaxError);

console.log('PASS: regex tester core tests');
