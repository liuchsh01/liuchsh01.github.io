const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bcrypt = require('../tools/20260928_bcrypt-tool/vendor/bcryptjs-3.0.3.umd.js');
const {
  MAX_PASSWORD_BYTES,
  parseHash,
  validateCost,
  validatePassword,
} = require('../tools/20260928_bcrypt-tool/bcrypt-core.js');

// Interoperability vector from pyca/bcrypt:
// https://github.com/pyca/bcrypt/blob/main/tests/test_bcrypt.py
const KNOWN_PASSWORD = 'Kk4DQuMMfZL9o';
const KNOWN_PASSWORD_HASH = '$2b$04$cVWp4XaNU8a4v1uMRum2SO026BWLIoQMD/TXg5uZV.0P.uO8m3YEm';
const VALID_TAIL = '.'.repeat(53);
const TOOL_DIRECTORY = path.resolve(__dirname, '../tools/20260928_bcrypt-tool');

const runWorkerRequest = data => new Promise((resolve, reject) => {
  const messages = [];
  let messageHandler;
  const sandbox = {
    Uint8Array,
    TextEncoder,
    clearImmediate,
    clearTimeout,
    console,
    crypto: crypto.webcrypto,
    setImmediate,
    setTimeout,
  };
  sandbox.self = sandbox;
  sandbox.addEventListener = (type, handler) => {
    if (type === 'message') {
      messageHandler = handler;
    }
  };
  sandbox.postMessage = message => {
    messages.push(message);
    if (message.type === 'result') {
      clearTimeout(timeout);
      resolve({ messages, result: message });
    } else if (message.type === 'error') {
      clearTimeout(timeout);
      reject(new Error(message.message));
    }
  };
  const context = vm.createContext(sandbox);
  sandbox.importScripts = (...scriptPaths) => {
    for (const scriptPath of scriptPaths) {
      const source = fs.readFileSync(path.resolve(TOOL_DIRECTORY, scriptPath), 'utf8');
      vm.runInContext(source, context, { filename: scriptPath });
    }
  };
  vm.runInContext(fs.readFileSync(path.join(TOOL_DIRECTORY, 'worker.js'), 'utf8'), context, {
    filename: 'worker.js',
  });
  const timeout = setTimeout(() => reject(new Error('Worker 未在预期时间内返回结果。')), 5000);
  messageHandler({ data });
});

test('password validation counts UTF-8 bytes and preserves whitespace', () => {
  assert.equal(validatePassword('  '), 2);
  assert.equal(validatePassword('密码'), 6);
  assert.equal(validatePassword('😀'), 4);
  assert.equal(validatePassword('密'.repeat(24)), MAX_PASSWORD_BYTES);
  assert.equal(validatePassword('😀'.repeat(18)), MAX_PASSWORD_BYTES);
});

test('password validation rejects empty, oversized, and malformed UTF-16 input', () => {
  assert.throws(() => validatePassword(''), /空密码/);
  assert.throws(() => validatePassword('a'.repeat(73)), /最多支持 72/);
  assert.throws(() => validatePassword('密'.repeat(25)), /75 个 UTF-8 字节/);
  assert.throws(() => validatePassword('😀'.repeat(19)), /76 个 UTF-8 字节/);
  assert.throws(() => validatePassword('before\ud800after'), /孤立代理项/);
  assert.throws(() => validatePassword('ends-with-\ud800'), /孤立代理项/);
  assert.throws(() => validatePassword('\udc00'), /孤立代理项/);
});

test('cost validation accepts the supported range only', () => {
  assert.equal(validateCost(4), 4);
  assert.equal(validateCost('10'), 10);
  assert.equal(validateCost(16), 16);
  assert.throws(() => validateCost(3), /4 到 16/);
  assert.throws(() => validateCost(17), /4 到 16/);
  assert.throws(() => validateCost('8.5'), /4 到 16/);
  assert.throws(() => validateCost(''), /4 到 16/);
  assert.throws(() => validateCost([10]), /4 到 16/);
});

test('hash parser trims input and exposes version and cost', () => {
  const parsed = parseHash(`  ${KNOWN_PASSWORD_HASH}\n`);
  assert.deepEqual(parsed, {
    hash: KNOWN_PASSWORD_HASH,
    cost: 4,
    version: '2b',
  });

  for (const version of ['2a', '2b', '2y']) {
    const hash = `$${version}$04$${VALID_TAIL}`;
    assert.deepEqual(parseHash(hash), { hash, cost: 4, version });
  }
});

test('hash parser rejects malformed, unsupported, and impractical hashes before comparison', () => {
  assert.throws(() => parseHash(''), /请输入/);
  assert.throws(() => parseHash('$2x$10$' + VALID_TAIL), /格式无效/);
  assert.throws(() => parseHash('$2b$10$' + '!'.repeat(53)), /格式无效/);
  assert.throws(() => parseHash('$2b$03$' + VALID_TAIL), /04 到 31/);
  assert.throws(() => parseHash('$2b$17$' + VALID_TAIL), /最多支持 cost 16/);
  assert.throws(() => parseHash('$2b$32$' + VALID_TAIL), /04 到 31/);
  assert.throws(() => parseHash(KNOWN_PASSWORD_HASH.slice(0, -1)), /格式无效/);
});

test('bcryptjs verifies the known vector across supported 2a, 2b, and 2y revisions', async () => {
  for (const version of ['2a', '2b', '2y']) {
    const hash = KNOWN_PASSWORD_HASH.replace('$2b$', `$${version}$`);
    assert.equal(await bcrypt.compare(KNOWN_PASSWORD, hash), true, version);
    assert.equal(await bcrypt.compare('not-password', hash), false, version);
  }
});

test('bcryptjs salts are random and generated hashes use the current 2b revision', async () => {
  const [firstSalt, secondSalt] = await Promise.all([bcrypt.genSalt(4), bcrypt.genSalt(4)]);
  assert.match(firstSalt, /^\$2b\$04\$[./A-Za-z0-9]{22}$/);
  assert.match(secondSalt, /^\$2b\$04\$[./A-Za-z0-9]{22}$/);
  assert.notEqual(firstSalt, secondSalt);

  const hash = await bcrypt.hash('本地 Bcrypt', firstSalt);
  assert.match(hash, /^\$2b\$04\$[./A-Za-z0-9]{53}$/);
  assert.equal(await bcrypt.compare('本地 Bcrypt', hash), true);
});

test('classic Worker generates with local bcryptjs and reports bounded progress', async () => {
  const { messages, result } = await runWorkerRequest({
    id: 'generate-1',
    mode: 'generate',
    password: '浏览器本地处理',
    cost: 4,
  });

  assert.equal(result.id, 'generate-1');
  assert.match(result.hash, /^\$2b\$04\$[./A-Za-z0-9]{53}$/);
  assert.ok(messages.some(message => message.type === 'progress' && message.progress === 0));
  assert.ok(messages.some(message => message.type === 'progress' && message.progress === 1));
  assert.ok(messages.filter(message => message.type === 'progress').every(message => (
    message.progress >= 0 && message.progress <= 1
  )));
});

test('classic Worker verifies a known hash and reports a false match for another password', async () => {
  const correct = await runWorkerRequest({
    id: 'verify-correct',
    mode: 'verify',
    password: KNOWN_PASSWORD,
    hash: KNOWN_PASSWORD_HASH,
  });
  const incorrect = await runWorkerRequest({
    id: 'verify-incorrect',
    mode: 'verify',
    password: 'not-password',
    hash: KNOWN_PASSWORD_HASH,
  });

  assert.equal(correct.result.id, 'verify-correct');
  assert.equal(correct.result.type, 'result');
  assert.equal(correct.result.matched, true);
  assert.equal(incorrect.result.id, 'verify-incorrect');
  assert.equal(incorrect.result.type, 'result');
  assert.equal(incorrect.result.matched, false);
});
