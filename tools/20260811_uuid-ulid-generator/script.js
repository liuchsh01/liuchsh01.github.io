(() => {
  'use strict';

  const {
    IDENTIFIER_TYPES,
    generateIdentifiers,
    normalizeOptions,
  } = window.IdentifierGeneratorCore;

  const form = document.querySelector('#identifierForm');
  const typeInputs = [...document.querySelectorAll('input[name="identifierType"]')];
  const countInput = document.querySelector('#identifierCount');
  const letterCaseSelect = document.querySelector('#letterCase');
  const includeHyphens = document.querySelector('#includeHyphens');
  const hyphenHint = document.querySelector('#hyphenHint');
  const generateButton = document.querySelector('#generateIdentifiers');
  const resetButton = document.querySelector('#resetSettings');
  const parameterSummary = document.querySelector('#parameterSummary');
  const formStatus = document.querySelector('#formStatus');
  const resultCount = document.querySelector('#resultCount');
  const emptyState = document.querySelector('#emptyState');
  const resultList = document.querySelector('#resultList');
  const copyAll = document.querySelector('#copyAll');
  const downloadResults = document.querySelector('#downloadResults');

  const TYPE_LABELS = Object.freeze({
    [IDENTIFIER_TYPES.UUID_V4]: 'UUID v4',
    [IDENTIFIER_TYPES.UUID_V7]: 'UUID v7',
    [IDENTIFIER_TYPES.ULID]: 'ULID',
  });

  let latestIdentifiers = [];
  let latestType = IDENTIFIER_TYPES.UUID_V4;

  const selectedType = () => (
    typeInputs.find(input => input.checked)?.value || IDENTIFIER_TYPES.UUID_V4
  );

  const getOptions = () => ({
    count: countInput.value,
    hyphens: includeHyphens.checked,
    letterCase: letterCaseSelect.value,
    type: selectedType(),
  });

  const setStatus = (message, state = '') => {
    formStatus.textContent = message;
    formStatus.className = `status${state ? ` is-${state}` : ''}`;
  };

  const updateTypeControls = () => {
    const isUlid = selectedType() === IDENTIFIER_TYPES.ULID;
    includeHyphens.disabled = isUlid;
    hyphenHint.textContent = isUlid
      ? 'ULID 固定为无连字符的 26 位格式'
      : '输出标准的 8-4-4-4-12 分组格式';
  };

  const updateSummary = () => {
    const type = selectedType();
    const countText = /^\d+$/.test(countInput.value.trim()) ? countInput.value.trim() : '—';
    parameterSummary.textContent = `${TYPE_LABELS[type]} · ${countText} 个`;
    updateTypeControls();
  };

  const renderIdentifiers = (identifiers, type) => {
    latestIdentifiers = identifiers;
    latestType = type;
    resultList.replaceChildren();

    identifiers.forEach((identifier, index) => {
      const item = document.createElement('li');
      item.className = 'identifier-item';

      const itemIndex = document.createElement('span');
      itemIndex.className = 'identifier-index';
      itemIndex.textContent = String(index + 1).padStart(2, '0');

      const value = document.createElement('code');
      value.className = 'identifier-value';
      value.textContent = identifier;

      const copyButton = document.createElement('button');
      copyButton.className = 'copy-identifier';
      copyButton.type = 'button';
      copyButton.dataset.identifierIndex = String(index);
      copyButton.textContent = '复制';
      copyButton.setAttribute('aria-label', `复制第 ${index + 1} 个标识符`);

      item.append(itemIndex, value, copyButton);
      resultList.append(item);
    });

    emptyState.hidden = identifiers.length > 0;
    resultList.hidden = identifiers.length === 0;
    copyAll.disabled = identifiers.length === 0;
    downloadResults.disabled = identifiers.length === 0;
    resultCount.textContent = `${identifiers.length} 个`;
  };

  const clearInvalidState = () => {
    countInput.removeAttribute('aria-invalid');
  };

  const generate = () => {
    clearInvalidState();
    try {
      const options = normalizeOptions(getOptions());
      const identifiers = generateIdentifiers(options, window.crypto);
      renderIdentifiers(identifiers, options.type);
      setStatus(`已生成 ${identifiers.length} 个 ${TYPE_LABELS[options.type]}。`, 'success');
    } catch (error) {
      countInput.setAttribute('aria-invalid', 'true');
      setStatus(error.message || '生成失败，请检查参数。', 'error');
    }
  };

  const download = () => {
    if (!latestIdentifiers.length) {
      window.Toolbox.showToast('没有可下载的结果');
      return;
    }

    const blob = new Blob([`${latestIdentifiers.join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${latestType}-${new Date().toISOString().replaceAll(':', '-').slice(0, 19)}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    window.Toolbox.showToast(`已下载 ${latestIdentifiers.length} 个标识符`);
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    generate();
  });

  form.addEventListener('input', () => {
    clearInvalidState();
    updateSummary();
  });

  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      generate();
    }
  });

  resetButton.addEventListener('click', () => {
    typeInputs.forEach(input => {
      input.checked = input.value === IDENTIFIER_TYPES.UUID_V4;
    });
    countInput.value = '5';
    letterCaseSelect.value = 'standard';
    includeHyphens.checked = true;
    clearInvalidState();
    updateSummary();
    generate();
    window.Toolbox.showToast('已恢复默认参数');
  });

  resultList.addEventListener('click', event => {
    const button = event.target.closest('[data-identifier-index]');
    if (!button) return;
    const identifier = latestIdentifiers[Number(button.dataset.identifierIndex)];
    if (identifier !== undefined) {
      window.Toolbox.copyText(identifier, '标识符已复制');
    }
  });

  copyAll.addEventListener('click', () => {
    if (!latestIdentifiers.length) {
      window.Toolbox.showToast('没有可复制的结果');
      return;
    }
    window.Toolbox.copyText(
      latestIdentifiers.join('\n'),
      `已复制 ${latestIdentifiers.length} 个标识符`,
    );
  });

  downloadResults.addEventListener('click', download);

  if (!window.crypto?.getRandomValues) {
    generateButton.disabled = true;
    setStatus('当前浏览器不支持安全随机数，无法生成标识符。', 'error');
  } else {
    updateSummary();
    generate();
  }
})();
