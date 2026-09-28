'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const core = require('../tools/20260928_bcrypt-tool/bcrypt-core.js');
const source = fs.readFileSync(path.join(__dirname, '../tools/20260928_bcrypt-tool/script.js'), 'utf8');
const VALID_HASH = `$2b$10$${'.'.repeat(53)}`;

const makeElement = (options = {}) => {
  const listeners = new Map();
  const attributes = new Map();
  const classes = new Set();
  return {
    value: options.value || '',
    type: options.type || '',
    checked: Boolean(options.checked),
    disabled: Boolean(options.disabled),
    hidden: Boolean(options.hidden),
    textContent: options.textContent || '',
    className: options.className || '',
    classList: {
      add(value) { classes.add(value); },
      contains(value) { return classes.has(value); },
    },
    addEventListener(type, callback) { listeners.set(type, callback); },
    dispatch(type, event = {}) {
      const callback = listeners.get(type);
      assert.ok(callback, `missing ${type} listener`);
      callback({ preventDefault() {}, target: this, ...event });
    },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) || null; },
    focus() { this.focused = true; },
  };
};

const createHarness = ({ worker = false, protocol = 'https:', throwWorker = false } = {}) => {
  const form = makeElement();
  const generateMode = makeElement({ type: 'radio', checked: true });
  const verifyMode = makeElement({ type: 'radio' });
  generateMode.value = 'generate';
  verifyMode.value = 'verify';
  generateMode.name = 'mode';
  verifyMode.name = 'mode';
  const elements = {
    bcryptForm: form,
    passwordInput: makeElement({ type: 'password' }),
    togglePassword: makeElement({ type: 'button' }),
    byteCount: makeElement({ textContent: '0 / 72 字节' }),
    costInput: makeElement({ type: 'number', value: '10' }),
    hashInput: makeElement(),
    generateFields: makeElement(),
    verifyFields: makeElement({ hidden: true }),
    runButton: makeElement({ type: 'submit', textContent: '生成 Hash' }),
    cancelButton: makeElement({ type: 'button', hidden: true }),
    clearButton: makeElement({ type: 'button' }),
    formStatus: makeElement(),
    emptyState: makeElement(),
    resultDetails: makeElement({ hidden: true }),
    resultOutput: makeElement(),
    outputLabel: makeElement(),
    resultMeta: makeElement(),
    copyResult: makeElement({ type: 'button', disabled: true }),
    useForVerify: makeElement({ type: 'button', hidden: true }),
    progressPanel: makeElement({ hidden: true }),
    progressBar: makeElement(),
    progressLabel: makeElement(),
    progressHint: makeElement(),
  };
  const modes = [generateMode, verifyMode];
  form.querySelectorAll = selector => {
    assert.equal(selector, 'input[name="mode"]');
    return modes;
  };

  const windowListeners = new Map();
  const timers = new Map();
  let timerId = 0;
  const workerInstances = [];
  class FakeWorker {
    constructor(url) {
      if (throwWorker) throw new Error('Worker unavailable');
      this.url = url;
      this.messages = [];
      this.terminated = false;
      workerInstances.push(this);
    }

    postMessage(message) { this.messages.push(message); }
    terminate() { this.terminated = true; }
  }

  const bcryptCalls = { hash: [], compare: [] };
  const bcrypt = {
    hash(...args) { bcryptCalls.hash.push(args); },
    compare(...args) { bcryptCalls.compare.push(args); },
  };
  const windowObject = {
    BcryptToolCore: core,
    bcrypt,
    TextEncoder,
    Worker: worker ? FakeWorker : undefined,
    location: { protocol },
    crypto: { getRandomValues(value) { return value; } },
    setTimeout(callback) {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(type, callback) { windowListeners.set(type, callback); },
    Toolbox: { copyText() {} },
  };
  const document = {
    getElementById(id) {
      assert.ok(id in elements, `unexpected element ${id}`);
      return elements[id];
    },
  };
  const context = vm.createContext({
    window: windowObject,
    document,
    Worker: worker ? FakeWorker : undefined,
    TextEncoder,
    performance: { now: () => 1000 },
  });
  vm.runInContext(source, context, { filename: 'bcrypt-script.js' });

  return {
    bcryptCalls,
    elements,
    modes,
    submit() { form.dispatch('submit'); },
    input(target) { form.dispatch('input', { target }); },
    pagehide() { windowListeners.get('pagehide')(); },
    timers,
    workerInstances,
  };
};

test('Worker cancellation terminates work and ignores a delayed result', () => {
  const ui = createHarness({ worker: true });
  ui.elements.passwordInput.value = 'correct horse battery staple';
  ui.submit();

  const worker = ui.workerInstances[0];
  const delayedMessage = worker.onmessage;
  assert.equal(worker.messages.length, 1);
  assert.equal(ui.elements.cancelButton.hidden, false);

  ui.elements.cancelButton.dispatch('click');
  assert.equal(worker.terminated, true);
  assert.equal(ui.elements.runButton.disabled, false);
  assert.equal(ui.elements.resultDetails.hidden, true);
  assert.match(ui.elements.formStatus.textContent, /已取消计算/);

  delayedMessage({ data: { id: worker.messages[0].id, type: 'result', hash: VALID_HASH } });
  assert.equal(ui.elements.resultOutput.value, '');
  assert.match(ui.elements.formStatus.textContent, /已取消计算/);
});

test('mode and input changes clear an existing result', () => {
  const ui = createHarness({ worker: true });
  ui.elements.passwordInput.value = 'password';
  ui.submit();
  const worker = ui.workerInstances[0];
  worker.onmessage({ data: { id: worker.messages[0].id, type: 'result', hash: VALID_HASH } });
  assert.equal(ui.elements.resultDetails.hidden, false);
  assert.equal(ui.elements.resultOutput.value, VALID_HASH);

  ui.modes[0].checked = false;
  ui.modes[1].checked = true;
  ui.modes[1].dispatch('change');
  assert.equal(ui.elements.verifyFields.hidden, false);
  assert.equal(ui.elements.resultDetails.hidden, true);
  assert.equal(ui.elements.resultOutput.value, '');

  ui.elements.hashInput.value = VALID_HASH;
  ui.input(ui.elements.hashInput);
  assert.equal(ui.elements.resultDetails.hidden, true);
  assert.match(ui.elements.formStatus.textContent, /输入已更新/);
});

test('fallback rejects cost above 12 before starting bcrypt', () => {
  const ui = createHarness({ protocol: 'file:' });
  ui.elements.passwordInput.value = 'password';
  ui.elements.costInput.value = '13';
  ui.submit();

  assert.equal(ui.bcryptCalls.hash.length, 0);
  assert.equal(ui.elements.runButton.disabled, false);
  assert.match(ui.elements.formStatus.textContent, /最高支持 cost 12/);
  assert.match(ui.elements.formStatus.className, /is-error/);
});

test('fallback invokes bcrypt hash and compare asynchronously with validated payloads', () => {
  const ui = createHarness({ protocol: 'file:' });
  ui.elements.passwordInput.value = 'password';
  ui.submit();
  assert.equal(ui.bcryptCalls.hash.length, 1);
  const [hashPassword, hashCost, hashCallback, hashProgress] = ui.bcryptCalls.hash[0];
  assert.equal(hashPassword, 'password');
  assert.equal(hashCost, 10);
  assert.equal(typeof hashCallback, 'function');
  assert.equal(typeof hashProgress, 'function');
  hashProgress(0.5);
  assert.equal(ui.elements.progressBar.value, 0.5);
  hashCallback(null, VALID_HASH);
  assert.equal(ui.elements.resultOutput.value, VALID_HASH);
  assert.equal(ui.elements.copyResult.disabled, false);

  ui.modes[0].checked = false;
  ui.modes[1].checked = true;
  ui.modes[1].dispatch('change');
  ui.elements.hashInput.value = VALID_HASH;
  ui.submit();
  assert.equal(ui.bcryptCalls.compare.length, 1);
  const [comparePassword, compareHash, compareCallback, compareProgress] = ui.bcryptCalls.compare[0];
  assert.equal(comparePassword, 'password');
  assert.equal(compareHash, VALID_HASH);
  assert.equal(typeof compareCallback, 'function');
  assert.equal(typeof compareProgress, 'function');
  compareCallback(null, true);
  assert.equal(ui.elements.resultOutput.value, '匹配成功');
  assert.match(ui.elements.formStatus.textContent, /匹配/);
});

test('pagehide discards a fallback job so its late callback cannot update the page', () => {
  const ui = createHarness({ protocol: 'file:' });
  ui.elements.passwordInput.value = 'password';
  ui.submit();
  const callback = ui.bcryptCalls.hash[0][2];
  ui.pagehide();
  assert.equal(ui.elements.runButton.disabled, false);
  assert.match(ui.elements.formStatus.textContent, /结果已丢弃/);

  callback(null, VALID_HASH);
  assert.equal(ui.elements.resultDetails.hidden, true);
  assert.equal(ui.elements.resultOutput.value, '');
  assert.match(ui.elements.formStatus.textContent, /结果已丢弃/);
});

test('a Worker failure terminates it and starts one fallback job without reusing Worker state', () => {
  const ui = createHarness({ worker: true });
  ui.elements.passwordInput.value = 'password';
  ui.submit();
  const worker = ui.workerInstances[0];
  worker.onerror({ preventDefault() {} });

  assert.equal(worker.terminated, true);
  assert.equal(worker.onmessage, null);
  assert.equal(ui.bcryptCalls.hash.length, 1);
  assert.equal(ui.elements.cancelButton.disabled, true);
  // Browser event dispatch reads the current handler. A queued Worker message must
  // therefore be ignored after fallback clears this handler.
  worker.onmessage?.({ data: { id: worker.messages[0].id, type: 'result', hash: 'stale-worker-result' } });
  assert.equal(ui.bcryptCalls.hash.length, 1);
  assert.equal(ui.elements.resultOutput.value, '');

  ui.bcryptCalls.hash[0][2](null, VALID_HASH);
  assert.equal(ui.elements.resultOutput.value, VALID_HASH);
});
