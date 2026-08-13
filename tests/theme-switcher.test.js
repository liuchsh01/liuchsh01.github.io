'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/common.js'), 'utf8');
const themeCss = fs.readFileSync(path.join(__dirname, '../assets/css/theme.css'), 'utf8');
const storedValues = new Map([['toolbox-theme', 'sand']]);
const documentListeners = new Map();
const windowListeners = new Map();
const selectListeners = new Map();
const meta = {
  content: '',
  setAttribute(name, value) {
    if (name === 'content') this.content = value;
  },
};
const toast = {
  textContent: '',
  offsetWidth: 0,
  classList: {
    values: new Set(),
    add(value) { this.values.add(value); },
    remove(value) { this.values.delete(value); },
  },
};
const select = {
  value: 'jade',
  addEventListener(type, callback) {
    selectListeners.set(type, callback);
  },
};
const documentElement = { dataset: {}, style: {}, append() {} };
const body = { append() {} };
const document = {
  body,
  documentElement,
  readyState: 'loading',
  activeElement: null,
  querySelector(selector) {
    if (selector === 'meta[name="theme-color"]') return meta;
    if (selector === '[data-toast]') return toast;
    return null;
  },
  querySelectorAll(selector) {
    return selector === '[data-theme-select]' ? [select] : [];
  },
  addEventListener(type, callback) {
    documentListeners.set(type, callback);
  },
  createElement() {
    return {
      className: '',
      dataset: {},
      style: {},
      value: '',
      readOnly: false,
      setAttribute() {},
      select() {},
      setSelectionRange() {},
      remove() {},
    };
  },
  execCommand() {
    return true;
  },
};
const localStorage = {
  getItem(key) {
    return storedValues.get(key) ?? null;
  },
  setItem(key, value) {
    storedValues.set(key, String(value));
  },
};
const windowObject = {
  localStorage,
  clearTimeout() {},
  setTimeout() { return 1; },
  addEventListener(type, callback) {
    windowListeners.set(type, callback);
  },
  dispatchEvent() {},
};

const context = vm.createContext({
  window: windowObject,
  document,
  navigator: {},
  CustomEvent: class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  },
  HTMLElement: class HTMLElement {},
  console,
});

vm.runInContext(source, context, { filename: 'common.js' });

const extractThemeVariables = selector => {
  const start = themeCss.indexOf(selector);
  const end = themeCss.indexOf('\n}', start);
  assert.notEqual(start, -1, 'missing selector ' + selector);
  return Object.fromEntries(
    [...themeCss.slice(start, end).matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)]
      .map(match => [match[1], match[2].trim()]),
  );
};
const defaultVariables = extractThemeVariables(':root {');
const resolveVariable = (variables, name) => {
  const value = variables[name];
  const reference = value?.match(/^var\(--([a-z0-9-]+)\)$/);
  return reference ? resolveVariable(variables, reference[1]) : value;
};
const relativeLuminance = hex => {
  const channels = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map(channel => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
const contrastRatio = (first, second) => {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
};

assert.match(
  themeCss,
  /\.theme-picker select\s*\{[^}]*min-height:\s*44px/s,
  'homepage theme selector must provide a 44px touch target',
);
assert.match(
  themeCss,
  /@media \(max-width: 520px\)\s*\{[\s\S]*?body button:not\(\[hidden\]\),[\s\S]*?body select:not\(\[hidden\]\)\s*\{\s*min-height:\s*44px;/,
  'mobile buttons and selects must keep a 44px touch target',
);

['blueprint', 'soda', 'violet', 'night'].forEach(themeId => {
  const selector = ':root[data-theme="' + themeId + '"]';
  const start = themeCss.indexOf(selector);
  const end = themeCss.indexOf('\n}', start);
  assert.notEqual(start, -1, 'missing ' + themeId + ' theme block');
  const block = themeCss.slice(start, end);
  assert.match(block, /--body-pattern:/, themeId + ' theme must define a background texture');
  assert.match(block, /--radius-card:/, themeId + ' theme must define its radius character');
  assert.match(block, /--font-serif:/, themeId + ' theme must define its display typography');
});

['jade', 'blueprint', 'soda', 'violet', 'night'].forEach(themeId => {
  const overrides = themeId === 'jade' ? {} : extractThemeVariables(':root[data-theme="' + themeId + '"]');
  const variables = { ...defaultVariables, ...overrides };
  const muted = resolveVariable(variables, 'muted-soft');
  const controlBackground = resolveVariable(variables, 'control-bg');
  const selectedBackground = resolveVariable(variables, 'teal-pale');
  const focus = resolveVariable(variables, 'focus-ring');
  const paper = resolveVariable(variables, 'paper');
  const controlLine = resolveVariable(variables, 'control-line');
  assert.ok(contrastRatio(muted, controlBackground) >= 4.5, themeId + ' placeholder contrast is too low');
  assert.ok(contrastRatio(muted, selectedBackground) >= 4.5, themeId + ' small helper contrast is too low');
  assert.ok(contrastRatio(focus, paper) >= 3, themeId + ' focus contrast is too low');
  assert.ok(contrastRatio(controlLine, paper) >= 3, themeId + ' control boundary contrast is too low');
});

assert.equal(documentElement.dataset.theme, 'soda');
assert.equal(documentElement.style.colorScheme, 'light');
assert.equal(meta.content, '#e85d04');
assert.equal(windowObject.Toolbox.getTheme(), 'soda');
assert.equal(windowObject.Toolbox.themes.length, 5);
assert.equal(storedValues.get('toolbox-theme'), 'soda');

documentListeners.get('DOMContentLoaded')();
assert.equal(select.value, 'soda');

select.value = 'night';
selectListeners.get('change')();
assert.equal(documentElement.dataset.theme, 'night');
assert.equal(documentElement.style.colorScheme, 'dark');
assert.equal(meta.content, '#63c7b1');
assert.equal(storedValues.get('toolbox-theme'), 'night');
assert.equal(toast.textContent, '已切换为深林夜色主题');

windowObject.Toolbox.setTheme('unknown-theme');
assert.equal(documentElement.dataset.theme, 'jade');
assert.equal(storedValues.get('toolbox-theme'), 'jade');

windowListeners.get('storage')({ key: 'toolbox-theme', newValue: 'ocean' });
assert.equal(documentElement.dataset.theme, 'blueprint');
assert.equal(storedValues.get('toolbox-theme'), 'jade');

test('copyText converts a denied fallback into accessible feedback', async () => {
  document.execCommand = () => false;
  const copied = await windowObject.Toolbox.copyText('copy test');

  assert.equal(copied, false);
  assert.equal(toast.textContent, '复制失败，请手动选择并复制');
});

console.log('PASS: theme switcher tests');
