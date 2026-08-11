((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.EncodingConverterCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const HTML_ENTITIES = Object.freeze({
    amp: '&',
    apos: "'",
    cent: '¢',
    copy: '©',
    deg: '°',
    divide: '÷',
    euro: '€',
    gt: '>',
    hellip: '…',
    laquo: '«',
    lt: '<',
    mdash: '—',
    middot: '·',
    nbsp: '\u00a0',
    ndash: '–',
    para: '¶',
    plusmn: '±',
    pound: '£',
    quot: '"',
    raquo: '»',
    reg: '®',
    sect: '§',
    times: '×',
    trade: '™',
    yen: '¥',
  });

  const HTML_SPECIAL_CHARACTERS = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  });

  const getBase64Functions = () => {
    if (typeof btoa !== 'function' || typeof atob !== 'function') {
      throw new Error('当前环境不支持 Base64 转换。');
    }
    return { atob, btoa };
  };

  const bytesToBinary = (bytes) => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return binary;
  };

  const utf8ToBase64 = (value) => {
    const { btoa: encodeBinary } = getBase64Functions();
    const bytes = new TextEncoder().encode(String(value ?? ''));
    return encodeBinary(bytesToBinary(bytes));
  };

  const normalizeBase64 = (value) => {
    const compact = String(value ?? '').replace(/\s+/g, '');
    if (!compact) return '';

    const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
      throw new Error('Base64 内容包含无效字符。');
    }
    const withoutPadding = normalized.replace(/=+$/, '');
    const suppliedPadding = normalized.length - withoutPadding.length;
    if (!withoutPadding) {
      throw new Error('Base64 内容缺少有效数据。');
    }
    if (withoutPadding.length % 4 === 1) {
      throw new Error('Base64 长度不正确，请检查内容是否完整。');
    }
    const expectedPadding = (4 - (withoutPadding.length % 4)) % 4;
    if (suppliedPadding && (normalized.length % 4 !== 0 || suppliedPadding !== expectedPadding)) {
      throw new Error('Base64 填充字符位置不正确。');
    }
    return withoutPadding.padEnd(Math.ceil(withoutPadding.length / 4) * 4, '=');
  };

  const base64ToUtf8 = (value) => {
    const { atob: decodeBinary } = getBase64Functions();
    const normalized = normalizeBase64(value);
    if (!normalized) return '';

    let binary;
    try {
      binary = decodeBinary(normalized);
    } catch (error) {
      throw new Error('Base64 格式不正确，无法解码。');
    }

    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
      throw new Error('解码后的内容不是有效的 UTF-8 文本。');
    }
  };

  const encodeUrl = (value, mode = 'component') => {
    const source = String(value ?? '');
    try {
      return mode === 'full' ? encodeURI(source) : encodeURIComponent(source);
    } catch (error) {
      throw new Error('文本中包含无法进行 URL 编码的字符。');
    }
  };

  const decodeUrl = (value, mode = 'component') => {
    const source = String(value ?? '');
    try {
      return mode === 'full' ? decodeURI(source) : decodeURIComponent(source);
    } catch (error) {
      throw new Error('URL 编码不完整，请检查百分号及其后的十六进制字符。');
    }
  };

  const encodeHtmlEntities = (value, mode = 'special') => {
    let output = '';
    for (const character of String(value ?? '')) {
      if (Object.hasOwn(HTML_SPECIAL_CHARACTERS, character)) {
        output += HTML_SPECIAL_CHARACTERS[character];
      } else if (mode === 'ascii' && character.codePointAt(0) > 0x7f) {
        output += `&#x${character.codePointAt(0).toString(16).toUpperCase()};`;
      } else {
        output += character;
      }
    }
    return output;
  };

  const decodeHtmlFallback = value => String(value ?? '').replace(
    /&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi,
    (match, entity) => {
      if (entity[0] === '#') {
        const hexadecimal = entity[1]?.toLowerCase() === 'x';
        const numericText = entity.slice(hexadecimal ? 2 : 1);
        const codePoint = Number.parseInt(numericText, hexadecimal ? 16 : 10);
        if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
        try {
          return String.fromCodePoint(codePoint);
        } catch (error) {
          return match;
        }
      }
      return HTML_ENTITIES[entity.toLowerCase()] ?? match;
    },
  );

  const decodeHtmlEntities = (value) => {
    const source = String(value ?? '');
    if (typeof document === 'undefined') return decodeHtmlFallback(source);

    const decoder = document.createElement('textarea');
    decoder.innerHTML = source;
    return decoder.value;
  };

  return {
    base64ToUtf8,
    decodeHtmlEntities,
    decodeUrl,
    encodeHtmlEntities,
    encodeUrl,
    normalizeBase64,
    utf8ToBase64,
  };
});
