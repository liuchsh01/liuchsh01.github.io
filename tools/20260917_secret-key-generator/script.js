(() => {
  'use strict';

  const {
    DEFAULT_BYTES,
    DEFAULT_COUNT,
    DEFAULT_ENCODING,
    ENCODINGS,
    generateSecrets,
    normalizeOptions,
  } = window.SecretKeyGeneratorCore;

  const form = document.querySelector('#secretForm');
  const encodingInputs = [...document.querySelectorAll('input[name="encoding"]')];
  const byteLengthInput = document.querySelector('#byteLength');
  const countInput = document.querySelector('#secretCount');
  const generateButton = document.querySelector('#generateSecrets');
  const resetButton = document.querySelector('#resetSettings');
  const parameterSummary = document.querySelector('#parameterSummary');
  const formStatus = document.querySelector('#formStatus');
  const resultCount = document.querySelector('#resultCount');
  const resultMeta = document.querySelector('#resultMeta');
  const emptyState = document.querySelector('#emptyState');
  const resultList = document.querySelector('#resultList');
  const copyAll = document.querySelector('#copyAll');
  const downloadResults = document.querySelector('#downloadResults');

  const ENCODING_LABELS = Object.freeze({
    [ENCODINGS.BASE64]: 'Base64',
    [ENCODINGS.BASE64URL]: 'Base64URL',
    [ENCODINGS.HEX]: '十六进制',
  });

  let latestSecrets = [];
  let latestEncoding = DEFAULT_ENCODING;
  let latestByteLength = DEFAULT_BYTES;

  const selectedEncoding = () => (
    encodingInputs.find((input) => input.checked)?.value || DEFAULT_ENCODING
  );

  const getOptions = () => ({
    byteLength: byteLengthInput.value,
    count: countInput.value,
    encoding: selectedEncoding(),
  });

  const setStatus = (message, state = '') => {
    formStatus.textContent = message;
    formStatus.className = `status${state ? ` is-${state}` : ''}`;
  };

  const encodedLengthHint = (byteLength, encoding) => {
    if (encoding === ENCODINGS.HEX) return `${byteLength * 2} 个十六进制字符`;
    if (encoding === ENCODINGS.BASE64URL) {
      return `约 ${Math.ceil((byteLength * 4) / 3)} 个字符（无填充）`;
    }
    return `${Math.ceil(byteLength / 3) * 4} 个 Base64 字符`;
  };

  const updateSummary = () => {
    const encoding = selectedEncoding();
    const bytesText = /^\d+$/.test(byteLengthInput.value.trim()) ? `${byteLengthInput.value.trim()} 字节` : '—';
    parameterSummary.textContent = `${bytesText} · ${ENCODING_LABELS[encoding]}`;
  };

  const renderSecrets = (secrets, encoding, byteLength) => {
    latestSecrets = secrets;
    latestEncoding = encoding;
    latestByteLength = byteLength;
    resultList.replaceChildren();

    secrets.forEach((secret, index) => {
      const item = document.createElement('li');
      item.className = 'secret-item';

      const itemIndex = document.createElement('span');
      itemIndex.className = 'secret-index';
      itemIndex.textContent = String(index + 1).padStart(2, '0');

      const value = document.createElement('code');
      value.className = 'secret-value';
      value.textContent = secret;

      const copyButton = document.createElement('button');
      copyButton.className = 'copy-secret';
      copyButton.type = 'button';
      copyButton.dataset.secretIndex = String(index);
      copyButton.textContent = '复制';
      copyButton.setAttribute('aria-label', `复制第 ${index + 1} 个密钥`);

      item.append(itemIndex, value, copyButton);
      resultList.append(item);
    });

    emptyState.hidden = secrets.length > 0;
    resultList.hidden = secrets.length === 0;
    copyAll.disabled = secrets.length === 0;
    downloadResults.disabled = secrets.length === 0;
    resultCount.textContent = `${secrets.length} 个`;
    resultMeta.textContent = secrets.length
      ? `${byteLength} 字节随机数据 · ${ENCODING_LABELS[encoding]} · ${encodedLengthHint(byteLength, encoding)}`
      : '密钥尚未生成。';
  };

  const clearInvalidState = () => {
    byteLengthInput.removeAttribute('aria-invalid');
    countInput.removeAttribute('aria-invalid');
  };

  const generate = () => {
    clearInvalidState();
    try {
      const options = normalizeOptions(getOptions());
      const secrets = generateSecrets(options, window.crypto);
      renderSecrets(secrets, options.encoding, options.byteLength);
      setStatus(`已生成 ${secrets.length} 个 ${options.byteLength} 字节的 ${ENCODING_LABELS[options.encoding]} 密钥。`, 'success');
    } catch (error) {
      renderSecrets([], selectedEncoding(), Number(byteLengthInput.value) || DEFAULT_BYTES);
      const message = error.message || '生成失败，请检查参数。';
      if (message.includes('字节')) byteLengthInput.setAttribute('aria-invalid', 'true');
      if (message.includes('数量')) countInput.setAttribute('aria-invalid', 'true');
      setStatus(message, 'error');
    }
  };

  const download = () => {
    if (!latestSecrets.length) {
      window.Toolbox.showToast('没有可下载的结果');
      return;
    }

    const blob = new Blob([`${latestSecrets.join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `secret-${latestByteLength}b-${latestEncoding}-${new Date().toISOString().replaceAll(':', '-').slice(0, 19)}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    window.Toolbox.showToast(`已下载 ${latestSecrets.length} 个密钥`);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    generate();
  });

  form.addEventListener('input', () => {
    clearInvalidState();
    updateSummary();
  });

  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      generate();
    }
  });

  form.addEventListener('click', (event) => {
    const preset = event.target.closest('[data-byte-preset]');
    if (!preset) return;
    byteLengthInput.value = preset.dataset.bytePreset;
    clearInvalidState();
    updateSummary();
    generate();
  });

  resetButton.addEventListener('click', () => {
    encodingInputs.forEach((input) => {
      input.checked = input.value === DEFAULT_ENCODING;
    });
    byteLengthInput.value = String(DEFAULT_BYTES);
    countInput.value = String(DEFAULT_COUNT);
    clearInvalidState();
    updateSummary();
    generate();
    window.Toolbox.showToast('已恢复默认参数');
  });

  resultList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-secret-index]');
    if (!button) return;
    const secret = latestSecrets[Number(button.dataset.secretIndex)];
    if (secret !== undefined) {
      window.Toolbox.copyText(secret, '密钥已复制');
    }
  });

  copyAll.addEventListener('click', () => {
    if (!latestSecrets.length) {
      window.Toolbox.showToast('没有可复制的结果');
      return;
    }
    window.Toolbox.copyText(latestSecrets.join('\n'), `已复制 ${latestSecrets.length} 个密钥`);
  });

  downloadResults.addEventListener('click', download);

  if (!window.crypto?.getRandomValues) {
    generateButton.disabled = true;
    setStatus('当前浏览器不支持安全随机数，无法生成密钥。', 'error');
  } else {
    updateSummary();
    generate();
  }
})();
