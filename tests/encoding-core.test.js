const test = require('node:test');
const assert = require('node:assert/strict');
const {
  base64ToUtf8,
  decodeHtmlEntities,
  decodeUrl,
  encodeHtmlEntities,
  encodeUrl,
  normalizeBase64,
  utf8ToBase64,
} = require('../tools/20260811_encoding-converter/encoding-core.js');

test('Base64 uses UTF-8 and round-trips multilingual text', () => {
  assert.equal(utf8ToBase64('abc'), 'YWJj');
  assert.equal(utf8ToBase64('你好'), '5L2g5aW9');
  assert.equal(base64ToUtf8(utf8ToBase64('你好 😀')), '你好 😀');
});

test('Base64 decoding accepts whitespace and Base64URL characters', () => {
  assert.equal(base64ToUtf8('Y W J j\n'), 'abc');
  assert.equal(normalizeBase64('SGVsbG8td29ybGQ_'), 'SGVsbG8td29ybGQ/');
});

test('Base64 decoding rejects invalid input and non-UTF-8 bytes', () => {
  assert.throws(() => base64ToUtf8('abc$'), /无效字符/);
  assert.throws(() => base64ToUtf8('=='), /缺少有效数据/);
  assert.throws(() => base64ToUtf8('YWJj='), /填充字符/);
  assert.throws(() => base64ToUtf8('/w=='), /UTF-8/);
});

test('URL component and full URL modes preserve the expected structure', () => {
  assert.equal(encodeUrl('a b&c=中文'), 'a%20b%26c%3D%E4%B8%AD%E6%96%87');
  assert.equal(decodeUrl('a%20b%26c%3D%E4%B8%AD%E6%96%87'), 'a b&c=中文');
  assert.equal(
    encodeUrl('https://example.com/a b?q=中文', 'full'),
    'https://example.com/a%20b?q=%E4%B8%AD%E6%96%87',
  );
  assert.throws(() => decodeUrl('%E4%B8'), /不完整/);
});

test('HTML entity encoding supports special-only and ASCII-safe modes', () => {
  assert.equal(
    encodeHtmlEntities('<p title="x">Tom & Jerry\'s</p>'),
    '&lt;p title=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/p&gt;',
  );
  assert.equal(encodeHtmlEntities('你好 😀', 'ascii'), '&#x4F60;&#x597D; &#x1F600;');
});

test('HTML entity decoding supports named, decimal, and hexadecimal entities', () => {
  assert.equal(decodeHtmlEntities('&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;'), '<b>Tom & Jerry</b>');
  assert.equal(decodeHtmlEntities('&#20320;&#x597D; &copy;'), '你好 ©');
});
