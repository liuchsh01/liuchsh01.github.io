(() => {
  'use strict';

  const {
    countStatements,
    getDownloadFilename,
    minifySql: compactSql,
    normalizeOptions,
  } = window.SqlFormatterCore;

  const languageSelect = document.getElementById('languageSelect');
  const keywordCaseSelect = document.getElementById('keywordCaseSelect');
  const tabWidthSelect = document.getElementById('tabWidthSelect');
  const logicalNewlineSelect = document.getElementById('logicalNewlineSelect');
  const querySpacingSelect = document.getElementById('querySpacingSelect');
  const preserveComments = document.getElementById('preserveComments');
  const sqlInput = document.getElementById('sqlInput');
  const sqlOutput = document.getElementById('sqlOutput');
  const inputStats = document.getElementById('inputStats');
  const outputStats = document.getElementById('outputStats');
  const formatButton = document.getElementById('formatSql');
  const minifyButton = document.getElementById('minifySql');
  const clearButton = document.getElementById('clearSql');
  const copyButton = document.getElementById('copySql');
  const downloadButton = document.getElementById('downloadSql');
  const useAsInputButton = document.getElementById('useSqlAsInput');
  const sqlStatus = document.getElementById('sqlStatus');

  let lastAction = 'format';
  let lastOutputWasCompact = false;

  const setStatus = (message, type = '') => {
    sqlStatus.textContent = message;
    sqlStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const getOptions = () => normalizeOptions({
    keywordCase: keywordCaseSelect.value,
    language: languageSelect.value,
    linesBetweenQueries: querySpacingSelect.value,
    logicalOperatorNewline: logicalNewlineSelect.value,
    tabWidth: tabWidthSelect.value,
  });

  const updateStats = () => {
    const statements = countStatements(sqlInput.value);
    inputStats.textContent = `${statements} 条 · ${sqlInput.value.length} 字符`;
    outputStats.textContent = `${sqlOutput.value.length} 字符`;
  };

  const updateOutputActions = () => {
    const hasOutput = sqlOutput.value.length > 0;
    copyButton.disabled = !hasOutput;
    downloadButton.disabled = !hasOutput;
    useAsInputButton.disabled = !hasOutput;
  };

  const clearOutput = () => {
    sqlOutput.value = '';
    updateOutputActions();
    updateStats();
  };

  const validateInput = () => {
    if (sqlInput.value.trim()) {
      sqlInput.removeAttribute('aria-invalid');
      return true;
    }
    sqlInput.setAttribute('aria-invalid', 'true');
    setStatus('请输入需要处理的 SQL。', 'error');
    sqlInput.focus();
    return false;
  };

  const runFormat = () => {
    if (!validateInput()) return;
    if (!window.sqlFormatter?.format) {
      clearOutput();
      setStatus('SQL 格式化依赖未能加载，请检查网络；本地压缩功能仍可使用。', 'error');
      return;
    }
    try {
      const options = getOptions();
      sqlOutput.value = window.sqlFormatter.format(sqlInput.value, options);
      lastAction = 'format';
      lastOutputWasCompact = false;
      updateOutputActions();
      updateStats();
      setStatus(`已按 ${languageSelect.selectedOptions[0].textContent} 方言格式化 SQL。`, 'success');
    } catch (error) {
      clearOutput();
      sqlInput.setAttribute('aria-invalid', 'true');
      setStatus(`格式化失败：${error.message || '请检查 SQL 语法和方言。'}`, 'error');
    }
  };

  const runMinify = () => {
    if (!validateInput()) return;
    try {
      getOptions();
      sqlOutput.value = compactSql(sqlInput.value, { removeComments: !preserveComments.checked });
      lastAction = 'minify';
      lastOutputWasCompact = true;
      updateOutputActions();
      updateStats();
      setStatus('SQL 已压缩，字符串与标识符中的空格保持不变。', 'success');
    } catch (error) {
      clearOutput();
      setStatus(error.message || 'SQL 压缩失败。', 'error');
    }
  };

  formatButton.addEventListener('click', runFormat);
  minifyButton.addEventListener('click', runMinify);

  clearButton.addEventListener('click', () => {
    sqlInput.value = '';
    sqlInput.removeAttribute('aria-invalid');
    clearOutput();
    updateStats();
    setStatus('内容已清空。');
    sqlInput.focus();
  });

  copyButton.addEventListener('click', () => {
    if (!sqlOutput.value) return;
    window.Toolbox.copyText(sqlOutput.value, 'SQL 结果已复制');
  });

  downloadButton.addEventListener('click', () => {
    if (!sqlOutput.value) return;
    const blob = new Blob([sqlOutput.value], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getDownloadFilename(languageSelect.value, lastOutputWasCompact);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    window.Toolbox.showToast('SQL 文件已下载');
  });

  useAsInputButton.addEventListener('click', () => {
    if (!sqlOutput.value) return;
    sqlInput.value = sqlOutput.value;
    sqlInput.removeAttribute('aria-invalid');
    clearOutput();
    updateStats();
    setStatus('处理结果已回填到输入框。', 'success');
    sqlInput.focus();
  });

  sqlInput.addEventListener('input', () => {
    sqlInput.removeAttribute('aria-invalid');
    if (sqlOutput.value) {
      clearOutput();
      setStatus('输入已修改，请重新处理。');
    }
    updateStats();
  });

  sqlInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (lastAction === 'minify') runMinify();
      else runFormat();
    }
  });

  [languageSelect, keywordCaseSelect, tabWidthSelect, logicalNewlineSelect, querySpacingSelect]
    .forEach(select => select.addEventListener('change', () => {
      if (sqlOutput.value) {
        clearOutput();
        setStatus('格式选项已修改，请重新处理。');
      }
    }));

  preserveComments.addEventListener('change', () => {
    if (lastOutputWasCompact && sqlOutput.value) {
      clearOutput();
      setStatus('注释选项已修改，请重新压缩。');
    }
  });

  updateStats();
  updateOutputActions();
})();
