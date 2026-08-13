const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('visually hidden file inputs do not inherit full-width form control dimensions', () => {
  const css = read('assets/css/theme.css');
  assert.match(css, /input\.visually-hidden:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)/);
  assert.match(css, /min-width:\s*1px/);
  assert.match(css, /min-height:\s*1px/);
});

test('QR preview keeps the export bitmap while using a responsive display size', () => {
  const script = read('tools/20260811_qr-code-tool/script.js');
  const css = read('tools/20260811_qr-code-tool/style.css');
  assert.match(script, /qrCanvas\.style\.width = 'min\(100%, 320px\)'/);
  assert.match(script, /qrCanvas\.style\.height = 'auto'/);
  assert.match(css, /\.qr-canvas-wrap canvas\s*\{[\s\S]*?max-width:\s*100%/);
});

test('Cron workspace drops its fixed result column on narrow screens', () => {
  const css = read('tools/20260811_cron-expression-tool/style.css');
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*?\.cron-workspace\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/,
  );
});
