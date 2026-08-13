const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../tools/20251222_word-filter/script.js'),
  'utf8',
);
const functionsOnly = source.slice(0, source.indexOf('(() => {'));
const context = vm.createContext({});
vm.runInContext(`${functionsOnly}; this.getBaseForm = getBaseForm;`, context);

test('stemming prioritizes specific plural and past-tense endings', () => {
  assert.deepEqual([...context.getBaseForm('parties')], ['parties', 'party']);
  assert.deepEqual([...context.getBaseForm('studied')], ['studied', 'study']);
});

test('stemming avoids malformed roots from stacked suffix removal', () => {
  assert.ok(!context.getBaseForm('parties').includes('parti'));
  assert.ok(!context.getBaseForm('boxes').includes('boxe'));
  assert.deepEqual([...context.getBaseForm('boxes')], ['boxes', 'box']);
  assert.deepEqual([...context.getBaseForm('likes')], ['likes', 'like']);
});
