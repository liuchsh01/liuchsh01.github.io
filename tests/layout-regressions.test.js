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

test('desktop tool pages use a wider compact shell without weakening mobile controls', () => {
  const css = read('assets/css/theme.css');
  assert.match(css, /\.shell\s*\{[\s\S]*?width:\s*min\(1240px, calc\(100% - 32px\)\)/);
  assert.match(css, /@media \(min-width: 761px\)[\s\S]*?\.shell > \.back-link\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.home-link,[\s\S]*?\.back-link\s*\{[\s\S]*?min-height:\s*44px/);
});

test('dense desktop tools keep long content inside compact result regions', () => {
  const cronCss = read('tools/20260811_cron-expression-tool/style.css');
  const qrCss = read('tools/20260811_qr-code-tool/style.css');
  const tokenCss = read('tools/20260811_token-inspector/style.css');

  assert.match(cronCss, /\.schedule-list\s*\{[\s\S]*?max-height:\s*clamp\(170px/);
  assert.match(qrCss, /@media \(min-width: 821px\)[\s\S]*?\.generator-panel\s*\{[\s\S]*?display:\s*grid/);
  assert.match(tokenCss, /@media \(min-width: 821px\)[\s\S]*?\.shell\s*\{[\s\S]*?grid-template-columns:/);
});

test('token inspector gives compact tokens a wide readable desktop input area', () => {
  const css = read('tools/20260811_token-inspector/style.css');

  assert.match(css, /\.token-input\s*\{[\s\S]*?font:\s*12px\/1\.55 var\(--font-mono\)/);
  assert.match(
    css,
    /@media \(min-width: 821px\)[\s\S]*?\.token-input-panel > \.field\s*\{[\s\S]*?grid-column:\s*1 \/ -1/,
  );
  assert.match(
    css,
    /@media \(min-width: 821px\)[\s\S]*?\.token-input\s*\{[\s\S]*?min-height:\s*156px;[\s\S]*?height:\s*clamp\(156px, 20vh, 210px\)/,
  );
});

test('timestamp converter keeps desktop controls inside separated columns', () => {
  const css = read('tools/20260810_timestamp-converter/style.css');
  const baseGridIndex = css.indexOf('.timestamp-fields {');
  const desktopGridIndex = css.indexOf('@media (min-width: 941px)');

  assert.ok(desktopGridIndex > baseGridIndex, 'desktop grid overrides must follow the base grid rules');
  assert.match(css, /\.conversion-fields\s*\{[\s\S]*?gap:\s*12px/);
  assert.match(
    css,
    /@media \(min-width: 941px\)[\s\S]*?\.converter-panel\s*\{[\s\S]*?column-gap:\s*16px/,
  );
  assert.match(
    css,
    /@media \(min-width: 941px\)[\s\S]*?\.timestamp-fields\s*\{[\s\S]*?grid-template-columns:\s*minmax\(92px, 0\.7fr\) minmax\(150px, 1\.15fr\) auto auto/,
  );
  assert.match(
    css,
    /@media \(min-width: 941px\)[\s\S]*?\.conversion-section \+ \.conversion-section\s*\{[\s\S]*?border-left:\s*0/,
  );
  assert.match(css, /#timestampInput,\s*#dateTimeInput\s*\{\s*height:\s*50px/);
});
