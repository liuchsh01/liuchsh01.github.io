const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  DIRECTIONS,
  MODES,
  convertUrl,
  getModeHint,
} = require('../tools/20260928_url-codec/url-core.js');

const encode = (text, mode) => convertUrl(text, { direction: 'encode', mode });
const decode = (text, mode) => convertUrl(text, { direction: 'decode', mode });

test('exports the documented modes and provides UMD browser access', () => {
  assert.deepEqual(DIRECTIONS, ['encode', 'decode']);
  assert.deepEqual(MODES, ['component', 'full', 'form']);
  assert.match(getModeHint('form'), /application\/x-www-form-urlencoded/);
  assert.throws(() => getModeHint('query'), /模式无效/);

  const source = fs.readFileSync(path.resolve(__dirname, '../tools/20260928_url-codec/url-core.js'), 'utf8');
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'url-core.js' });
  assert.equal(typeof sandbox.UrlCodecCore.convertUrl, 'function');
  assert.equal(sandbox.UrlCodecCore.convertUrl('a b', { direction: 'encode', mode: 'component' }), 'a%20b');
});

test('component mode follows encodeURIComponent and decodeURIComponent for multilingual data', () => {
  const text = '中文 😀 /?&=+%';
  const encoded = ' %E4%B8%AD%E6%96%87%20%F0%9F%98%80%20%2F%3F%26%3D%2B%25'.trim();
  assert.equal(encode(text, 'component'), encoded);
  assert.equal(decode(encoded, 'component'), text);
  assert.equal(encode('%E4%B8%AD', 'component'), '%25E4%25B8%25AD');
});

test('full URL mode preserves URL delimiters while component mode escapes them', () => {
  const url = 'https://example.com/a b?q=中文&x=1#片段';
  assert.equal(encode(url, 'full'), 'https://example.com/a%20b?q=%E4%B8%AD%E6%96%87&x=1#%E7%89%87%E6%AE%B5');
  assert.equal(encode('%20 %ZZ', 'full'), '%2520%20%25ZZ');
  assert.equal(encode(':/?#[]@!$&\'()*+,;=', 'full'), ':/?#%5B%5D@!$&\'()*+,;=');
  assert.equal(encode(':/?#[]@!$&\'()*+,;=', 'component'), '%3A%2F%3F%23%5B%5D%40!%24%26\'()*%2B%2C%3B%3D');
  assert.equal(decode('https://example.com/a%20b?q=%E4%B8%AD%E6%96%87%26x%3D1', 'full'), 'https://example.com/a b?q=中文%26x%3D1');
});

test('form mode encodes one name or value using the URL Standard form rules', () => {
  assert.equal(encode('a b+c% 中文😀', 'form'), 'a+b%2Bc%25+%E4%B8%AD%E6%96%87%F0%9F%98%80');
  assert.equal(encode("!*'()~-._", 'form'), '%21*%27%28%29%7E-._');
  assert.equal(decode('a+b%2Bc%25+%E4%B8%AD%E6%96%87%F0%9F%98%80', 'form'), 'a b+c% 中文😀');
  assert.equal(decode('one+two%2Bthree', 'form'), 'one two+three');
});

test('strict decoding rejects malformed percent escapes and invalid UTF-8', () => {
  for (const mode of MODES) {
    assert.throws(() => decode('%', mode), /严格解码/);
    assert.throws(() => decode('%2G', mode), /严格解码/);
    assert.throws(() => decode('%E4%B8', mode), /严格解码/);
    assert.throws(() => decode('%C0%AF', mode), /严格解码/);
  }
});

test('validation rejects unknown options and lone surrogates while preserving empty and whitespace text', () => {
  assert.equal(encode('', 'component'), '');
  assert.equal(decode('', 'form'), '');
  assert.equal(encode(' \n\t ', 'component'), '%20%0A%09%20');
  assert.equal(decode('%20%0A%09%20', 'component'), ' \n\t ');
  assert.throws(() => convertUrl('x', { direction: 'rotate', mode: 'component' }), /方向无效/);
  assert.throws(() => convertUrl('x', { direction: 'encode', mode: 'query' }), /模式无效/);
  assert.throws(() => convertUrl('x'), /方向和模式/);
  assert.throws(() => convertUrl(1, { direction: 'encode', mode: 'component' }), /文本/);
  assert.throws(() => encode('before\ud800after', 'component'), /孤立代理项/);
  assert.throws(() => encode('\udc00', 'form'), /孤立代理项/);
});
