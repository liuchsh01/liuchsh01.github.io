const test = require('node:test');
const assert = require('node:assert/strict');
const {
  convertJsonToYaml,
  convertYamlToJson,
  normalizeIndent,
  parseJson,
} = require('../tools/20260811_json-yaml-converter/json-yaml-core.js');

const yamlStub = {
  load(source) {
    if (source === 'broken: [') {
      const error = new Error('unexpected end of the stream');
      error.mark = { line: 0, column: 8 };
      throw error;
    }
    if (source === '# only a comment') return undefined;
    if (source === 'circular') {
      const value = {};
      value.self = value;
      return value;
    }
    return { name: '工具箱', enabled: true, items: [1, 2] };
  },
  dump(value, options) {
    return JSON.stringify({ value, options });
  },
};

test('normalizeIndent accepts only supported indentation widths', () => {
  assert.equal(normalizeIndent(2), 2);
  assert.equal(normalizeIndent('4'), 4);
  assert.throws(() => normalizeIndent(3), /缩进/);
});

test('parseJson reports an actionable JSON syntax error', () => {
  assert.deepEqual(parseJson('{"name":"工具箱"}'), { name: '工具箱' });
  assert.throws(() => parseJson('{"name":}'), /JSON 语法错误/);
  assert.throws(() => parseJson('  '), /请输入/);
});

test('JSON to YAML parses JSON and passes stable dump options', () => {
  const output = JSON.parse(convertJsonToYaml('{"name":"工具箱","items":[1,2]}', 4, yamlStub));
  assert.deepEqual(output.value, { name: '工具箱', items: [1, 2] });
  assert.equal(output.options.indent, 4);
  assert.equal(output.options.noRefs, true);
  assert.equal(output.options.noCompatMode, true);
  assert.equal(output.options.lineWidth, -1);
});

test('JSON to YAML reports a missing formatter dependency', () => {
  assert.throws(() => convertJsonToYaml('{}', 2), /js-yaml 4\.1\.0/);
});

test('YAML to JSON returns formatted JSON using selected indentation', () => {
  assert.equal(
    convertYamlToJson('name: 工具箱', 2, yamlStub),
    '{\n  "name": "工具箱",\n  "enabled": true,\n  "items": [\n    1,\n    2\n  ]\n}',
  );
});

test('YAML to JSON reports line information and empty documents', () => {
  assert.throws(() => convertYamlToJson('broken: [', 2, yamlStub), /第 1 行，第 9 列/);
  assert.throws(() => convertYamlToJson('# only a comment', 2, yamlStub), /没有可转换的数据/);
});

test('YAML to JSON reports circular aliases that JSON cannot represent', () => {
  assert.throws(() => convertYamlToJson('circular', 2, yamlStub), /循环引用/);
});
