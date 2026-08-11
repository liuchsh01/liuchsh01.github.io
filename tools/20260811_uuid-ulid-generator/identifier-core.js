((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.IdentifierGeneratorCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, (root) => {
  'use strict';

  const IDENTIFIER_TYPES = Object.freeze({
    UUID_V4: 'uuid-v4',
    UUID_V7: 'uuid-v7',
    ULID: 'ulid',
  });
  const LETTER_CASES = Object.freeze({
    STANDARD: 'standard',
    UPPER: 'upper',
    LOWER: 'lower',
  });
  const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const MAX_COUNT = 500;
  const MAX_TIMESTAMP = 0xffffffffffff;

  const parseCount = (value) => {
    const text = String(value ?? '').trim();
    if (!/^\d+$/.test(text)) {
      throw new Error(`生成数量必须是 1–${MAX_COUNT} 的整数。`);
    }

    const count = Number(text);
    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_COUNT) {
      throw new Error(`生成数量必须是 1–${MAX_COUNT} 的整数。`);
    }
    return count;
  };

  const normalizeOptions = (options = {}) => {
    const type = Object.values(IDENTIFIER_TYPES).includes(options.type)
      ? options.type
      : IDENTIFIER_TYPES.UUID_V4;
    const letterCase = Object.values(LETTER_CASES).includes(options.letterCase)
      ? options.letterCase
      : LETTER_CASES.STANDARD;

    return {
      count: parseCount(options.count ?? 5),
      hyphens: type === IDENTIFIER_TYPES.ULID ? false : options.hyphens !== false,
      letterCase,
      type,
    };
  };

  const secureRandomBytes = (length, cryptoProvider = root.crypto) => {
    if (!Number.isInteger(length) || length < 1) {
      throw new RangeError('随机字节长度无效。');
    }
    if (!cryptoProvider?.getRandomValues) {
      throw new Error('当前浏览器不支持安全随机数，无法生成标识符。');
    }

    const bytes = new Uint8Array(length);
    cryptoProvider.getRandomValues(bytes);
    return bytes;
  };

  const normalizeTimestamp = (value) => {
    const timestamp = Number(value);
    if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > MAX_TIMESTAMP) {
      throw new RangeError('时间戳超出标识符可表示的范围。');
    }
    return timestamp;
  };

  const writeTimestamp = (bytes, timestampValue) => {
    let timestamp = BigInt(normalizeTimestamp(timestampValue));
    for (let index = 5; index >= 0; index -= 1) {
      bytes[index] = Number(timestamp & 0xffn);
      timestamp >>= 8n;
    }
    return bytes;
  };

  const formatUuid = (bytes) => {
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };

  const generateUuidV4 = (cryptoProvider = root.crypto) => {
    const bytes = secureRandomBytes(16, cryptoProvider);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return formatUuid(bytes);
  };

  const generateUuidV7 = (cryptoProvider = root.crypto, timestamp = Date.now()) => {
    const bytes = new Uint8Array(16);
    const random = secureRandomBytes(10, cryptoProvider);
    writeTimestamp(bytes, timestamp);
    bytes[6] = 0x70 | (random[0] & 0x0f);
    bytes[7] = random[1];
    bytes[8] = 0x80 | (random[2] & 0x3f);
    bytes.set(random.slice(3), 9);
    return formatUuid(bytes);
  };

  const encodeUlidBytes = (bytes) => {
    let value = 0n;
    bytes.forEach(byte => {
      value = (value << 8n) | BigInt(byte);
    });

    let encoded = '';
    for (let index = 0; index < 26; index += 1) {
      encoded = CROCKFORD_BASE32[Number(value & 0x1fn)] + encoded;
      value >>= 5n;
    }
    return encoded;
  };

  const generateUlid = (cryptoProvider = root.crypto, timestamp = Date.now()) => {
    const bytes = new Uint8Array(16);
    writeTimestamp(bytes, timestamp);
    bytes.set(secureRandomBytes(10, cryptoProvider), 6);
    return encodeUlidBytes(bytes);
  };

  const applyFormatting = (identifier, options) => {
    let formatted = identifier;
    if (!options.hyphens && options.type !== IDENTIFIER_TYPES.ULID) {
      formatted = formatted.replaceAll('-', '');
    }

    if (options.letterCase === LETTER_CASES.UPPER) {
      return formatted.toUpperCase();
    }
    if (options.letterCase === LETTER_CASES.LOWER) {
      return formatted.toLowerCase();
    }
    return formatted;
  };

  const generateIdentifier = (options = {}, cryptoProvider = root.crypto, timestamp = Date.now()) => {
    const normalized = normalizeOptions({ ...options, count: 1 });
    let identifier;

    if (normalized.type === IDENTIFIER_TYPES.UUID_V7) {
      identifier = generateUuidV7(cryptoProvider, timestamp);
    } else if (normalized.type === IDENTIFIER_TYPES.ULID) {
      identifier = generateUlid(cryptoProvider, timestamp);
    } else {
      identifier = generateUuidV4(cryptoProvider);
    }

    return applyFormatting(identifier, normalized);
  };

  const generateIdentifiers = (
    options = {},
    cryptoProvider = root.crypto,
    nowProvider = () => Date.now(),
  ) => {
    const normalized = normalizeOptions(options);
    return Array.from({ length: normalized.count }, () => {
      const timestamp = normalized.type === IDENTIFIER_TYPES.UUID_V4
        ? 0
        : normalizeTimestamp(nowProvider());
      let identifier;

      if (normalized.type === IDENTIFIER_TYPES.UUID_V7) {
        identifier = generateUuidV7(cryptoProvider, timestamp);
      } else if (normalized.type === IDENTIFIER_TYPES.ULID) {
        identifier = generateUlid(cryptoProvider, timestamp);
      } else {
        identifier = generateUuidV4(cryptoProvider);
      }

      return applyFormatting(identifier, normalized);
    });
  };

  return {
    CROCKFORD_BASE32,
    IDENTIFIER_TYPES,
    LETTER_CASES,
    MAX_COUNT,
    generateIdentifier,
    generateIdentifiers,
    generateUlid,
    generateUuidV4,
    generateUuidV7,
    normalizeOptions,
    secureRandomBytes,
  };
});
