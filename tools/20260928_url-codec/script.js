(() => {
  'use strict';

  const core = window.UrlCodecCore;
  const urlMode = document.getElementById('urlMode');
  const modeHint = document.getElementById('modeHint');
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
  const available = Boolean(core?.convertUrl && window.TextEncoder);
  const rules = {
    component: {
      name: '参数或路径片段',
      hint: '适合单个参数值或路径片段。空格编码为 %20，+ 编码为 %2B；解码时 + 保持不变。',
      placeholder: '例如：中文 空格+&/?',
    },
    full: {
      name: '完整网址',
      hint: '保留 : / ? & = # 等网址结构；解码时也保留这些字符的百分号编码。整个网址已被编码时，请选择“参数或路径片段”解码。',
      placeholder: '例如：https://example.com/search?q=中文 空格#结果',
    },
    form: {
      name: '表单参数',
      hint: '处理单个参数名或值。空格编码为 +，原有 + 编码为 %2B；解码时 + 还原为空格。',
      placeholder: '例如：搜索词 A+B 或 搜索词+A%2BB',
    },
  };
  let lastDirection = 'encode';

  const setStatus = (message, state = '') => {
    conversionStatus.textContent = message;
    conversionStatus.className = `status${state ? ` is-${state}` : ''}`;
  };

  const textStats = text => `${Array.from(text).length} 字符 · ${new TextEncoder().encode(text).length} 字节`;

  const updateCounts = () => {
    if (!available) return;
    inputCount.textContent = textStats(sourceInput.value);
    outputCount.textContent = textStats(resultOutput.value);
  };

  const clearOutput = () => {
    resultOutput.value = '';
    copyOutput.disabled = true;
    useAsInput.disabled = true;
    updateCounts();
  };

  const invalidate = message => {
    sourceInput.removeAttribute('aria-invalid');
    clearOutput();
    setStatus(message);
  };

  const transform = direction => {
    if (!available) return;
    clearOutput();
    sourceInput.removeAttribute('aria-invalid');
    if (sourceInput.value.length === 0) {
      sourceInput.setAttribute('aria-invalid', 'true');
      setStatus('请输入需要编码或解码的内容。', 'error');
      sourceInput.focus();
      return;
    }
    lastDirection = direction;
    try {
      resultOutput.value = core.convertUrl(sourceInput.value, { direction, mode: urlMode.value });
      copyOutput.disabled = resultOutput.value.length === 0;
      useAsInput.disabled = resultOutput.value.length === 0;
      updateCounts();
      setStatus(`${rules[urlMode.value].name} · ${direction === 'encode' ? '编码' : '解码'}完成（UTF-8，仅处理一层）。`, 'success');
    } catch (error) {
      sourceInput.setAttribute('aria-invalid', 'true');
      setStatus(error.message || '转换失败，请检查输入和处理规则。', 'error');
    }
  };

  encodeButton.addEventListener('click', () => transform('encode'));
  decodeButton.addEventListener('click', () => transform('decode'));
  sourceInput.addEventListener('input', () => invalidate('输入已修改，请重新编码或解码。'));
  sourceInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      transform(lastDirection);
    }
  });
  urlMode.addEventListener('change', () => {
    const rule = rules[urlMode.value];
    modeHint.textContent = rule.hint;
    sourceInput.placeholder = rule.placeholder;
    invalidate(`已切换为${rule.name}，请选择编码或解码。`);
  });
  clearButton.addEventListener('click', () => {
    sourceInput.value = '';
    invalidate('输入与结果已清空。');
    sourceInput.focus();
  });
  copyOutput.addEventListener('click', () => {
    if (!copyOutput.disabled) window.Toolbox.copyText(resultOutput.value, '转换结果已复制');
  });
  useAsInput.addEventListener('click', () => {
    if (useAsInput.disabled) return;
    sourceInput.value = resultOutput.value;
    invalidate('结果已放入输入框，可继续编码或解码。');
    sourceInput.focus();
  });

  if (!available) {
    [urlMode, sourceInput, encodeButton, decodeButton, clearButton].forEach(control => { control.disabled = true; });
    setStatus('本地转换组件未能加载，或浏览器缺少 UTF-8 支持。请刷新页面并使用现代浏览器重试。', 'error');
  } else {
    updateCounts();
  }
})();
