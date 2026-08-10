((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.HashToolCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, (root) => {
  'use strict';

  const MD5_SHIFTS = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const MD5_CONSTANTS = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];

  const textEncoder = new TextEncoder();

  const toUint8Array = (value) => {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    throw new TypeError('Hash 输入必须是字节数组。');
  };

  const textToBytes = (text) => textEncoder.encode(String(text));

  const bytesToHex = (value) => {
    const bytes = toUint8Array(value);
    let output = '';
    for (const byte of bytes) {
      output += byte.toString(16).padStart(2, '0');
    }
    return output;
  };

  const rotateLeft = (value, count) => ((value << count) | (value >>> (32 - count))) >>> 0;

  const wordToLittleEndianHex = (word) => {
    let output = '';
    for (let index = 0; index < 4; index += 1) {
      output += ((word >>> (index * 8)) & 0xff).toString(16).padStart(2, '0');
    }
    return output;
  };

  const md5Hex = (value) => {
    const bytes = toUint8Array(value);
    const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;

    const bitLength = BigInt(bytes.length) * 8n;
    const paddedView = new DataView(padded.buffer);
    paddedView.setUint32(paddedLength - 8, Number(bitLength & 0xffffffffn), true);
    paddedView.setUint32(paddedLength - 4, Number((bitLength >> 32n) & 0xffffffffn), true);

    let hashA = 0x67452301;
    let hashB = 0xefcdab89;
    let hashC = 0x98badcfe;
    let hashD = 0x10325476;

    for (let offset = 0; offset < paddedLength; offset += 64) {
      const words = new Uint32Array(16);
      for (let index = 0; index < 16; index += 1) {
        words[index] = paddedView.getUint32(offset + (index * 4), true);
      }

      let a = hashA;
      let b = hashB;
      let c = hashC;
      let d = hashD;

      for (let index = 0; index < 64; index += 1) {
        let mixed;
        let wordIndex;

        if (index < 16) {
          mixed = (b & c) | (~b & d);
          wordIndex = index;
        } else if (index < 32) {
          mixed = (d & b) | (~d & c);
          wordIndex = ((5 * index) + 1) % 16;
        } else if (index < 48) {
          mixed = b ^ c ^ d;
          wordIndex = ((3 * index) + 5) % 16;
        } else {
          mixed = c ^ (b | ~d);
          wordIndex = (7 * index) % 16;
        }

        const nextD = c;
        const nextC = b;
        const combined = (a + mixed + MD5_CONSTANTS[index] + words[wordIndex]) >>> 0;
        const nextB = (b + rotateLeft(combined, MD5_SHIFTS[index])) >>> 0;
        a = d;
        b = nextB;
        c = nextC;
        d = nextD;
      }

      hashA = (hashA + a) >>> 0;
      hashB = (hashB + b) >>> 0;
      hashC = (hashC + c) >>> 0;
      hashD = (hashD + d) >>> 0;
    }

    return [hashA, hashB, hashC, hashD].map(wordToLittleEndianHex).join('');
  };

  const digestBytes = async (algorithm, value) => {
    const normalizedAlgorithm = String(algorithm).toUpperCase();
    const bytes = toUint8Array(value);

    if (normalizedAlgorithm === 'MD5') {
      return md5Hex(bytes);
    }

    if (!['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].includes(normalizedAlgorithm)) {
      throw new Error(`不支持的 Hash 算法：${algorithm}`);
    }

    const subtle = root.crypto && root.crypto.subtle;
    if (!subtle) {
      throw new Error('当前浏览器环境不支持 Web Crypto，无法计算 SHA Hash。');
    }

    const digest = await subtle.digest(normalizedAlgorithm, bytes);
    return bytesToHex(new Uint8Array(digest));
  };

  const javaStringHashCode = (text) => {
    const value = String(text);
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash * 31) + value.charCodeAt(index)) | 0;
    }
    return hash;
  };

  const splitTextLines = (text) => {
    if (text === '') return [];
    const lines = String(text).split(/\r\n|\r|\n/);
    if (lines.length > 1 && lines.at(-1) === '') {
      lines.pop();
    }
    return lines;
  };

  return {
    bytesToHex,
    digestBytes,
    javaStringHashCode,
    md5Hex,
    splitTextLines,
    textToBytes,
  };
});
