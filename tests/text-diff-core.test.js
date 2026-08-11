const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compareTexts,
  createCharacterSegments,
  normalizeNewlines,
  splitLines,
} = require('../tools/20260811_text-diff/diff-core.js');

test('normalizes Windows and classic Mac line endings', () => {
  assert.equal(normalizeNewlines('a\r\nb\rc'), 'a\nb\nc');
  assert.deepEqual(splitLines('a\r\nb'), ['a', 'b']);
});

test('identical text produces only equal rows', () => {
  const result = compareTexts('alpha\nbeta', 'alpha\nbeta');

  assert.equal(result.hasDifferences, false);
  assert.deepEqual(result.stats, { equal: 2, changed: 0, added: 0, deleted: 0 });
  assert.deepEqual(result.rows.map(row => row.status), ['equal', 'equal']);
});

test('pairs neighboring deletion and insertion as a changed row', () => {
  const result = compareTexts('alpha\nbeta\ngamma', 'alpha\nBETA!\ngamma');

  assert.deepEqual(result.rows.map(row => row.status), ['equal', 'changed', 'equal']);
  assert.equal(result.rows[1].leftLine, 2);
  assert.equal(result.rows[1].rightLine, 2);
  assert.equal(result.stats.changed, 1);
  assert.match(result.unifiedDiff, /- beta\n\+ BETA!/);
});

test('reports unmatched lines as added or deleted', () => {
  const added = compareTexts('one\ntwo', 'one\ntwo\nthree');
  const deleted = compareTexts('one\ntwo\nthree', 'one\nthree');

  assert.equal(added.stats.added, 1);
  assert.equal(added.rows.at(-1).rightText, 'three');
  assert.equal(deleted.stats.deleted, 1);
  assert.equal(deleted.rows[1].leftText, 'two');
});

test('can ignore whitespace and letter case', () => {
  const result = compareTexts(' Hello   WORLD ', 'hello world', {
    ignoreWhitespace: true,
    ignoreCase: true,
  });

  assert.equal(result.hasDifferences, false);
  assert.equal(result.stats.equal, 1);
});

test('preserves trailing blank lines as meaningful input', () => {
  const result = compareTexts('line', 'line\n');

  assert.equal(result.stats.added, 1);
  assert.equal(result.rows.at(-1).rightText, '');
  assert.equal(result.rows.at(-1).rightLine, 2);
});

test('character segments isolate changed characters', () => {
  const segments = createCharacterSegments('colour', 'color');

  assert.deepEqual(segments.left, [
    { type: 'equal', text: 'colo' },
    { type: 'deleted', text: 'u' },
    { type: 'equal', text: 'r' },
  ]);
  assert.deepEqual(segments.right, [
    { type: 'equal', text: 'color' },
  ]);
});
