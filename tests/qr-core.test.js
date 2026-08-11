const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateScanDimensions,
  formatFileSize,
  getUtf8ByteLength,
  normalizeErrorCorrectionLevel,
  normalizeGeneratorOptions,
  normalizeHexColor,
  normalizeQrContent,
  normalizeQrSize,
  validateScanFile,
} = require('../tools/20260811_qr-code-tool/qr-core.js');

test('QR content validation preserves user text and counts UTF-8 bytes', () => {
  assert.equal(normalizeQrContent(' https://example.com?a=1 ', 'M'), ' https://example.com?a=1 ');
  assert.equal(getUtf8ByteLength('abc你好'), 9);
  assert.throws(() => normalizeQrContent('   ', 'L'), /请输入/);
  assert.throws(() => normalizeQrContent('a'.repeat(1274), 'H'), /最多支持约 1273/);
});

test('QR options normalize size, correction level, and colors', () => {
  assert.equal(normalizeQrSize('320'), 320);
  assert.equal(normalizeErrorCorrectionLevel('q'), 'Q');
  assert.equal(normalizeHexColor('#0F8'), '#00ff88');
  assert.deepEqual(
    normalizeGeneratorOptions({
      content: 'hello',
      darkColor: '#123456',
      errorCorrectionLevel: 'h',
      lightColor: '#fff',
      size: '512',
    }),
    {
      content: 'hello',
      darkColor: '#123456',
      errorCorrectionLevel: 'H',
      lightColor: '#ffffff',
      size: 512,
    },
  );
});

test('QR options reject invalid dimensions and indistinguishable colors', () => {
  assert.throws(() => normalizeQrSize('127'), /128 到 2048/);
  assert.throws(() => normalizeQrSize('320.5'), /整数/);
  assert.throws(() => normalizeHexColor('teal'), /十六进制/);
  assert.throws(
    () => normalizeGeneratorOptions({ content: 'hello', darkColor: '#ffffff', lightColor: '#fff', size: 320 }),
    /不能相同/,
  );
});

test('scan file validation accepts common images and enforces size limits', () => {
  const png = { name: 'qr.png', size: 2048, type: 'image/png' };
  assert.equal(validateScanFile(png), png);
  assert.equal(validateScanFile({ name: 'qr.JPG', size: 1024, type: '' }).name, 'qr.JPG');
  assert.throws(() => validateScanFile({ name: 'qr.svg', size: 1024, type: 'image/svg+xml' }), /PNG/);
  assert.throws(
    () => validateScanFile({ name: 'qr.png', size: 16 * 1024 * 1024, type: 'image/png' }),
    /15 MB/,
  );
});

test('scan dimensions reduce oversized images without changing their ratio', () => {
  assert.deepEqual(calculateScanDimensions(800, 600), { height: 600, width: 800 });
  assert.deepEqual(calculateScanDimensions(4800, 3200), { height: 1600, width: 2400 });
  assert.deepEqual(calculateScanDimensions(8000, 8000), { height: 2400, width: 2400 });
  assert.throws(() => calculateScanDimensions(0, 300), /有效的宽高/);
});

test('file-size formatting produces compact labels', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(2.5 * 1024 * 1024), '2.5 MB');
});
