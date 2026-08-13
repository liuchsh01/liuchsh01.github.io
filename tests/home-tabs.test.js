const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/js/home.js'), 'utf8');

test('homepage groups every tool into one of the five stable categories', () => {
  const categories = [...html.matchAll(/class="tool-card"[^>]+data-tool-category="([a-z]+)"/g)]
    .map(match => match[1]);
  const counts = categories.reduce((result, category) => {
    result[category] = (result[category] || 0) + 1;
    return result;
  }, {});

  assert.equal(categories.length, 22);
  assert.deepEqual(counts, {
    calculate: 2,
    datetime: 2,
    development: 9,
    security: 6,
    text: 3,
  });
});

test('homepage tab markup and behavior expose an accessible single panel', () => {
  assert.match(html, /class="tool-tabs" role="tablist"/);
  assert.match(html, /id="developmentTab"[^>]+aria-selected="true"/);
  assert.match(html, /id="toolGrid" role="tabpanel" aria-labelledby="developmentTab"/);
  assert.match(script, /setAttribute\('aria-selected'/);
  assert.match(script, /panel\.setAttribute\('aria-labelledby'/);
  assert.match(script, /ArrowRight/);
  assert.match(script, /ArrowLeft/);
  assert.doesNotMatch(script, /innerHTML/);
});

test('homepage remembers the last selected category with a safe fallback', () => {
  assert.match(script, /const STORAGE_KEY = 'toolbox-home-category'/);
  assert.match(script, /window\.localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(script, /window\.localStorage\.setItem\(STORAGE_KEY, category\)/);
  assert.match(script, /tabs\.find\(tab => tab\.dataset\.toolCategory === storedCategory\) \|\| selectedTab/);
  assert.match(script, /catch \(error\)/);
});
