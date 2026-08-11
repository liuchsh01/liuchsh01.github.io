const test = require('node:test');
const assert = require('node:assert/strict');
const {
  countLines,
  joinLines,
  naturalSortLines,
  organizeLines,
  performSetOperation,
  splitLines,
} = require('../tools/20260811_text-list-organizer/text-list-core.js');

test('line splitting supports common line endings and empty input', () => {
  assert.deepEqual(splitLines('a\r\nb\rc\n'), ['a', 'b', 'c', '']);
  assert.deepEqual(splitLines(''), []);
  assert.equal(countLines('a\nb'), 2);
  assert.equal(joinLines(['a', 'b']), 'a\nb');
});

test('organizer trims, removes empty lines, and deduplicates ignoring case', () => {
  assert.deepEqual(
    organizeLines('  Apple \n\nbanana\nAPPLE\n banana ', {
      caseSensitive: false,
      caseTransform: 'none',
      deduplicate: true,
      removeEmpty: true,
      sort: 'none',
      trim: true,
    }),
    ['Apple', 'banana'],
  );
});

test('case-sensitive deduplication keeps differently cased values', () => {
  assert.deepEqual(
    organizeLines('Apple\napple\nApple', {
      caseSensitive: true,
      caseTransform: 'none',
      deduplicate: true,
      removeEmpty: true,
      sort: 'none',
      trim: true,
    }),
    ['Apple', 'apple'],
  );
});

test('natural sorting understands embedded numbers in both directions', () => {
  const values = ['item10', 'item2', 'item1'];
  assert.deepEqual(naturalSortLines(values, 'asc'), ['item1', 'item2', 'item10']);
  assert.deepEqual(naturalSortLines(values, 'desc'), ['item10', 'item2', 'item1']);
});

test('case conversion is applied before prefix and suffix', () => {
  assert.deepEqual(
    organizeLines(' Alpha \nBeta', {
      caseTransform: 'lower',
      deduplicate: false,
      prefix: '[',
      removeEmpty: true,
      sort: 'none',
      suffix: ']',
      trim: true,
    }),
    ['[alpha]', '[beta]'],
  );
});

test('set operations preserve the first list order and support both differences', () => {
  const left = 'Apple\nBanana\nCherry\nApple';
  const right = 'banana\nDate\nApple';
  const options = { caseSensitive: false, removeEmpty: true, trim: true };
  assert.deepEqual(performSetOperation(left, right, 'intersection', options), ['Apple', 'Banana']);
  assert.deepEqual(performSetOperation(left, right, 'difference-a', options), ['Cherry']);
  assert.deepEqual(performSetOperation(left, right, 'difference-b', options), ['Date']);
  assert.deepEqual(performSetOperation(left, right, 'union', options), ['Apple', 'Banana', 'Cherry', 'Date']);
});

test('set operations can compare values with case sensitivity', () => {
  assert.deepEqual(
    performSetOperation('Apple\napple', 'apple', 'intersection', { caseSensitive: true }),
    ['apple'],
  );
  assert.throws(() => performSetOperation('', '', 'unknown'), /类型无效/);
});
