const test = require('node:test');
const assert = require('node:assert/strict');
const {
  formatJson,
  parseJson,
  repairJson,
} = require('../tools/20260810_json-formatter/json-core.js');

test('strict JSON parses without reporting repairs', () => {
  const result = parseJson('{"name":"Codex","items":[1,true,null]}');
  assert.deepEqual(result.value, { name: 'Codex', items: [1, true, null] });
  assert.equal(result.repaired, false);
  assert.deepEqual(result.repairs, []);
});

test('repair handles comments, single quotes, bare keys, Python literals and trailing commas', () => {
  const source = `{
    // user-facing label
    name: 'Codex',
    enabled: True,
    missing: None,
    items: [1, 2, 3,],
  }`;
  const result = parseJson(source, { repair: true });

  assert.deepEqual(result.value, {
    name: 'Codex',
    enabled: true,
    missing: null,
    items: [1, 2, 3],
  });
  assert.equal(result.repaired, true);
  assert.ok(result.repairs.length >= 4);
});

test('repair normalizes full-width punctuation and appends missing closing delimiters', () => {
  const result = parseJson('｛name：“工具”，list：［1，2，3］', { repair: true });
  assert.deepEqual(result.value, { name: '工具', list: [1, 2, 3] });
  assert.ok(result.repairs.some(item => item.includes('全角')));
  assert.ok(result.repairs.some(item => item.includes('闭合')));
});

test('repair does not alter comment markers or punctuation inside strings', () => {
  const repaired = repairJson(`{
    url: 'https://example.com/a//b',
    text: 'keep /* text */ and ，：｛｝',
  }`);
  const value = JSON.parse(repaired.source);

  assert.equal(value.url, 'https://example.com/a//b');
  assert.equal(value.text, 'keep /* text */ and ，：｛｝');
});

test('formatJson uses readable two-space indentation', () => {
  assert.equal(
    formatJson({ a: [1, 2] }),
    '{\n  "a": [\n    1,\n    2\n  ]\n}',
  );
});

test('unrecoverable JSON returns an actionable parse error', () => {
  assert.throws(
    () => parseJson('{a: 1,, b: 2}', { repair: true }),
    /自动修正后仍无法解析/,
  );
});
