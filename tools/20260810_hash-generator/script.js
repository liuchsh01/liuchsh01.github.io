(() => {
  'use strict';

  const {
    digestBytes,
    javaStringHashCode,
    splitTextLines,
    textToBytes,
  } = window.HashToolCore;
  const tabList = document.querySelector('.mode-tabs');
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const textPanel = document.getElementById('textPanel');
  const filePanel = document.getElementById('filePanel');
  const algorithmInputs = [...document.querySelectorAll('input[name="algorithm"]')];
  const textInput = document.getElementById('textInput');
  const hashTextButton = document.getElementById('hashText');
  const clearTextButton = document.getElementById('clearText');
  const fileDropZone = document.getElementById('fileDropZone');
  const fileInput = document.getElementById('fileInput');
  const fileList = document.getElementById('fileList');
  const fileCount = document.getElementById('fileCount');
  const hashFilesButton = document.getElementById('hashFiles');
  const clearFilesButton = document.getElementById('clearFiles');
  const inputSummary = document.getElementById('inputSummary');
  const inputStatus = document.getElementById('inputStatus');
  const resultList = document.getElementById('resultList');
  const resultCount = document.getElementById('resultCount');
  const emptyState = document.getElementById('emptyState');
  const copyAllButton = document.getElementById('copyAll');

  let activeMode = 'text';
  let selectedFiles = [];
  let latestResults = [];
  let isBusy = false;

  const formatBytes = (value) => {
    if (value === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const size = value / (1024 ** unitIndex);
    const decimals = unitIndex === 0 || size >= 100 ? 0 : size >= 10 ? 1 : 2;
    return `${size.toFixed(decimals)} ${units[unitIndex]}`;
  };

  const getSelectedAlgorithms = () => algorithmInputs
    .filter(input => input.checked && !input.disabled)
    .map(input => input.value);

  const setStatus = (message, type = '') => {
    inputStatus.textContent = message;
    inputStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const setBusy = (busy) => {
    isBusy = busy;
    tabs.forEach(tab => { tab.disabled = busy; });
    algorithmInputs.forEach(input => {
      const unavailable = input.dataset.unavailable === 'true';
      const textOnlyInFileMode = input.dataset.textOnly === 'true' && activeMode === 'file';
      input.disabled = busy || unavailable || textOnlyInFileMode;
    });
    textInput.disabled = busy;
    hashTextButton.disabled = busy;
    clearTextButton.disabled = busy;
    fileInput.disabled = busy;
    hashFilesButton.disabled = busy || selectedFiles.length === 0;
    clearFilesButton.disabled = busy || selectedFiles.length === 0;
    fileList.querySelectorAll('button').forEach(button => { button.disabled = busy; });
  };

  const resetResults = () => {
    latestResults = [];
    resultList.replaceChildren();
    resultList.hidden = true;
    emptyState.hidden = false;
    resultCount.textContent = '0 项';
    copyAllButton.disabled = true;
  };

  const makeText = (tagName, className, value) => {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = value;
    return element;
  };

  const renderResults = (results) => {
    latestResults = results;
    resultList.replaceChildren();

    results.forEach((result, resultIndex) => {
      const card = document.createElement('article');
      card.className = `hash-result-card${result.error ? ' is-error' : ''}`;

      const head = document.createElement('div');
      head.className = 'result-card-head';
      head.append(
        makeText('h3', '', result.title),
        makeText('span', 'result-meta', result.meta || ''),
      );
      card.append(head);

      if (Object.hasOwn(result, 'preview')) {
        const preview = result.preview === '' ? '（空行）' : result.preview;
        card.append(makeText('p', 'line-preview', preview));
      }

      if (result.error) {
        card.append(makeText('p', 'result-error', result.error));
      } else {
        const values = document.createElement('dl');
        values.className = 'hash-values';

        result.hashes.forEach((hash, hashIndex) => {
          const row = document.createElement('div');
          row.className = 'hash-value-row';
          const term = makeText('dt', '', hash.algorithm);
          const description = document.createElement('dd');
          description.append(makeText('code', 'hash-code', hash.value));
          const copyButton = makeText('button', 'copy-hash', '复制');
          copyButton.type = 'button';
          copyButton.dataset.resultIndex = String(resultIndex);
          copyButton.dataset.hashIndex = String(hashIndex);
          copyButton.setAttribute('aria-label', `复制 ${result.title} 的 ${hash.algorithm}`);
          row.append(term, description, copyButton);
          values.append(row);
        });

        card.append(values);
      }

      resultList.append(card);
    });

    const validCount = results.filter(result => !result.error).length;
    resultList.hidden = results.length === 0;
    emptyState.hidden = results.length > 0;
    resultCount.textContent = `${results.length} 项`;
    copyAllButton.disabled = validCount === 0;
  };

  const hashAlgorithms = async (bytes, algorithms, sourceText = null) => Promise.all(
    algorithms.map(async algorithm => algorithm === 'JAVA-HASHCODE'
      ? {
          algorithm: 'Java hashCode',
          value: String(javaStringHashCode(sourceText)),
        }
      : {
          algorithm,
          value: await digestBytes(algorithm, bytes),
        }),
  );

  const requireAlgorithms = () => {
    const algorithms = getSelectedAlgorithms();
    if (!algorithms.length) {
      setStatus('请至少选择一种 Hash 算法。', 'error');
      return null;
    }
    return algorithms;
  };

  const calculateTextHashes = async () => {
    if (isBusy) return;
    const algorithms = requireAlgorithms();
    if (!algorithms) return;

    const text = textInput.value;
    if (text === '') {
      textInput.setAttribute('aria-invalid', 'true');
      textInput.focus();
      setStatus('请输入要计算 Hash 的文本；如需计算空文件，请使用文件模式。', 'error');
      return;
    }

    textInput.removeAttribute('aria-invalid');
    const textMode = document.querySelector('input[name="textMode"]:checked').value;
    const lines = textMode === 'line' ? splitTextLines(text) : [text];
    const results = [];
    setBusy(true);

    try {
      for (let index = 0; index < lines.length; index += 1) {
        const content = lines[index];
        const bytes = textToBytes(content);
        setStatus(`正在计算第 ${index + 1} / ${lines.length} 项…`);
        const hashes = await hashAlgorithms(bytes, algorithms, content);
        const result = {
          title: textMode === 'line' ? `第 ${index + 1} 行` : '整段文本',
          meta: formatBytes(bytes.byteLength),
          hashes,
        };
        if (textMode === 'line') result.preview = content;
        results.push(result);
      }

      renderResults(results);
      setStatus(`已完成 ${results.length} 项文本计算。`, 'success');
    } catch (error) {
      setStatus(error.message || '文本 Hash 计算失败，请重试。', 'error');
    } finally {
      setBusy(false);
    }
  };

  const fileKey = (file) => `${file.name}\u0000${file.size}\u0000${file.lastModified}`;

  const addFiles = (files) => {
    if (isBusy) return;
    const knownKeys = new Set(selectedFiles.map(fileKey));
    for (const file of files) {
      const key = fileKey(file);
      if (!knownKeys.has(key)) {
        selectedFiles.push(file);
        knownKeys.add(key);
      }
    }
    renderFiles();
    setStatus(selectedFiles.length ? `已选择 ${selectedFiles.length} 个文件。` : '尚未选择文件。');
  };

  const renderFiles = () => {
    fileList.replaceChildren();
    fileCount.textContent = `${selectedFiles.length} 个`;
    if (activeMode === 'file') {
      inputSummary.textContent = `文件模式 · ${selectedFiles.length} 个`;
    }

    if (!selectedFiles.length) {
      fileList.append(makeText('li', 'file-list-empty', '尚未选择文件。'));
    } else {
      selectedFiles.forEach((file, index) => {
        const item = document.createElement('li');
        item.className = 'file-item';
        const name = makeText('span', 'file-name', file.name);
        name.title = file.name;
        const size = makeText('span', 'file-size', formatBytes(file.size));
        const remove = makeText('button', 'remove-file', '移除');
        remove.type = 'button';
        remove.dataset.fileIndex = String(index);
        remove.setAttribute('aria-label', `移除文件 ${file.name}`);
        item.append(name, size, remove);
        fileList.append(item);
      });
    }

    hashFilesButton.disabled = isBusy || selectedFiles.length === 0;
    clearFilesButton.disabled = isBusy || selectedFiles.length === 0;
  };

  const calculateFileHashes = async () => {
    if (isBusy) return;
    const algorithms = requireAlgorithms();
    if (!algorithms) return;
    if (!selectedFiles.length) {
      setStatus('请先选择至少一个文件。', 'error');
      return;
    }

    const files = [...selectedFiles];
    const results = [];
    setBusy(true);

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(`正在读取并计算 ${index + 1} / ${files.length}：${file.name}`);
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const hashes = await hashAlgorithms(bytes, algorithms);
          results.push({
            title: file.name,
            meta: formatBytes(file.size),
            hashes,
          });
        } catch (error) {
          results.push({
            title: file.name,
            meta: formatBytes(file.size),
            error: error.message || '无法读取或计算此文件。',
          });
        }
      }

      renderResults(results);
      const failedCount = results.filter(result => result.error).length;
      setStatus(
        failedCount
          ? `已处理 ${results.length} 个文件，其中 ${failedCount} 个失败。`
          : `已完成 ${results.length} 个文件的 Hash 计算。`,
        failedCount ? 'error' : 'success',
      );
    } finally {
      setBusy(false);
    }
  };

  const activateMode = (mode, focusTab = false) => {
    if (isBusy || mode === activeMode) return;
    activeMode = mode;
    tabs.forEach(tab => {
      const selected = tab.dataset.mode === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
    textPanel.hidden = mode !== 'text';
    filePanel.hidden = mode !== 'file';
    inputSummary.textContent = mode === 'text' ? '文本模式' : `文件模式 · ${selectedFiles.length} 个`;
    setBusy(false);
    setStatus(mode === 'text' ? '请输入文本并选择多行处理方式。' : '请选择或拖入一个或多个文件。');
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateMode(tab.dataset.mode));
  });

  tabList.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = tabs.indexOf(document.activeElement);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    activateMode(tabs[nextIndex].dataset.mode, true);
  });

  textInput.addEventListener('input', () => {
    textInput.removeAttribute('aria-invalid');
  });
  textInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      calculateTextHashes();
    }
  });
  hashTextButton.addEventListener('click', calculateTextHashes);
  clearTextButton.addEventListener('click', () => {
    textInput.value = '';
    textInput.removeAttribute('aria-invalid');
    resetResults();
    setStatus('文本和结果已清空。');
    textInput.focus();
  });

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(type => {
    fileDropZone.addEventListener(type, event => {
      event.preventDefault();
      if (!isBusy) fileDropZone.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach(type => {
    fileDropZone.addEventListener(type, event => {
      event.preventDefault();
      fileDropZone.classList.remove('is-dragging');
    });
  });
  fileDropZone.addEventListener('drop', event => addFiles(event.dataTransfer.files));

  fileList.addEventListener('click', event => {
    const button = event.target.closest('[data-file-index]');
    if (!button || isBusy) return;
    selectedFiles.splice(Number(button.dataset.fileIndex), 1);
    renderFiles();
    setStatus(selectedFiles.length ? `还剩 ${selectedFiles.length} 个文件。` : '文件列表已清空。');
  });
  hashFilesButton.addEventListener('click', calculateFileHashes);
  clearFilesButton.addEventListener('click', () => {
    selectedFiles = [];
    fileInput.value = '';
    renderFiles();
    resetResults();
    setStatus('文件列表和结果已清空。');
  });

  resultList.addEventListener('click', event => {
    const button = event.target.closest('[data-result-index][data-hash-index]');
    if (!button) return;
    const result = latestResults[Number(button.dataset.resultIndex)];
    const hash = result?.hashes?.[Number(button.dataset.hashIndex)];
    if (hash) window.Toolbox.copyText(hash.value, `${hash.algorithm} 已复制`);
  });

  copyAllButton.addEventListener('click', () => {
    const output = latestResults
      .filter(result => !result.error)
      .map(result => [
        result.title,
        ...result.hashes.map(hash => `${hash.algorithm}: ${hash.value}`),
      ].join('\n'))
      .join('\n\n');

    if (!output) {
      window.Toolbox.showToast('没有可复制的结果');
      return;
    }
    window.Toolbox.copyText(output, '全部结果已复制');
  });

  const webCryptoAvailable = Boolean(window.crypto && window.crypto.subtle);
  if (!webCryptoAvailable) {
    algorithmInputs.filter(input => input.value !== 'MD5').forEach(input => {
      input.checked = false;
      input.disabled = true;
      input.dataset.unavailable = 'true';
      input.closest('label').title = '当前浏览器环境不支持 Web Crypto';
    });
    setStatus('当前环境仅支持 MD5；请使用现代浏览器或 HTTPS 页面计算 SHA Hash。', 'error');
  }

  renderFiles();
})();
