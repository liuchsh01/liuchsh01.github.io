const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateOutputDimensions,
  formatBytes,
  getOutputFilename,
  getOutputMimeType,
  normalizeQuality,
  normalizeResizeRequest,
  shareAspectRatio,
} = require('../tools/20260811_image-converter/image-core.js');

test('blank dimensions preserve the original image size', () => {
  assert.deepEqual(
    calculateOutputDimensions(1920, 1080, '', '', true),
    { height: 1080, width: 1920 },
  );
});

test('locked aspect ratio derives the missing dimension', () => {
  assert.deepEqual(
    calculateOutputDimensions(1920, 1080, '960', '', true),
    { height: 540, width: 960 },
  );
  assert.deepEqual(
    calculateOutputDimensions(1920, 1080, '', '270', true),
    { height: 270, width: 480 },
  );
});

test('locked width and height define a containing box', () => {
  assert.deepEqual(
    calculateOutputDimensions(1200, 600, '400', '400', true),
    { height: 200, width: 400 },
  );
  assert.deepEqual(
    calculateOutputDimensions(600, 1200, '400', '400', true),
    { height: 400, width: 200 },
  );
});

test('batch aspect-ratio comparison distinguishes shared and mixed ratios', () => {
  assert.equal(shareAspectRatio([
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
    { width: 640, height: 360 },
  ]), true);
  assert.equal(shareAspectRatio([
    { width: 1920, height: 1080 },
    { width: 1080, height: 1920 },
  ]), false);
  assert.equal(shareAspectRatio([{ width: 800, height: 600 }]), true);
  assert.throws(
    () => shareAspectRatio([{ width: 800, height: 600 }, { width: 0, height: 600 }]),
    /图片尺寸无效/,
  );
});

test('unlocked dimensions force an exact size and require both values', () => {
  assert.deepEqual(
    calculateOutputDimensions(1200, 600, '500', '300', false),
    { height: 300, width: 500 },
  );
  assert.throws(
    () => calculateOutputDimensions(1200, 600, '500', '', false),
    /同时填写输出宽度和高度/,
  );
});

test('resize request validation does not assume a source aspect ratio', () => {
  assert.deepEqual(
    normalizeResizeRequest('16000', '', true),
    { height: null, keepAspect: true, width: 16000 },
  );
  assert.throws(() => normalizeResizeRequest('800', '', false), /同时填写输出宽度和高度/);
});

test('invalid and excessive output sizes are rejected', () => {
  assert.throws(() => calculateOutputDimensions(0, 600, '', '', true), /原图尺寸无效/);
  assert.throws(() => calculateOutputDimensions(1200, 600, '-1', '', true), /正整数/);
  assert.throws(() => calculateOutputDimensions(1200, 600, '16385', '', true), /不能超过/);
  assert.throws(() => calculateOutputDimensions(1200, 600, '12000', '12000', false), /总像素/);
});

test('output format helpers create stable MIME types and filenames', () => {
  assert.equal(getOutputMimeType('png'), 'image/png');
  assert.equal(getOutputMimeType('jpeg'), 'image/jpeg');
  assert.equal(getOutputMimeType('webp'), 'image/webp');
  assert.equal(getOutputFilename('holiday.photo.JPG', 'webp'), 'holiday.photo-converted.webp');
  assert.equal(getOutputFilename('image', 'jpeg'), 'image-converted.jpg');
});

test('quality and byte-size helpers normalize user-facing values', () => {
  assert.equal(normalizeQuality('85'), 0.85);
  assert.equal(normalizeQuality(100), 1);
  assert.throws(() => normalizeQuality(0), /1 到 100/);
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1536), '1.5 KB');
});
