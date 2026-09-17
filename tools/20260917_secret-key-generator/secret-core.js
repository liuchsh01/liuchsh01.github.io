(() => {
  'use strict';

  const ENCODINGS = Object.freeze({
    BASE64: 'base64',
    BASE64URL: 'base64url',
    HEX: 'hex',
  });

  const MIN_BYTES = 1;
  const MAX_BYTES = 1024;
  const MIN_COUNT = 1;
  const MAX_COUNT = 100;
  const DEFAULT_BYTES = 32;
  const DEFAULT_COUNT = 1;
  const DEFAULT_ENCODING = ENCODINGS.BASE64;

  const bytesToBinary = (bytes) => {
    let binary = '';
    bytes.forEach((value) => {
      binary += String.fromCharCode(value);
    });
    return binary;
  };

  const encodeBase64 = (bytes) => btoa(bytesToBinary(bytes));

  const encodeBase64Url = (bytes) => (
    encodeBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  );

  const encodeHex = (bytes) => (
    [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  );

  const encodeBytes = (bytes, encoding) => {
    if (encoding === ENCODINGS.HEX) return encodeHex(bytes);
    if (encoding === ENCODINGS.BASE64URL) return encodeBase64Url(bytes);
    return encodeBase64(bytes);
  };

  const parsePositiveInteger = (value, field, min, max) => {
    const text = String(value ?? '').trim();
    if (!/^\d+$/.test(text)) {
      throw new Error(`${field}必须是正整数。`);
    }
    const number = Number(text);
    if (number < min || number > max) {
      throw new Error(`${field}需要在 ${min} 到 ${max} 之间。`);
    }
    return number;
  };

  const normalizeOptions = (options = {}) => {
    const encoding = options.encoding || DEFAULT_ENCODING;
    if (!Object.values(ENCODINGS).includes(encoding)) {
      throw new Error('请选择 Base64、Base64URL 或十六进制编码。');
    }

    return {
      byteLength: parsePositiveInteger(options.byteLength, '字节长度', MIN_BYTES, MAX_BYTES),
      count: parsePositiveInteger(options.count, '生成数量', MIN_COUNT, MAX_COUNT),
      encoding,
    };
  };

  const generateSecrets = (options, cryptoSource = globalThis.crypto) => {
    const normalized = normalizeOptions(options);
    if (!cryptoSource?.getRandomValues) {
      throw new Error('当前浏览器不支持安全随机数，无法生成密钥。');
    }

    return Array.from({ length: normalized.count }, () => {
      const bytes = cryptoSource.getRandomValues(new Uint8Array(normalized.byteLength));
      return encodeBytes(bytes, normalized.encoding);
    });
  };

  window.SecretKeyGeneratorCore = {
    DEFAULT_BYTES,
    DEFAULT_COUNT,
    DEFAULT_ENCODING,
    ENCODINGS,
    MAX_BYTES,
    MAX_COUNT,
    MIN_BYTES,
    MIN_COUNT,
    encodeBytes,
    generateSecrets,
    normalizeOptions,
  };
})();
