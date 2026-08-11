((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.TokenInspectorCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const textEncoder = new TextEncoder();
  const strictTextDecoder = new TextDecoder('utf-8', { fatal: true });
  const JWT_ALGORITHMS = Object.freeze({
    HS256: { family: 'hmac', hash: 'SHA-256' },
    HS384: { family: 'hmac', hash: 'SHA-384' },
    HS512: { family: 'hmac', hash: 'SHA-512' },
    RS256: { family: 'rsa', hash: 'SHA-256', name: 'RSASSA-PKCS1-v1_5' },
    RS384: { family: 'rsa', hash: 'SHA-384', name: 'RSASSA-PKCS1-v1_5' },
    RS512: { family: 'rsa', hash: 'SHA-512', name: 'RSASSA-PKCS1-v1_5' },
    PS256: { family: 'pss', hash: 'SHA-256', name: 'RSA-PSS', saltLength: 32 },
    PS384: { family: 'pss', hash: 'SHA-384', name: 'RSA-PSS', saltLength: 48 },
    PS512: { family: 'pss', hash: 'SHA-512', name: 'RSA-PSS', saltLength: 64 },
    ES256: { family: 'ec', hash: 'SHA-256', namedCurve: 'P-256' },
    ES384: { family: 'ec', hash: 'SHA-384', namedCurve: 'P-384' },
    ES512: { family: 'ec', hash: 'SHA-512', namedCurve: 'P-521' },
  });
  const JWE_ENCRYPTIONS = Object.freeze({
    A128GCM: { keyBytes: 16 },
    A192GCM: { keyBytes: 24 },
    A256GCM: { keyBytes: 32 },
  });

  const check = (status, code, message) => ({ code, message, status });
  const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  const getSubtle = () => {
    if (!globalThis.crypto?.subtle) {
      throw new Error('当前浏览器不支持 Web Crypto，无法执行签名验证或 JWE 解密。');
    }
    return globalThis.crypto.subtle;
  };

  const bytesToBase64 = (bytes) => {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  };

  const base64ToBytes = (base64, label = '内容') => {
    try {
      const binary = atob(base64);
      return Uint8Array.from(binary, character => character.charCodeAt(0));
    } catch (error) {
      throw new Error(`${label} 不是有效的 Base64 编码。`);
    }
  };

  const decodeBase64Url = (segment, label = '内容', allowEmpty = false) => {
    const source = String(segment ?? '');
    if (!source && allowEmpty) return new Uint8Array();
    if (!source || !/^[A-Za-z0-9_-]+$/.test(source) || source.length % 4 === 1) {
      throw new Error(`${label} 不是有效的 Base64URL 编码。`);
    }
    const padding = '='.repeat((4 - (source.length % 4)) % 4);
    return base64ToBytes(source.replace(/-/g, '+').replace(/_/g, '/') + padding, label);
  };

  const encodeBase64Url = (bytes) => bytesToBase64(bytes)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const decodeUtf8 = (bytes, label) => {
    try {
      return strictTextDecoder.decode(bytes);
    } catch (error) {
      throw new Error(`${label} 不是有效的 UTF-8 文本。`);
    }
  };

  const parseJsonSegment = (segment, label) => {
    const text = decodeUtf8(decodeBase64Url(segment, label), label);
    try {
      return { text, value: JSON.parse(text) };
    } catch (error) {
      throw new Error(`${label} 不是有效的 JSON。`);
    }
  };

  const parsePayloadSegment = (segment) => {
    const text = decodeUtf8(decodeBase64Url(segment, 'Payload'), 'Payload');
    try {
      return { isJson: true, text, value: JSON.parse(text) };
    } catch (error) {
      return { isJson: false, text, value: null };
    }
  };

  const validateClaims = (payload, options = {}) => {
    const checks = [];
    if (!isPlainObject(payload)) {
      return {
        checks: [check('error', 'claims-not-object', 'JWT Payload 不是 JSON 对象，无法校验注册声明。')],
        valid: false,
      };
    }

    const now = Number(options.nowSeconds ?? Date.now() / 1000);
    const tolerance = Math.max(0, Number(options.clockToleranceSeconds || 0));
    const validateNumericDate = (name) => {
      if (!(name in payload)) return null;
      if (typeof payload[name] !== 'number' || !Number.isFinite(payload[name])) {
        checks.push(check('error', `${name}-type`, `${name} 必须是以秒表示的数字时间。`));
        return null;
      }
      return payload[name];
    };

    const exp = validateNumericDate('exp');
    const nbf = validateNumericDate('nbf');
    const iat = validateNumericDate('iat');

    if (exp !== null) {
      checks.push(now - tolerance >= exp
        ? check('error', 'expired', 'Token 已超过 exp 指定的过期时间。')
        : check('pass', 'exp-valid', 'Token 尚未过期。'));
    }
    if (nbf !== null) {
      checks.push(now + tolerance < nbf
        ? check('error', 'not-active', 'Token 尚未到 nbf 指定的生效时间。')
        : check('pass', 'nbf-valid', 'Token 已达到 nbf 指定的生效时间。'));
    }
    if (iat !== null) {
      checks.push(iat > now + tolerance
        ? check('warning', 'issued-in-future', 'iat 晚于当前时间，请检查签发端时钟。')
        : check('pass', 'iat-valid', 'iat 不晚于当前时间。'));
    }
    if (exp === null && nbf === null && iat === null && checks.length === 0) {
      checks.push(check('info', 'no-time-claims', 'Payload 未包含 exp、nbf 或 iat 时间声明。'));
    }

    if ('iss' in payload && typeof payload.iss !== 'string') {
      checks.push(check('error', 'iss-type', 'iss 声明必须是字符串。'));
    }
    if ('sub' in payload && typeof payload.sub !== 'string') {
      checks.push(check('error', 'sub-type', 'sub 声明必须是字符串。'));
    }
    if ('aud' in payload) {
      const validAudience = typeof payload.aud === 'string'
        || (Array.isArray(payload.aud) && payload.aud.every(item => typeof item === 'string'));
      if (!validAudience) checks.push(check('error', 'aud-type', 'aud 声明必须是字符串或字符串数组。'));
    }

    return { checks, valid: !checks.some(item => item.status === 'error') };
  };

  const parseJwt = (token, segments, options, normalizedWhitespace) => {
    const parsedHeader = parseJsonSegment(segments[0], 'Header');
    if (!isPlainObject(parsedHeader.value)) throw new Error('Header 必须是 JSON 对象。');
    const parsedPayload = parsePayloadSegment(segments[1]);
    const signature = decodeBase64Url(segments[2], 'Signature', true);
    const checks = [];
    const algorithm = parsedHeader.value.alg;

    if (normalizedWhitespace) checks.push(check('warning', 'whitespace-removed', '已移除 Token 中的空白字符。'));
    if (typeof algorithm !== 'string' || !algorithm) {
      checks.push(check('error', 'missing-alg', 'Header 缺少有效的 alg 字段。'));
    } else if (algorithm === 'none') {
      checks.push(signature.length === 0
        ? check('warning', 'unsigned', 'alg 为 none，Token 没有密码学签名。')
        : check('error', 'none-with-signature', 'alg 为 none 时签名段必须为空。'));
    } else {
      checks.push(signature.length > 0
        ? check('pass', 'signature-present', '签名段存在；是否可信仍需提供密钥验证。')
        : check('error', 'signature-missing', 'Header 指定了签名算法，但签名段为空。'));
      if (!JWT_ALGORITHMS[algorithm]) {
        checks.push(check('warning', 'unsupported-alg', `当前工具不支持验证 ${algorithm}。`));
      }
    }

    if (!parsedPayload.isJson) {
      checks.push(check('error', 'payload-not-json', 'Payload 不是有效的 JSON；它可能是普通 JWS 载荷而非 JWT。'));
    }

    const structure = { checks, valid: !checks.some(item => item.status === 'error') };
    const claims = parsedPayload.isJson
      ? validateClaims(parsedPayload.value, options)
      : { checks: [], valid: false };

    return {
      algorithm,
      claims,
      header: parsedHeader.value,
      headerText: parsedHeader.text,
      normalizedWhitespace,
      payload: parsedPayload.value,
      payloadIsJson: parsedPayload.isJson,
      payloadText: parsedPayload.text,
      segments,
      signatureLength: signature.length,
      structure,
      token,
      type: 'JWT',
    };
  };

  const parseJwe = (token, segments, normalizedWhitespace) => {
    const parsedHeader = parseJsonSegment(segments[0], 'Header');
    if (!isPlainObject(parsedHeader.value)) throw new Error('Header 必须是 JSON 对象。');
    const encryptedKey = decodeBase64Url(segments[1], 'Encrypted Key', true);
    const iv = decodeBase64Url(segments[2], 'IV');
    const ciphertext = decodeBase64Url(segments[3], 'Ciphertext');
    const tag = decodeBase64Url(segments[4], 'Authentication Tag');
    const algorithm = parsedHeader.value.alg;
    const encryption = parsedHeader.value.enc;
    const checks = [];

    if (normalizedWhitespace) checks.push(check('warning', 'whitespace-removed', '已移除 Token 中的空白字符。'));
    if (typeof algorithm !== 'string' || !algorithm) checks.push(check('error', 'missing-alg', 'Header 缺少有效的 alg 字段。'));
    if (typeof encryption !== 'string' || !encryption) checks.push(check('error', 'missing-enc', 'JWE Header 缺少有效的 enc 字段。'));

    if (algorithm === 'dir') {
      checks.push(encryptedKey.length === 0
        ? check('pass', 'direct-key', 'dir 模式的 Encrypted Key 段为空。')
        : check('error', 'dir-encrypted-key', 'dir 模式的 Encrypted Key 段必须为空。'));
    } else if (typeof algorithm === 'string' && encryptedKey.length === 0) {
      checks.push(check('error', 'encrypted-key-missing', `${algorithm} 模式需要非空的 Encrypted Key 段。`));
    }

    if (!['dir', 'RSA-OAEP', 'RSA-OAEP-256'].includes(algorithm)) {
      checks.push(check('warning', 'unsupported-alg', `当前工具不支持使用 ${algorithm} 解密。`));
    }
    if (!JWE_ENCRYPTIONS[encryption]) {
      checks.push(check('warning', 'unsupported-enc', `当前工具不支持使用 ${encryption} 解密。`));
    } else {
      if (iv.length !== 12) checks.push(check('error', 'iv-length', 'AES-GCM 的 IV 应为 12 字节。'));
      if (tag.length !== 16) checks.push(check('error', 'tag-length', 'AES-GCM 的认证标签应为 16 字节。'));
    }
    if (ciphertext.length === 0) checks.push(check('error', 'ciphertext-empty', 'Ciphertext 段不能为空。'));
    if (parsedHeader.value.zip) checks.push(check('warning', 'compression', `Payload 使用 ${parsedHeader.value.zip} 压缩，当前工具不支持解压。`));

    return {
      algorithm,
      encryption,
      encrypted: {
        ciphertextLength: ciphertext.length,
        encryptedKeyLength: encryptedKey.length,
        ivLength: iv.length,
        tagLength: tag.length,
      },
      header: parsedHeader.value,
      headerText: parsedHeader.text,
      normalizedWhitespace,
      payload: null,
      payloadIsJson: false,
      payloadText: '',
      segments,
      structure: { checks, valid: !checks.some(item => item.status === 'error') },
      token,
      type: 'JWE',
    };
  };

  const parseCompactToken = (value, options = {}) => {
    const raw = String(value || '').trim();
    if (!raw) throw new Error('请输入 JWT 或 JWE Token。');
    const token = raw.replace(/\s+/g, '');
    const normalizedWhitespace = token !== raw;
    const segments = token.split('.');
    if (segments.length === 3) return parseJwt(token, segments, options, normalizedWhitespace);
    if (segments.length === 5) return parseJwe(token, segments, normalizedWhitespace);
    throw new Error('Compact Token 应为 3 段或 5 段（JWT/JWS 为 3 段，JWE 为 5 段）。');
  };

  const parseJwk = (source) => {
    try {
      const jwk = JSON.parse(source);
      if (!isPlainObject(jwk) || typeof jwk.kty !== 'string') throw new Error();
      const sanitized = { ...jwk };
      delete sanitized.alg;
      delete sanitized.key_ops;
      delete sanitized.use;
      return sanitized;
    } catch (error) {
      throw new Error('JWK 必须是包含 kty 字段的有效 JSON 对象。');
    }
  };

  const pemToBytes = (source, requiredLabel) => {
    const match = String(source).trim().match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]+?)-----END \1-----/);
    if (!match) throw new Error('PEM 密钥缺少完整的 BEGIN/END 标记。');
    if (requiredLabel && match[1] !== requiredLabel) {
      throw new Error(`请提供 ${requiredLabel} 格式的 PEM 密钥。`);
    }
    return base64ToBytes(match[2].replace(/\s+/g, ''), 'PEM 密钥');
  };

  const resolveKeyFormat = (input, requestedFormat, context) => {
    if (requestedFormat && requestedFormat !== 'auto') return requestedFormat;
    const source = String(input || '').trim();
    if (source.startsWith('{')) return 'jwk';
    if (source.includes('-----BEGIN')) return 'pem';
    return context === 'jwt-hmac' ? 'utf8' : 'base64url';
  };

  const getRawKeyBytes = (input, format, context) => {
    const source = String(input || '').trim();
    if (!source) throw new Error('请输入用于校验或解密的密钥。');
    const resolved = resolveKeyFormat(source, format, context);
    if (resolved === 'utf8') return textEncoder.encode(source);
    if (resolved === 'base64url') return decodeBase64Url(source.replace(/\s+/g, ''), '密钥');
    if (resolved === 'jwk') {
      const jwk = parseJwk(source);
      if (jwk.kty !== 'oct' || typeof jwk.k !== 'string') throw new Error('对称 JWK 必须使用 kty=oct 并包含 k。');
      return decodeBase64Url(jwk.k, 'JWK k');
    }
    throw new Error('当前算法需要 UTF-8、Base64URL 或 oct JWK 对称密钥。');
  };

  const importAsymmetricKey = async (input, format, algorithm, usage, privateKey = false) => {
    const source = String(input || '').trim();
    if (!source) throw new Error('请输入用于校验或解密的密钥。');
    const resolved = resolveKeyFormat(source, format, privateKey ? 'jwe-rsa' : 'jwt-asymmetric');
    const subtle = getSubtle();

    try {
      if (resolved === 'jwk') {
        return await subtle.importKey('jwk', parseJwk(source), algorithm, false, [usage]);
      }
      if (resolved === 'pem') {
        const label = privateKey ? 'PRIVATE KEY' : 'PUBLIC KEY';
        const bytes = pemToBytes(source, label);
        return await subtle.importKey(privateKey ? 'pkcs8' : 'spki', bytes, algorithm, false, [usage]);
      }
    } catch (error) {
      if (error instanceof Error && /请提供|PEM|JWK/.test(error.message)) throw error;
      throw new Error(`密钥导入失败：${error.message || '请检查密钥格式和算法是否匹配。'}`);
    }
    throw new Error(privateKey ? 'RSA JWE 解密需要 PKCS#8 PEM 私钥或私有 JWK。' : '该签名算法需要 SPKI PEM 公钥或公开 JWK。');
  };

  const verifyJwtSignature = async (tokenValue, keyInput, options = {}) => {
    const parsed = parseCompactToken(tokenValue, options);
    if (parsed.type !== 'JWT') throw new Error('只有 3 段 JWT/JWS 可以执行签名验证。');
    const algorithmName = parsed.header.alg;
    if (algorithmName === 'none') {
      return { algorithm: 'none', valid: parsed.signatureLength === 0, warning: 'alg=none 不提供身份真实性保证。' };
    }
    const config = JWT_ALGORITHMS[algorithmName];
    if (!config) throw new Error(`当前浏览器工具不支持验证 ${algorithmName || '未指定算法'}。`);
    const subtle = getSubtle();
    const signingInput = textEncoder.encode(`${parsed.segments[0]}.${parsed.segments[1]}`);
    const signature = decodeBase64Url(parsed.segments[2], 'Signature');
    let key;
    let verifyAlgorithm;

    if (config.family === 'hmac') {
      const bytes = getRawKeyBytes(keyInput, options.format, 'jwt-hmac');
      key = await subtle.importKey('raw', bytes, { name: 'HMAC', hash: config.hash }, false, ['verify']);
      verifyAlgorithm = { name: 'HMAC' };
    } else if (config.family === 'ec') {
      key = await importAsymmetricKey(
        keyInput,
        options.format,
        { name: 'ECDSA', namedCurve: config.namedCurve },
        'verify',
      );
      verifyAlgorithm = { name: 'ECDSA', hash: config.hash };
    } else {
      const importAlgorithm = { name: config.name, hash: config.hash };
      key = await importAsymmetricKey(keyInput, options.format, importAlgorithm, 'verify');
      verifyAlgorithm = config.family === 'pss'
        ? { name: 'RSA-PSS', saltLength: config.saltLength }
        : { name: 'RSASSA-PKCS1-v1_5' };
    }

    const valid = await subtle.verify(verifyAlgorithm, key, signature, signingInput);
    return { algorithm: algorithmName, valid };
  };

  const concatBytes = (...arrays) => {
    const length = arrays.reduce((total, item) => total + item.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    arrays.forEach(item => {
      result.set(item, offset);
      offset += item.length;
    });
    return result;
  };

  const decryptJwe = async (tokenValue, keyInput, options = {}) => {
    const parsed = parseCompactToken(tokenValue, options);
    if (parsed.type !== 'JWE') throw new Error('只有 5 段 Compact JWE 可以执行解密。');
    if (!parsed.structure.valid) throw new Error('JWE 结构校验未通过，请先修正 Token。');
    if (parsed.header.zip) throw new Error(`当前工具暂不支持解压 ${parsed.header.zip} Payload。`);

    const encryptionConfig = JWE_ENCRYPTIONS[parsed.header.enc];
    if (!encryptionConfig) throw new Error(`当前工具不支持 ${parsed.header.enc || '未指定的 enc'} 内容加密算法。`);
    if (!['dir', 'RSA-OAEP', 'RSA-OAEP-256'].includes(parsed.header.alg)) {
      throw new Error(`当前工具不支持 ${parsed.header.alg || '未指定的 alg'} 密钥管理算法。`);
    }

    const subtle = getSubtle();
    let contentKeyBytes;
    if (parsed.header.alg === 'dir') {
      contentKeyBytes = getRawKeyBytes(keyInput, options.format, 'jwe-direct');
    } else {
      const hash = parsed.header.alg === 'RSA-OAEP-256' ? 'SHA-256' : 'SHA-1';
      const privateKey = await importAsymmetricKey(
        keyInput,
        options.format,
        { name: 'RSA-OAEP', hash },
        'decrypt',
        true,
      );
      try {
        const decryptedKey = await subtle.decrypt(
          { name: 'RSA-OAEP' },
          privateKey,
          decodeBase64Url(parsed.segments[1], 'Encrypted Key'),
        );
        contentKeyBytes = new Uint8Array(decryptedKey);
      } catch (error) {
        throw new Error('JWE Encrypted Key 解密失败，请检查 RSA 私钥和 alg。');
      }
    }

    if (contentKeyBytes.length !== encryptionConfig.keyBytes) {
      throw new Error(`${parsed.header.enc} 需要 ${encryptionConfig.keyBytes} 字节的内容加密密钥。`);
    }

    const aesKey = await subtle.importKey('raw', contentKeyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
    const ciphertext = decodeBase64Url(parsed.segments[3], 'Ciphertext');
    const tag = decodeBase64Url(parsed.segments[4], 'Authentication Tag');
    let plaintextBytes;
    try {
      const plaintext = await subtle.decrypt(
        {
          additionalData: textEncoder.encode(parsed.segments[0]),
          iv: decodeBase64Url(parsed.segments[2], 'IV'),
          name: 'AES-GCM',
          tagLength: tag.length * 8,
        },
        aesKey,
        concatBytes(ciphertext, tag),
      );
      plaintextBytes = new Uint8Array(plaintext);
    } catch (error) {
      throw new Error('JWE Payload 解密失败，请检查密钥、alg、enc 和认证标签。');
    }

    const payloadText = decodeUtf8(plaintextBytes, '解密后的 Payload');
    let payload = null;
    let payloadIsJson = false;
    try {
      payload = JSON.parse(payloadText);
      payloadIsJson = true;
    } catch (error) {
      payload = payloadText;
    }
    return { payload, payloadIsJson, payloadText };
  };

  return {
    decodeBase64Url,
    decryptJwe,
    encodeBase64Url,
    parseCompactToken,
    validateClaims,
    verifyJwtSignature,
  };
});
