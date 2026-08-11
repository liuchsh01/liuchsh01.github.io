(() => {
  'use strict';

  const {
    base64ToUtf8,
    decodeHtmlEntities,
    decodeUrl,
    encodeHtmlEntities,
    encodeUrl,
    utf8ToBase64,
  } = window.EncodingConverterCore;

  const MODE_DETAILS = Object.freeze({
    base64: {
      label: 'Base64',
      placeholder: '输入需要进行 Base64 编码或解码的 UTF-8 文本',
    },
    url: {
      label: 'URL',
      placeholder: '例如：https://example.com/search?q=中文内容',
    },
    html: {
      label: 'HTML 实体',
      placeholder: '例如：<p title="示例">Tom & Jerry</p>',
    },
  });

  const tabs = [...document.querySelectorAll('[data-codec]')];
  const optionGroups = [...document.querySelectorAll('[data-codec-option]')];
  const codecEditor = document.getElementById('codecEditor');
  const urlMode = document.getElementById('urlMode');
  const htmlMode = document.getElementById('htmlMode');
  const sourceInput = document.getElementById('sourceInput');
  const resultOutput = document.getElementById('resultOutput');
  const inputCount = document.getElementById('inputCount');
  const outputCount = document.getElementById('outputCount');
  const encodeButton = document.getElementById('encodeButton');
  const decodeButton = document.getElementById('decodeButton');
  const clearButton = document.getElementById('clearButton');
  const copyOutput = document.getElementById('copyOutput');
  const useAsInput = document.getElementById('useAsInput');
  const conversionStatus = document.getElementById('conversionStatus');

  let activeMode = 'base64';
  let lastDirection = 'encode';

  const getTextStats = (value) => {
    const text = String(value ?? '');
    return `${Array.from(text).length} 字符 · ${new TextEncoder().encode(text).length} 字节`;
  };

  const updateCounts = () => {
    inputCount.textContent = getTextStats(sourceInput.value);
    outputCount.textContent = getTextStats(resultOutput.value);
  };

  const setStatus = (message, type = '') => {
    conversionStatus.textContent = message;
    conversionStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const updateOutputActions = () => {
    const hasOutput = resultOutput.value.length > 0;
    copyOutput.disabled = !hasOutput;
    useAsInput.disabled = !hasOutput;
  };

  const clearOutput = () => {
    resultOutput.value = '';
    updateOutputActions();
    updateCounts();
  };

  const invalidateOutput = (message) => {
    if (!resultOutput.value) return;
    clearOutput();
    setStatus(message);
  };

  const setMode = (mode, focusTab = false) => {
    if (!MODE_DETAILS[mode]) return;
    activeMode = mode;

    tabs.forEach(tab => {
      const selected = tab.dataset.codec === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) {
        codecEditor.setAttribute('aria-labelledby', tab.id);
        if (focusTab) tab.focus();
      }
    });
    optionGroups.forEach(group => {
      group.hidden = group.dataset.codecOption !== mode;
    });

    sourceInput.placeholder = MODE_DETAILS[mode].placeholder;
    sourceInput.removeAttribute('aria-invalid');
    clearOutput();
    setStatus(`已切换到 ${MODE_DETAILS[mode].label}，请输入内容后选择编码或解码。`);
  };

  const transform = (direction) => {
    const source = sourceInput.value;
    if (!source) {
      sourceInput.setAttribute('aria-invalid', 'true');
      setStatus('请输入需要转换的内容。', 'error');
      sourceInput.focus();
      return;
    }

    lastDirection = direction;
    sourceInput.removeAttribute('aria-invalid');

    try {
      let result;
      if (activeMode === 'base64') {
        result = direction === 'encode' ? utf8ToBase64(source) : base64ToUtf8(source);
      } else if (activeMode === 'url') {
        result = direction === 'encode'
          ? encodeUrl(source, urlMode.value)
          : decodeUrl(source, urlMode.value);
      } else {
        result = direction === 'encode'
          ? encodeHtmlEntities(source, htmlMode.value)
          : decodeHtmlEntities(source);
      }

      resultOutput.value = result;
      updateOutputActions();
      updateCounts();
      const actionLabel = direction === 'encode' ? '编码' : '解码';
      setStatus(`${MODE_DETAILS[activeMode].label} ${actionLabel}完成。`, 'success');
    } catch (error) {
      clearOutput();
      sourceInput.setAttribute('aria-invalid', 'true');
      setStatus(error.message || '转换失败，请检查输入内容。', 'error');
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setMode(tab.dataset.codec));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      setMode(tabs[nextIndex].dataset.codec, true);
    });
  });

  encodeButton.addEventListener('click', () => transform('encode'));
  decodeButton.addEventListener('click', () => transform('decode'));

  clearButton.addEventListener('click', () => {
    sourceInput.value = '';
    sourceInput.removeAttribute('aria-invalid');
    clearOutput();
    updateCounts();
    setStatus('内容已清空。');
    sourceInput.focus();
  });

  copyOutput.addEventListener('click', () => {
    if (!resultOutput.value) {
      window.Toolbox.showToast('没有可复制的结果');
      return;
    }
    window.Toolbox.copyText(resultOutput.value, '转换结果已复制');
  });

  useAsInput.addEventListener('click', () => {
    if (!resultOutput.value) return;
    sourceInput.value = resultOutput.value;
    sourceInput.removeAttribute('aria-invalid');
    clearOutput();
    updateCounts();
    setStatus('转换结果已回填到输入框，可继续处理。', 'success');
    sourceInput.focus();
  });

  sourceInput.addEventListener('input', () => {
    sourceInput.removeAttribute('aria-invalid');
    invalidateOutput('输入已修改，请重新转换。');
    updateCounts();
  });

  sourceInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      transform(lastDirection);
    }
  });

  urlMode.addEventListener('change', () => invalidateOutput('URL 处理范围已修改，请重新转换。'));
  htmlMode.addEventListener('change', () => invalidateOutput('HTML 编码范围已修改，请重新转换。'));

  updateCounts();
  updateOutputActions();
})();
