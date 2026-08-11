(() => {
  'use strict';

  const {
    convertJsonToYaml,
    convertYamlToJson,
  } = window.JsonYamlConverterCore;

  const DIRECTIONS = Object.freeze({
    'json-to-yaml': {
      inputName: 'JSON',
      outputName: 'YAML',
      inputPlaceholder: '输入需要转换的 JSON',
      outputPlaceholder: 'YAML 转换结果会显示在这里',
      buttonLabel: '转换为 YAML',
      downloadLabel: '下载 .yaml',
      fileName: 'converted.yaml',
      mimeType: 'application/yaml;charset=utf-8',
      reverse: 'yaml-to-json',
    },
    'yaml-to-json': {
      inputName: 'YAML',
      outputName: 'JSON',
      inputPlaceholder: '输入需要转换的 YAML',
      outputPlaceholder: 'JSON 转换结果会显示在这里',
      buttonLabel: '转换为 JSON',
      downloadLabel: '下载 .json',
      fileName: 'converted.json',
      mimeType: 'application/json;charset=utf-8',
      reverse: 'json-to-yaml',
    },
  });

  const directionSelect = document.getElementById('directionSelect');
  const indentSelect = document.getElementById('indentSelect');
  const sourceHeading = document.getElementById('source-heading');
  const resultHeading = document.getElementById('result-heading');
  const sourceLabel = document.getElementById('sourceLabel');
  const resultLabel = document.getElementById('resultLabel');
  const sourceInput = document.getElementById('sourceInput');
  const resultOutput = document.getElementById('resultOutput');
  const inputStats = document.getElementById('inputStats');
  const outputStats = document.getElementById('outputStats');
  const convertButton = document.getElementById('convertButton');
  const clearButton = document.getElementById('clearButton');
  const copyButton = document.getElementById('copyButton');
  const downloadButton = document.getElementById('downloadButton');
  const useAsInputButton = document.getElementById('useAsInputButton');
  const conversionStatus = document.getElementById('conversionStatus');

  const yamlAvailable = Boolean(
    window.jsyaml
    && typeof window.jsyaml.load === 'function'
    && typeof window.jsyaml.dump === 'function',
  );

  const getStats = (value) => {
    const text = String(value ?? '');
    const lineCount = text ? text.split(/\r\n?|\n/).length : 0;
    return `${lineCount} 行 · ${Array.from(text).length} 字符`;
  };

  const updateStats = () => {
    inputStats.textContent = getStats(sourceInput.value);
    outputStats.textContent = getStats(resultOutput.value);
  };

  const setStatus = (message, type = '') => {
    conversionStatus.textContent = message;
    conversionStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const updateOutputActions = () => {
    const hasOutput = resultOutput.value.length > 0;
    copyButton.disabled = !hasOutput;
    downloadButton.disabled = !hasOutput;
    useAsInputButton.disabled = !hasOutput;
  };

  const clearOutput = () => {
    resultOutput.value = '';
    resultOutput.removeAttribute('aria-invalid');
    updateOutputActions();
    updateStats();
  };

  const invalidateOutput = (message) => {
    if (!resultOutput.value) return;
    clearOutput();
    setStatus(message);
  };

  const updateDirectionUi = () => {
    const details = DIRECTIONS[directionSelect.value];
    if (!details) return;

    sourceHeading.textContent = `输入 ${details.inputName}`;
    resultHeading.textContent = `${details.outputName} 结果`;
    sourceLabel.textContent = `${details.inputName} 内容`;
    resultLabel.textContent = `${details.outputName} 内容`;
    sourceInput.placeholder = details.inputPlaceholder;
    resultOutput.placeholder = details.outputPlaceholder;
    convertButton.textContent = details.buttonLabel;
    downloadButton.textContent = details.downloadLabel;
  };

  const setDirection = (direction, statusMessage = '') => {
    if (!DIRECTIONS[direction]) return;
    directionSelect.value = direction;
    sourceInput.removeAttribute('aria-invalid');
    clearOutput();
    updateDirectionUi();
    if (statusMessage) {
      setStatus(statusMessage, 'success');
    } else if (yamlAvailable) {
      setStatus(`已切换为${DIRECTIONS[direction].inputName}转${DIRECTIONS[direction].outputName}。`);
    }
  };

  const convert = () => {
    if (!yamlAvailable) {
      setStatus('本地转换依赖 js-yaml 4.1.0 未能加载，请刷新页面或检查文件完整性。', 'error');
      return;
    }

    const direction = directionSelect.value;
    const details = DIRECTIONS[direction];
    sourceInput.removeAttribute('aria-invalid');

    try {
      const result = direction === 'json-to-yaml'
        ? convertJsonToYaml(sourceInput.value, indentSelect.value, window.jsyaml)
        : convertYamlToJson(sourceInput.value, indentSelect.value, window.jsyaml);

      resultOutput.value = result;
      updateOutputActions();
      updateStats();
      setStatus(`${details.inputName} 已成功转换为 ${details.outputName}。`, 'success');
    } catch (error) {
      clearOutput();
      sourceInput.setAttribute('aria-invalid', 'true');
      setStatus(error.message || '转换失败，请检查输入内容。', 'error');
      sourceInput.focus();
    }
  };

  const downloadResult = () => {
    if (!resultOutput.value) return;
    const details = DIRECTIONS[directionSelect.value];
    const blob = new Blob([resultOutput.value], { type: details.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = details.fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    window.Toolbox.showToast(`${details.fileName} 已下载`);
  };

  directionSelect.addEventListener('change', () => setDirection(directionSelect.value));
  indentSelect.addEventListener('change', () => invalidateOutput('缩进宽度已修改，请重新转换。'));
  convertButton.addEventListener('click', convert);

  clearButton.addEventListener('click', () => {
    sourceInput.value = '';
    sourceInput.removeAttribute('aria-invalid');
    clearOutput();
    updateStats();
    setStatus('内容已清空。');
    sourceInput.focus();
  });

  copyButton.addEventListener('click', () => {
    if (!resultOutput.value) return;
    window.Toolbox.copyText(resultOutput.value, '转换结果已复制');
  });

  downloadButton.addEventListener('click', downloadResult);

  useAsInputButton.addEventListener('click', () => {
    if (!resultOutput.value) return;
    const currentDetails = DIRECTIONS[directionSelect.value];
    sourceInput.value = resultOutput.value;
    setDirection(
      currentDetails.reverse,
      `结果已作为 ${currentDetails.outputName} 输入，可继续反向转换。`,
    );
    updateStats();
    sourceInput.focus();
  });

  sourceInput.addEventListener('input', () => {
    sourceInput.removeAttribute('aria-invalid');
    invalidateOutput('输入已修改，请重新转换。');
    updateStats();
  });

  sourceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      convert();
    }
  });

  updateDirectionUi();
  updateStats();
  updateOutputActions();

  if (!yamlAvailable) {
    convertButton.disabled = true;
    setStatus('本地转换依赖 js-yaml 4.1.0 未能加载，请刷新页面或检查文件完整性。', 'error');
  }
})();
