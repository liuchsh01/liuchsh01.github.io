const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const {
  digestBytes,
  formatDigest,
  javaStringHashCode,
  md5Hex,
  splitTextLines,
  textToBytes,
} = require('../tools/20260810_hash-generator/hash-core.js');

test('MD5 matches standard ASCII test vectors', () => {
  assert.equal(md5Hex(textToBytes('')), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.equal(md5Hex(textToBytes('abc')), '900150983cd24fb0d6963f7d28e17f72');
  assert.equal(
    md5Hex(textToBytes('The quick brown fox jumps over the lazy dog')),
    '9e107d9d372bb6826bd81d3542a419d6',
  );
});

test('MD5 hashes UTF-8 bytes rather than UTF-16 code units', () => {
  assert.equal(md5Hex(textToBytes('你好')), '7eca689f0d3389d9dea66ae112e5cfd7');
});

test('Web Crypto algorithms match standard abc vectors', async () => {
  const bytes = textToBytes('abc');
  assert.equal(await digestBytes('SHA-1', bytes), 'a9993e364706816aba3e25717850c26c9cd0d89d');
  assert.equal(await digestBytes('SHA-256', bytes), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(await digestBytes('SHA-384', bytes), 'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7');
  assert.equal(await digestBytes('SHA-512', bytes), 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f');
});

test('formatDigest preserves the default hexadecimal output and supports Base64 formats', () => {
  const sha256Abc = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  assert.equal(formatDigest(sha256Abc), sha256Abc);
  assert.equal(formatDigest(sha256Abc, 'hex'), sha256Abc);
  assert.equal(formatDigest(sha256Abc, 'base64'), 'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=');
  assert.equal(formatDigest(sha256Abc, 'base64url'), 'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0');
});

test('formatDigest encodes digest bytes, including leading zeros and Base64 boundary characters', () => {
  assert.equal(formatDigest('00', 'base64'), 'AA==');
  assert.equal(formatDigest('fbff', 'base64'), '+/8=');
  assert.equal(formatDigest('fbff', 'base64url'), '-_8');
  assert.equal(formatDigest('', 'hex'), '');
  assert.equal(formatDigest('', 'base64'), '');
  assert.equal(formatDigest('', 'base64url'), '');
});

test('formatDigest matches Node crypto encodings for all supported algorithms and byte inputs', async () => {
  const algorithms = [
    ['MD5', 'md5'],
    ['SHA-1', 'sha1'],
    ['SHA-256', 'sha256'],
    ['SHA-384', 'sha384'],
    ['SHA-512', 'sha512'],
  ];
  const inputs = [
    new Uint8Array(),
    textToBytes('中文😀'),
    new Uint8Array([0x00, 0xff, 0x80, 0x3d, 0x2b, 0x2f]),
  ];

  for (const [browserAlgorithm, nodeAlgorithm] of algorithms) {
    for (const bytes of inputs) {
      const hex = await digestBytes(browserAlgorithm, bytes);
      const expected = createHash(nodeAlgorithm).update(bytes).digest();
      assert.equal(hex, expected.toString('hex'));
      assert.equal(formatDigest(hex, 'base64'), expected.toString('base64'));
      assert.equal(formatDigest(hex, 'base64url'), expected.toString('base64url'));
      assert.ok(!formatDigest(hex, 'base64url').includes('='));
    }
  }
});

test('formatDigest rejects malformed hexadecimal digests and unsupported encodings', () => {
  assert.throws(() => formatDigest('0'), /长度必须为偶数/);
  assert.throws(() => formatDigest('zz'), /只能包含十六进制字符/);
  assert.throws(() => formatDigest('000x', 'base64'), /只能包含十六进制字符/);
  assert.throws(() => formatDigest(null), /必须是十六进制字符串/);
  assert.throws(() => formatDigest('00', 'BASE64'), /不支持的 Hash 摘要编码/);
});

test('splitTextLines keeps meaningful blank lines and ignores one trailing separator', () => {
  assert.deepEqual(splitTextLines('第一行\n\n第三行\n'), ['第一行', '', '第三行']);
  assert.deepEqual(splitTextLines('a\r\nb\rc'), ['a', 'b', 'c']);
  assert.deepEqual(splitTextLines(''), []);
});

test('Java String.hashCode follows signed 32-bit UTF-16 semantics', () => {
  assert.equal(javaStringHashCode('abc'), 96354);
  assert.equal(javaStringHashCode('你好'), 652829);
  assert.equal(javaStringHashCode('😀'), 1772899);
  assert.equal(javaStringHashCode('aaaaaaaaaa'), -799347552);
});
