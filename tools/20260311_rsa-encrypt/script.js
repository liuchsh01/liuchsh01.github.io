(() => {
  const rsaForm = document.getElementById('rsaForm');
  const publicKey = document.getElementById('publicKey');
  const plainText = document.getElementById('plainText');
  const cipherText = document.getElementById('cipherText');
  const formStatus = document.getElementById('formStatus');
  const encryptButton = document.getElementById('encryptButton');
  const copyResult = document.getElementById('copyResult');

  const formatPublicKey = (key) => {
    const trimmedKey = key.trim();
    if (trimmedKey.includes('-----BEGIN')) return trimmedKey;

    const keyChunks = trimmedKey.replace(/\s+/g, '').match(/.{1,64}/g);
    if (!keyChunks) return trimmedKey;
    return `-----BEGIN PUBLIC KEY-----\n${keyChunks.join('\n')}\n-----END PUBLIC KEY-----`;
  };

  const showStatus = (message, type = 'error') => {
    formStatus.textContent = message;
    formStatus.classList.toggle('success', type === 'success');
    formStatus.hidden = false;
  };

  const clearStatus = () => {
    formStatus.textContent = '';
    formStatus.classList.remove('success');
    formStatus.hidden = true;
  };

  const invalidateResult = () => {
    clearStatus();
    cipherText.value = '';
    copyResult.disabled = true;
  };

  const encrypt = () => {
    invalidateResult();

    if (!publicKey.value.trim()) {
      showStatus('请输入 RSA 公钥；支持纯 Base64 或 PEM 格式。');
      publicKey.focus();
      return;
    }

    if (!plainText.value) {
      showStatus('请输入需要加密的明文。');
      plainText.focus();
      return;
    }

    if (typeof window.JSEncrypt !== 'function') {
      showStatus('加密库未能加载，请检查网络连接后刷新页面。');
      return;
    }

    try {
      const encryptor = new window.JSEncrypt();
      encryptor.setPublicKey(formatPublicKey(publicKey.value));
      const result = encryptor.encrypt(plainText.value);

      if (!result) {
        showStatus('加密失败。请检查公钥格式，并确认明文没有超过当前密钥允许的长度。');
        return;
      }

      cipherText.value = result;
      copyResult.disabled = false;
      showStatus('加密完成，结果为 Base64 编码密文。', 'success');
      window.Toolbox.showToast('RSA 加密完成');
    } catch {
      showStatus('加密异常。请检查公钥是否完整且为有效的 RSA 公钥。');
    }
  };

  rsaForm.addEventListener('submit', event => {
    event.preventDefault();
    encrypt();
  });

  rsaForm.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      encrypt();
    }
  });

  [publicKey, plainText].forEach(field => {
    field.addEventListener('input', invalidateResult);
    field.addEventListener('change', invalidateResult);
  });

  copyResult.addEventListener('click', () => {
    if (!cipherText.value) {
      showStatus('当前没有可复制的密文，请先执行加密。');
      return;
    }
    window.Toolbox.copyText(cipherText.value, '密文已复制');
  });

  if (typeof window.JSEncrypt !== 'function') {
    encryptButton.disabled = true;
    showStatus('加密库未能加载，请检查网络连接后刷新页面。');
  }
})();
