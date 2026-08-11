const test = require('node:test');
const assert = require('node:assert/strict');
const {
  constants,
  createCipheriv,
  createHmac,
  generateKeyPairSync,
  publicEncrypt,
  sign,
} = require('node:crypto');
const {
  decryptJwe,
  parseCompactToken,
  verifyJwtSignature,
} = require('../tools/20260811_token-inspector/token-core.js');

const base64Url = value => Buffer.from(value).toString('base64url');
const jsonSegment = value => base64Url(JSON.stringify(value));
const rsaKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

const createJwt = (header, payload, secret = null) => {
  const signingInput = `${jsonSegment(header)}.${jsonSegment(payload)}`;
  if (secret === null) return `${signingInput}.`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
};

test('JWT parsing separates protected header and payload', () => {
  const token = createJwt(
    { alg: 'none', typ: 'JWT' },
    { sub: '用户-1', roles: ['admin'], active: true },
  );
  const parsed = parseCompactToken(token, { nowSeconds: 1_700_000_000 });

  assert.equal(parsed.type, 'JWT');
  assert.deepEqual(parsed.header, { alg: 'none', typ: 'JWT' });
  assert.deepEqual(parsed.payload, { sub: '用户-1', roles: ['admin'], active: true });
  assert.equal(parsed.payloadIsJson, true);
  assert.equal(parsed.structure.valid, true);
});

test('registered JWT time claims are checked against a fixed time', () => {
  const active = createJwt(
    { alg: 'none' },
    { iat: 1_699_999_000, nbf: 1_699_999_500, exp: 1_700_001_000 },
  );
  const expired = createJwt({ alg: 'none' }, { exp: 1_699_999_999 });

  assert.equal(parseCompactToken(active, { nowSeconds: 1_700_000_000 }).claims.valid, true);
  const expiredClaims = parseCompactToken(expired, { nowSeconds: 1_700_000_000 }).claims;
  assert.equal(expiredClaims.valid, false);
  assert.ok(expiredClaims.checks.some(check => check.code === 'expired' && check.status === 'error'));
});

test('malformed compact tokens return actionable errors', () => {
  assert.throws(() => parseCompactToken('abc.def'), /3 段或 5 段/);
  assert.throws(() => parseCompactToken('@@@.e30.'), /Base64URL/);
  assert.throws(() => parseCompactToken(`${base64Url('not json')}.e30.`), /Header 不是有效的 JSON/);
});

test('HS256 verification accepts the correct secret and rejects a wrong one', async () => {
  const token = createJwt({ alg: 'HS256', typ: 'JWT' }, { sub: '123' }, 'local-secret');

  const valid = await verifyJwtSignature(token, 'local-secret', { format: 'utf8' });
  const invalid = await verifyJwtSignature(token, 'wrong-secret', { format: 'utf8' });

  assert.equal(valid.valid, true);
  assert.equal(valid.algorithm, 'HS256');
  assert.equal(invalid.valid, false);
});

test('RS256 verification accepts an SPKI PEM public key', async () => {
  const signingInput = `${jsonSegment({ alg: 'RS256', typ: 'JWT' })}.${jsonSegment({ sub: 'rsa-user' })}`;
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: rsaKeys.privateKey,
    padding: constants.RSA_PKCS1_PADDING,
  });
  const token = `${signingInput}.${base64Url(signature)}`;
  const publicPem = rsaKeys.publicKey.export({ format: 'pem', type: 'spki' });

  const result = await verifyJwtSignature(token, publicPem, { format: 'pem' });

  assert.equal(result.valid, true);
  assert.equal(result.algorithm, 'RS256');
});

test('JWE parsing separates the protected header and encrypted payload metadata', () => {
  const token = `${jsonSegment({ alg: 'dir', enc: 'A256GCM' })}..${base64Url(Buffer.alloc(12))}.${base64Url('cipher')}.${base64Url(Buffer.alloc(16))}`;
  const parsed = parseCompactToken(token);

  assert.equal(parsed.type, 'JWE');
  assert.deepEqual(parsed.header, { alg: 'dir', enc: 'A256GCM' });
  assert.equal(parsed.payload, null);
  assert.equal(parsed.encrypted.ivLength, 12);
  assert.equal(parsed.encrypted.tagLength, 16);
  assert.equal(parsed.structure.valid, true);
});

test('dir + A256GCM JWE decrypts and parses its JSON payload', async () => {
  const key = Buffer.alloc(32, 7);
  const protectedSegment = jsonSegment({ alg: 'dir', enc: 'A256GCM', typ: 'JWT' });
  const iv = Buffer.alloc(12, 3);
  const plaintext = Buffer.from(JSON.stringify({ sub: 'encrypted-user', scope: 'read' }));
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(protectedSegment, 'ascii'));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const token = `${protectedSegment}..${base64Url(iv)}.${base64Url(ciphertext)}.${base64Url(tag)}`;

  const decrypted = await decryptJwe(token, base64Url(key), { format: 'base64url' });

  assert.equal(decrypted.payloadIsJson, true);
  assert.deepEqual(decrypted.payload, { sub: 'encrypted-user', scope: 'read' });
  await assert.rejects(
    () => decryptJwe(token, base64Url(Buffer.alloc(32, 8)), { format: 'base64url' }),
    /解密失败/,
  );
});

test('RSA-OAEP-256 + A256GCM JWE decrypts with a PKCS8 PEM private key', async () => {
  const contentKey = Buffer.alloc(32, 11);
  const protectedSegment = jsonSegment({ alg: 'RSA-OAEP-256', enc: 'A256GCM' });
  const encryptedKey = publicEncrypt({
    key: rsaKeys.publicKey,
    oaepHash: 'sha256',
    padding: constants.RSA_PKCS1_OAEP_PADDING,
  }, contentKey);
  const iv = Buffer.alloc(12, 5);
  const plaintext = Buffer.from(JSON.stringify({ private: true }));
  const cipher = createCipheriv('aes-256-gcm', contentKey, iv);
  cipher.setAAD(Buffer.from(protectedSegment, 'ascii'));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const token = `${protectedSegment}.${base64Url(encryptedKey)}.${base64Url(iv)}.${base64Url(ciphertext)}.${base64Url(cipher.getAuthTag())}`;
  const privatePem = rsaKeys.privateKey.export({ format: 'pem', type: 'pkcs8' });

  const decrypted = await decryptJwe(token, privatePem, { format: 'pem' });

  assert.deepEqual(decrypted.payload, { private: true });
});
