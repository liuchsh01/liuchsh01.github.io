const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..');
const vendorFiles = new Map([
  ['tools/20260311_rsa-encrypt/vendor/jsencrypt-3.3.2.min.js', '53f2831ab8814f84f3d22b8cd8687f4aa3cf8d34c82ab7cd2ca67c4b7d7adc6f'],
  ['tools/20260811_sql-formatter/vendor/sql-formatter-15.8.2.min.js', 'bf5252945b7bd464032340a9926b1fbf5bc42ff45dfb8c758ef35d4a4b522014'],
  ['tools/20260811_qr-code-tool/vendor/qrcode-1.5.4.esm.js', '86e53965e1cb6f1efc134de70259812928912606b86da43661e6cdd914c32e6b'],
  ['tools/20260811_qr-code-tool/vendor/dijkstrajs-1.0.3.esm.js', 'd4ba77f0a7ec6f9e499012655acbbe18a3380f7d9e5a785028490d9c0705cede'],
  ['tools/20260811_qr-code-tool/vendor/jsqr-1.4.0.js', 'bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859'],
  ['tools/20260811_json-yaml-converter/vendor/js-yaml-4.1.0.min.js', '45dc3dd03dc07a06705a2c2989b8c7f709013f04bd5386e3279d4e447f07ebd7'],
]);

test('vendored runtime files retain their pinned content', () => {
  vendorFiles.forEach((expectedHash, relativePath) => {
    const contents = fs.readFileSync(path.join(projectRoot, relativePath));
    const actualHash = crypto.createHash('sha256').update(contents).digest('hex');
    assert.equal(actualHash, expectedHash, relativePath);
  });
});

test('vendored browser bundles expose their expected APIs', () => {
  const previousWindow = global.window;
  global.window = global;
  try {
    const JSEncrypt = require(path.join(projectRoot, 'tools/20260311_rsa-encrypt/vendor/jsencrypt-3.3.2.min.js'));
    const sqlFormatter = require(path.join(projectRoot, 'tools/20260811_sql-formatter/vendor/sql-formatter-15.8.2.min.js'));
    const jsQR = require(path.join(projectRoot, 'tools/20260811_qr-code-tool/vendor/jsqr-1.4.0.js'));
    const yaml = require(path.join(projectRoot, 'tools/20260811_json-yaml-converter/vendor/js-yaml-4.1.0.min.js'));

    assert.equal(typeof JSEncrypt, 'function');
    assert.equal(typeof sqlFormatter.format, 'function');
    assert.equal(typeof jsQR, 'function');
    assert.equal(typeof yaml.load, 'function');
    assert.equal(typeof yaml.dump, 'function');
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});

test('vendored qrcode ESM resolves its local dependency graph', async () => {
  const qrcodePath = path.join(projectRoot, 'tools/20260811_qr-code-tool/vendor/qrcode-1.5.4.esm.js');
  const qrcode = await import(pathToFileURL(qrcodePath).href);
  assert.equal(typeof qrcode.default?.toCanvas, 'function');
  assert.equal(typeof qrcode.toCanvas, 'function');
});
