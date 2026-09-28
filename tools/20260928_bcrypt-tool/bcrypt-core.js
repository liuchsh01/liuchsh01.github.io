((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.BcryptToolCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const MAX_PASSWORD_BYTES = 72;
  const MIN_COST = 4;
  const MAX_COST = 16;
  const MAX_BCRYPT_COST = 31;
  const BCRYPT_HASH_PATTERN = /^\$(2[aby])\$(\d{2})\$[./A-Za-z0-9]{53}$/;

  const requireText = (value, label) => {
    if (typeof value !== 'string') {
      throw new Error(`${label}必须是文本。`);
    }
    return value;
  };

  const assertNoLoneSurrogates = (text) => {
    for (let index = 0; index < text.length; index += 1) {
      const codeUnit = text.charCodeAt(index);
      if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
        const next = text.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) {
          throw new Error('密码包含无法编码的孤立代理项，请重新输入。');
        }
        index += 1;
      } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
        throw new Error('密码包含无法编码的孤立代理项，请重新输入。');
      }
    }
  };

  const utf8ByteLength = (text) => {
    if (typeof TextEncoder === 'function') {
      return new TextEncoder().encode(text).length;
    }

    let length = 0;
    for (let index = 0; index < text.length; index += 1) {
      const codeUnit = text.charCodeAt(index);
      if (codeUnit <= 0x7f) {
        length += 1;
      } else if (codeUnit <= 0x7ff) {
        length += 2;
      } else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
        length += 4;
        index += 1;
      } else {
        length += 3;
      }
    }
    return length;
  };

  const validatePassword = (password) => {
    const text = requireText(password, '密码');
    if (text.length === 0) {
      throw new Error('请输入密码；空密码不能生成或验证 Bcrypt Hash。');
    }
    assertNoLoneSurrogates(text);
    const byteLength = utf8ByteLength(text);
    if (byteLength > MAX_PASSWORD_BYTES) {
      throw new Error(`密码为 ${byteLength} 个 UTF-8 字节，Bcrypt 最多支持 ${MAX_PASSWORD_BYTES} 个字节。`);
    }
    return byteLength;
  };

  const validateCost = (cost) => {
    const message = `计算成本（cost）必须是 ${MIN_COST} 到 ${MAX_COST} 之间的整数。`;
    if (typeof cost !== 'number' && typeof cost !== 'string') {
      throw new Error(message);
    }
    if (typeof cost === 'string' && !cost.trim()) {
      throw new Error(message);
    }
    const value = Number(cost);
    if (!Number.isInteger(value) || value < MIN_COST || value > MAX_COST) {
      throw new Error(message);
    }
    return value;
  };

  const parseHash = (hash) => {
    const value = requireText(hash, 'Bcrypt Hash');
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error('请输入需要验证的 Bcrypt Hash。');
    }

    const match = BCRYPT_HASH_PATTERN.exec(trimmed);
    if (!match) {
      throw new Error('Bcrypt Hash 格式无效：应为完整的 60 位 $2a$、$2b$ 或 $2y$ Hash。');
    }

    const cost = Number(match[2]);
    if (cost < MIN_COST || cost > MAX_BCRYPT_COST) {
      throw new Error('Bcrypt Hash 的 cost 必须在 04 到 31 之间。');
    }
    if (cost > MAX_COST) {
      throw new Error(`此工具最多支持 cost ${MAX_COST}；该 Hash 的 cost 为 ${cost}。`);
    }

    return {
      hash: trimmed,
      cost,
      version: match[1],
    };
  };

  return {
    BCRYPT_HASH_PATTERN,
    MAX_BCRYPT_COST,
    MAX_COST,
    MAX_PASSWORD_BYTES,
    MIN_COST,
    assertNoLoneSurrogates,
    parseHash,
    utf8ByteLength,
    validateCost,
    validatePassword,
  };
});
