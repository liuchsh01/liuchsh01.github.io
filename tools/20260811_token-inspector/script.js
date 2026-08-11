(() => {
  'use strict';

  const {
    decryptJwe,
    parseCompactToken,
    validateClaims,
    verifyJwtSignature,
  } = window.TokenInspectorCore;

  const MAX_TOKEN_LENGTH = 2_000_000;
  const tokenInput = document.getElementById('tokenInput');
  const parseButton = document.getElementById('parseToken');
  const clearButton = document.getElementById('clearToken');
  const parseStatus = document.getElementById('parseStatus');
  const tokenType = document.getElementById('tokenType');
  const headerOutput = document.getElementById('headerOutput');
  const payloadOutput = document.getElementById('payloadOutput');
  const payloadState = document.getElementById('payloadState');
  const copyHeader = document.getElementById('copyHeader');
  const copyPayload = document.getElementById('copyPayload');
  const validationSummary = document.getElementById('validationSummary');
  const validationList = document.getElementById('validationList');
  const keyFormat = document.getElementById('keyFormat');
  const keyInput = document.getElementById('keyInput');
  const keyHint = document.getElementById('keyHint');
  const verifyButton = document.getElementById('verifyToken');
  const cryptoStatus = document.getElementById('cryptoStatus');

  let parsedToken = null;
  let headerCopyText = '';
  let payloadCopyText = '';

  const formatValue = (value, rawText = '') => {
    if (value === null || value === undefined) return rawText;
    return typeof value === 'string' && !rawText ? value : JSON.stringify(value, null, 2);
  };

  const setStatus = (element, message, type = '') => {
    element.textContent = message;
    element.className = `status${element === cryptoStatus ? ' crypto-status' : ''}${type ? ` is-${type}` : ''}`;
  };

  const setBadge = (element, message, className = '') => {
    element.textContent = message;
    element.className = `${element.id === 'tokenType' ? 'token-type-badge' : element.id === 'payloadState' ? 'payload-state' : 'validation-summary'}${className ? ` ${className}` : ''}`;
  };

  const renderChecks = (groups) => {
    validationList.replaceChildren();
    groups.forEach(group => {
      if (!group.checks.length) return;
      const title = document.createElement('li');
      title.className = 'validation-group-title';
      title.textContent = group.label;
      validationList.append(title);

      group.checks.forEach(item => {
        const row = document.createElement('li');
        row.className = `validation-item is-${item.status}`;
        const mark = document.createElement('span');
        mark.className = 'check-mark';
        mark.textContent = item.status === 'pass' ? '✓' : item.status === 'error' ? '!' : item.status === 'warning' ? '△' : 'i';
        const message = document.createElement('span');
        message.textContent = item.message;
        row.append(mark, message);
        validationList.append(row);
      });
    });
  };

  const renderValidation = (extraGroups = []) => {
    if (!parsedToken) return;
    const groups = [{ label: '结构检查', checks: parsedToken.structure.checks }];
    if (parsedToken.type === 'JWT') groups.push({ label: 'Payload 声明', checks: parsedToken.claims.checks });
    groups.push(...extraGroups);
    renderChecks(groups);

    const hasError = groups.some(group => group.checks.some(item => item.status === 'error'));
    const hasWarning = groups.some(group => group.checks.some(item => item.status === 'warning'));
    setBadge(
      validationSummary,
      hasError ? '发现问题' : hasWarning ? '通过，含提示' : '检查通过',
      hasError ? 'is-invalid' : hasWarning ? 'is-warning' : 'is-valid',
    );
  };

  const setPayload = (text, stateText, stateClass, copyEnabled = true) => {
    payloadOutput.textContent = text;
    payloadCopyText = copyEnabled ? text : '';
    copyPayload.disabled = !copyEnabled;
    setBadge(payloadState, stateText, stateClass);
  };

  const getEncryptedPayloadSummary = () => formatValue({
    status: 'Payload 已加密，提供密钥后才能查看明文',
    encryptedKeyBytes: parsedToken.encrypted.encryptedKeyLength,
    ivBytes: parsedToken.encrypted.ivLength,
    ciphertextBytes: parsedToken.encrypted.ciphertextLength,
    authenticationTagBytes: parsedToken.encrypted.tagLength,
  });

  const configureCryptoPanel = () => {
    if (!parsedToken) return;
    verifyButton.disabled = false;
    keyFormat.value = 'auto';

    if (parsedToken.type === 'JWE') {
      verifyButton.textContent = '解密 JWE Payload';
      if (parsedToken.algorithm === 'dir') {
        keyInput.placeholder = '输入 Base64URL 对称密钥，或 oct JWK；也可手动选择 UTF-8 文本';
        keyHint.textContent = `${parsedToken.encryption || '当前 enc'} 需要对应长度的内容加密密钥；dir 模式不会包含 Encrypted Key。`;
      } else {
        keyInput.placeholder = '输入 PKCS#8 PEM RSA 私钥，或包含私有参数的 JWK';
        keyHint.textContent = 'RSA-OAEP JWE 解密需要私钥；普通 PUBLIC KEY 无法解密。';
      }
      setStatus(cryptoStatus, 'Payload 仍处于加密状态；输入正确密钥后可尝试解密。');
      return;
    }

    verifyButton.textContent = parsedToken.algorithm === 'none' ? '检查无签名 Token' : '验证 JWT 签名';
    if (String(parsedToken.algorithm).startsWith('HS')) {
      keyInput.placeholder = '输入 HMAC 共享密钥；自动识别时按 UTF-8 文本处理';
      keyHint.textContent = 'HS256/384/512 使用同一个共享密钥生成和验证签名。';
    } else if (parsedToken.algorithm === 'none') {
      keyInput.placeholder = 'alg=none 不需要密钥';
      keyHint.textContent = 'alg=none 只能确认 Token 未签名，不能证明签发者身份或内容完整性。';
    } else {
      keyInput.placeholder = '输入 SPKI PUBLIC KEY PEM，或公开 JWK';
      keyHint.textContent = 'RS/PS/ES 签名验证需要与签发私钥对应的公钥。';
    }
    setStatus(cryptoStatus, '当前仅完成解码；提供密钥并验证成功后，才能确认签名完整性。');
  };

  const resetResults = () => {
    parsedToken = null;
    headerCopyText = '';
    payloadCopyText = '';
    headerOutput.textContent = '解析后显示 Header';
    payloadOutput.textContent = 'JWT Payload 或解密后的 JWE Payload 会显示在这里';
    copyHeader.disabled = true;
    copyPayload.disabled = true;
    verifyButton.disabled = true;
    verifyButton.textContent = '请先解析 Token';
    setBadge(tokenType, '等待解析');
    setBadge(payloadState, '等待解析');
    setBadge(validationSummary, '尚未检查');
    validationList.replaceChildren();
    const placeholder = document.createElement('li');
    placeholder.className = 'validation-placeholder';
    placeholder.textContent = '解析 Token 后显示检查结果。';
    validationList.append(placeholder);
    setStatus(cryptoStatus, '尚未执行密码学校验。');
  };

  const parseInput = () => {
    tokenInput.removeAttribute('aria-invalid');
    const source = tokenInput.value;
    if (source.length > MAX_TOKEN_LENGTH) {
      resetResults();
      tokenInput.setAttribute('aria-invalid', 'true');
      setStatus(parseStatus, 'Token 超过 200 万字符，请确认输入是否正确。', 'error');
      return;
    }

    try {
      parsedToken = parseCompactToken(source);
      headerCopyText = formatValue(parsedToken.header);
      headerOutput.textContent = headerCopyText;
      copyHeader.disabled = false;
      setBadge(tokenType, `${parsedToken.type} · ${parsedToken.algorithm || 'alg 未指定'}`, 'is-detected');

      if (parsedToken.type === 'JWT') {
        const payloadText = parsedToken.payloadIsJson
          ? formatValue(parsedToken.payload)
          : parsedToken.payloadText;
        setPayload(payloadText, parsedToken.payloadIsJson ? '已解码' : '非 JSON', parsedToken.payloadIsJson ? 'is-ready' : 'is-encrypted');
      } else {
        setPayload(getEncryptedPayloadSummary(), '已加密', 'is-encrypted', false);
      }

      renderValidation();
      configureCryptoPanel();
      const isValid = parsedToken.structure.valid && (parsedToken.type === 'JWE' || parsedToken.claims.valid);
      setStatus(
        parseStatus,
        isValid
          ? `${parsedToken.type} 解析完成；密码学真实性尚未确认。`
          : `${parsedToken.type} 已解析，但检查结果中存在需要处理的问题。`,
        isValid ? 'success' : 'error',
      );
    } catch (error) {
      resetResults();
      tokenInput.setAttribute('aria-invalid', 'true');
      setStatus(parseStatus, error.message || 'Token 无法解析，请检查输入。', 'error');
    }
  };

  const runCryptoCheck = async () => {
    if (!parsedToken) return;
    verifyButton.disabled = true;
    const originalText = verifyButton.textContent;
    verifyButton.textContent = parsedToken.type === 'JWT' ? '正在验证…' : '正在解密…';

    try {
      if (parsedToken.type === 'JWT') {
        const result = await verifyJwtSignature(parsedToken.token, keyInput.value, { format: keyFormat.value });
        const cryptoCheck = result.valid
          ? { code: 'signature-valid', message: result.warning || `${result.algorithm} 签名验证成功。`, status: result.warning ? 'warning' : 'pass' }
          : { code: 'signature-invalid', message: `${result.algorithm} 签名验证失败，请检查 Token 和密钥。`, status: 'error' };
        renderValidation([{ label: '密码学校验', checks: [cryptoCheck] }]);
        setStatus(
          cryptoStatus,
          result.valid ? (result.warning || '签名验证成功，Token 内容与密钥匹配。') : '签名验证失败，不能信任这个 Token。',
          result.valid && !result.warning ? 'success' : result.valid ? '' : 'error',
        );
      } else {
        const result = await decryptJwe(parsedToken.token, keyInput.value, { format: keyFormat.value });
        const payloadText = result.payloadIsJson ? formatValue(result.payload) : result.payloadText;
        setPayload(payloadText, '已解密', 'is-ready');
        const extraGroups = [{
          label: '密码学校验',
          checks: [{ code: 'jwe-authenticated', message: 'JWE 解密及 AES-GCM 认证标签校验成功。', status: 'pass' }],
        }];
        if (result.payloadIsJson && result.payload && typeof result.payload === 'object' && !Array.isArray(result.payload)) {
          extraGroups.push({ label: '解密后 Payload 声明', checks: validateClaims(result.payload).checks });
        }
        renderValidation(extraGroups);
        setStatus(cryptoStatus, 'JWE Payload 解密成功，认证标签有效。', 'success');
      }
    } catch (error) {
      const cryptoCheck = { code: 'crypto-failed', message: error.message || '密码学校验失败。', status: 'error' };
      renderValidation([{ label: '密码学校验', checks: [cryptoCheck] }]);
      setStatus(cryptoStatus, cryptoCheck.message, 'error');
    } finally {
      verifyButton.disabled = false;
      verifyButton.textContent = originalText;
    }
  };

  parseButton.addEventListener('click', parseInput);
  verifyButton.addEventListener('click', runCryptoCheck);
  tokenInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      parseInput();
    }
  });
  tokenInput.addEventListener('input', () => {
    tokenInput.removeAttribute('aria-invalid');
    if (parsedToken) {
      resetResults();
      setStatus(parseStatus, 'Token 已修改，请重新解析后再校验。');
    }
  });

  const invalidateCryptoResult = () => {
    if (!parsedToken) return;
    if (parsedToken.type === 'JWE') {
      setPayload(getEncryptedPayloadSummary(), '已加密', 'is-encrypted', false);
    }
    renderValidation();
    setStatus(cryptoStatus, '密钥或格式已修改，请重新执行密码学校验。');
  };
  keyInput.addEventListener('input', invalidateCryptoResult);
  keyFormat.addEventListener('change', invalidateCryptoResult);

  clearButton.addEventListener('click', () => {
    tokenInput.value = '';
    keyInput.value = '';
    tokenInput.removeAttribute('aria-invalid');
    resetResults();
    setStatus(parseStatus, '输入、密钥和解析结果已清空。');
    tokenInput.focus();
  });

  copyHeader.addEventListener('click', () => {
    if (headerCopyText) window.Toolbox.copyText(headerCopyText, 'Header 已复制');
  });
  copyPayload.addEventListener('click', () => {
    if (payloadCopyText) window.Toolbox.copyText(payloadCopyText, 'Payload 已复制');
  });

  resetResults();
})();
