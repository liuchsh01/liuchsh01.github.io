((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.JsonFormatterCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const FULL_WIDTH_PUNCTUATION = Object.freeze({
    '｛': '{',
    '｝': '}',
    '［': '[',
    '］': ']',
    '：': ':',
    '，': ',',
  });

  const QUOTE_CLOSERS = Object.freeze({
    '"': '"',
    "'": "'",
    '“': '”',
    '‘': '’',
  });

  const addRepair = (repairs, message) => repairs.add(message);

  const readQuotedString = (source, start, repairs) => {
    const opener = source[start];
    const closer = QUOTE_CLOSERS[opener];
    let value = '';
    let index = start + 1;

    if (opener === "'") addRepair(repairs, '将单引号字符串转换为标准双引号字符串');
    if (opener === '“' || opener === '‘') addRepair(repairs, '将智能引号转换为标准双引号字符串');

    while (index < source.length) {
      const character = source[index];
      if (character === closer) {
        return { token: JSON.stringify(value), end: index + 1 };
      }

      if (character === '\\') {
        const escaped = source[index + 1];
        if (escaped === undefined) {
          value += '\\';
          index += 1;
          break;
        }

        const escapeValues = {
          '"': '"',
          "'": "'",
          '\\': '\\',
          '/': '/',
          b: '\b',
          f: '\f',
          n: '\n',
          r: '\r',
          t: '\t',
        };

        if (Object.hasOwn(escapeValues, escaped)) {
          value += escapeValues[escaped];
          index += 2;
          continue;
        }

        if (escaped === 'u' && /^[0-9a-fA-F]{4}$/.test(source.slice(index + 2, index + 6))) {
          value += String.fromCharCode(Number.parseInt(source.slice(index + 2, index + 6), 16));
          index += 6;
          continue;
        }

        value += escaped;
        addRepair(repairs, '修正字符串中的非标准转义字符');
        index += 2;
        continue;
      }

      if (character === '\r' || character === '\n') {
        value += '\n';
        if (character === '\r' && source[index + 1] === '\n') index += 1;
        addRepair(repairs, '转义字符串中的原始换行');
      } else {
        value += character;
      }
      index += 1;
    }

    addRepair(repairs, '补全未闭合的字符串引号');
    return { token: JSON.stringify(value), end: index };
  };

  const normalizeJsonLikeSyntax = (source, repairs) => {
    let input = String(source ?? '');
    if (input.charCodeAt(0) === 0xfeff) {
      input = input.slice(1);
      addRepair(repairs, '移除 UTF-8 BOM');
    }

    let output = '';
    let index = 0;
    while (index < input.length) {
      const character = input[index];

      if (Object.hasOwn(QUOTE_CLOSERS, character)) {
        const stringToken = readQuotedString(input, index, repairs);
        output += stringToken.token;
        index = stringToken.end;
        continue;
      }

      if (character === '/' && input[index + 1] === '/') {
        index += 2;
        while (index < input.length && input[index] !== '\n' && input[index] !== '\r') index += 1;
        addRepair(repairs, '移除行注释');
        continue;
      }

      if (character === '/' && input[index + 1] === '*') {
        const closingIndex = input.indexOf('*/', index + 2);
        index = closingIndex === -1 ? input.length : closingIndex + 2;
        addRepair(repairs, '移除块注释');
        continue;
      }

      if (Object.hasOwn(FULL_WIDTH_PUNCTUATION, character)) {
        output += FULL_WIDTH_PUNCTUATION[character];
        addRepair(repairs, '将全角 JSON 标点转换为半角标点');
      } else {
        output += character;
      }
      index += 1;
    }
    return output.trim();
  };

  const readJsonStringToken = (source, start) => {
    let index = start + 1;
    while (index < source.length) {
      if (source[index] === '\\') {
        index += 2;
        continue;
      }
      if (source[index] === '"') return index + 1;
      index += 1;
    }
    return source.length;
  };

  const quoteBareObjectKeys = (source, repairs) => {
    let output = '';
    let index = 0;
    const stack = [];

    while (index < source.length) {
      const character = source[index];
      const current = stack.at(-1);

      if (character === '"') {
        const end = readJsonStringToken(source, index);
        output += source.slice(index, end);
        if (current?.type === 'object' && current.expectingKey) current.expectingKey = false;
        index = end;
        continue;
      }

      if (character === '{') {
        stack.push({ type: 'object', expectingKey: true });
        output += character;
        index += 1;
        continue;
      }

      if (character === '[') {
        stack.push({ type: 'array', expectingKey: false });
        output += character;
        index += 1;
        continue;
      }

      if (character === '}' || character === ']') {
        stack.pop();
        output += character;
        index += 1;
        continue;
      }

      if (character === ',') {
        if (current?.type === 'object') current.expectingKey = true;
        output += character;
        index += 1;
        continue;
      }

      if (current?.type === 'object' && current.expectingKey) {
        if (/\s/.test(character)) {
          output += character;
          index += 1;
          continue;
        }

        const match = source.slice(index).match(/^([^\s:{}\[\],]+)(\s*):/u);
        if (match) {
          output += `${JSON.stringify(match[1])}${match[2]}:`;
          current.expectingKey = false;
          index += match[0].length;
          addRepair(repairs, '为未加引号的对象键补充双引号');
          continue;
        }
      }

      output += character;
      index += 1;
    }

    return output;
  };

  const transformOutsideStrings = (source, transform) => {
    let output = '';
    let segment = '';
    let index = 0;

    const flush = () => {
      output += transform(segment);
      segment = '';
    };

    while (index < source.length) {
      if (source[index] === '"') {
        flush();
        const end = readJsonStringToken(source, index);
        output += source.slice(index, end);
        index = end;
      } else {
        segment += source[index];
        index += 1;
      }
    }
    flush();
    return output;
  };

  const normalizeLiterals = (source, repairs) => transformOutsideStrings(source, segment => {
    let output = segment;
    const original = output;
    output = output.replace(/\b(?:True|TRUE)\b/g, 'true');
    output = output.replace(/\b(?:False|FALSE)\b/g, 'false');
    output = output.replace(/\b(?:None|NULL)\b/g, 'null');
    output = output.replace(/(^|[^\w$])(?:-?Infinity|NaN|undefined)(?=$|[^\w$])/g, '$1null');
    if (output !== original) addRepair(repairs, '将非标准布尔值或空值转换为 JSON 字面量');
    return output;
  });

  const removeTrailingCommas = (source, repairs) => {
    let output = '';
    let index = 0;
    while (index < source.length) {
      if (source[index] === '"') {
        const end = readJsonStringToken(source, index);
        output += source.slice(index, end);
        index = end;
        continue;
      }

      if (source[index] === ',') {
        let next = index + 1;
        while (next < source.length && /\s/.test(source[next])) next += 1;
        if (source[next] === '}' || source[next] === ']') {
          output += source.slice(index + 1, next);
          index = next;
          addRepair(repairs, '移除对象或数组末尾的多余逗号');
          continue;
        }
      }

      output += source[index];
      index += 1;
    }
    return output;
  };

  const appendMissingClosers = (source, repairs) => {
    const stack = [];
    let index = 0;
    while (index < source.length) {
      const character = source[index];
      if (character === '"') {
        index = readJsonStringToken(source, index);
        continue;
      }
      if (character === '{') stack.push('}');
      if (character === '[') stack.push(']');
      if (character === '}' || character === ']') {
        if (stack.at(-1) === character) stack.pop();
      }
      index += 1;
    }

    if (!stack.length) return source;
    addRepair(repairs, '补全缺失的闭合括号');
    return source + stack.reverse().join('');
  };

  const repairJson = (source) => {
    const repairs = new Set();
    let repairedSource = normalizeJsonLikeSyntax(source, repairs);
    repairedSource = quoteBareObjectKeys(repairedSource, repairs);
    repairedSource = normalizeLiterals(repairedSource, repairs);
    repairedSource = removeTrailingCommas(repairedSource, repairs);
    repairedSource = appendMissingClosers(repairedSource, repairs);
    return { source: repairedSource, repairs: [...repairs] };
  };

  const formatJson = (value) => JSON.stringify(value, null, 2);

  const parseJson = (source, options = {}) => {
    const input = String(source ?? '').trim();
    if (!input) throw new Error('请输入要格式化的 JSON 字符串。');

    try {
      const value = JSON.parse(input);
      return {
        formatted: formatJson(value),
        repaired: false,
        repairedSource: input,
        repairs: [],
        value,
      };
    } catch (strictError) {
      if (!options.repair) {
        throw new Error(`JSON 解析失败：${strictError.message}`);
      }

      const repaired = repairJson(input);
      try {
        const value = JSON.parse(repaired.source);
        return {
          formatted: formatJson(value),
          repaired: true,
          repairedSource: repaired.source,
          repairs: repaired.repairs,
          value,
        };
      } catch (repairError) {
        throw new Error(`自动修正后仍无法解析：${repairError.message}`);
      }
    }
  };

  return { formatJson, parseJson, repairJson };
});
