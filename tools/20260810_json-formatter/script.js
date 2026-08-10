(() => {
  'use strict';

  const { parseJson } = window.JsonFormatterCore;
  const jsonInput = document.getElementById('jsonInput');
  const repairToggle = document.getElementById('repairToggle');
  const formatButton = document.getElementById('formatJson');
  const clearButton = document.getElementById('clearInput');
  const inputCount = document.getElementById('inputCount');
  const inputStatus = document.getElementById('inputStatus');
  const resultSummary = document.getElementById('resultSummary');
  const copyFormatted = document.getElementById('copyFormatted');
  const expandAll = document.getElementById('expandAll');
  const collapseAll = document.getElementById('collapseAll');
  const repairNotice = document.getElementById('repairNotice');
  const repairList = document.getElementById('repairList');
  const emptyState = document.getElementById('emptyState');
  const treePanel = document.getElementById('treePanel');
  const textPanel = document.getElementById('textPanel');
  const jsonTree = document.getElementById('jsonTree');
  const formattedJson = document.getElementById('formattedJson');
  const viewTabs = [...document.querySelectorAll('[role="tab"][data-view]')];

  const MAX_INPUT_LENGTH = 2_000_000;
  let activeView = 'tree';
  let latestFormatted = '';
  let hasResult = false;

  const makeSpan = (className, value) => {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = value;
    return span;
  };

  const setStatus = (message, type = '') => {
    inputStatus.textContent = message;
    inputStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const appendKey = (container, key) => {
    if (key === undefined) return;
    const isIndex = typeof key === 'number';
    container.append(
      makeSpan(isIndex ? 'json-index' : 'json-key', isIndex ? String(key) : JSON.stringify(String(key))),
      makeSpan('json-punctuation', ': '),
    );
  };

  const appendPrimitive = (container, value) => {
    if (value === null) {
      container.append(makeSpan('json-null', 'null'));
      return;
    }

    const type = typeof value;
    const className = type === 'string'
      ? 'json-string'
      : type === 'number'
        ? 'json-number'
        : 'json-boolean';
    const display = type === 'string' ? JSON.stringify(value) : String(value);
    container.append(makeSpan(className, display));
  };

  const createTreeNode = (value, key, depth = 0) => {
    if (value === null || typeof value !== 'object') {
      const leaf = document.createElement('div');
      leaf.className = 'json-leaf';
      appendKey(leaf, key);
      appendPrimitive(leaf, value);
      return leaf;
    }

    const isArray = Array.isArray(value);
    const entries = isArray ? value.map((item, index) => [index, item]) : Object.entries(value);
    if (entries.length === 0) {
      const leaf = document.createElement('div');
      leaf.className = 'json-leaf';
      appendKey(leaf, key);
      leaf.append(makeSpan('json-punctuation', isArray ? '[]' : '{}'));
      return leaf;
    }

    const details = document.createElement('details');
    details.className = 'json-branch';
    details.open = depth < 2;

    const summary = document.createElement('summary');
    appendKey(summary, key);
    summary.append(
      makeSpan('json-punctuation', isArray ? '[ … ]' : '{ … }'),
      makeSpan('json-type-count', isArray ? `${entries.length} 项` : `${entries.length} 个键`),
    );

    const children = document.createElement('div');
    children.className = 'json-children';
    entries.forEach(([childKey, childValue]) => {
      children.append(createTreeNode(childValue, childKey, depth + 1));
    });

    details.append(summary, children);
    return details;
  };

  const describeValue = (value) => {
    if (Array.isArray(value)) return `数组 · ${value.length} 项`;
    if (value !== null && typeof value === 'object') return `对象 · ${Object.keys(value).length} 个键`;
    if (value === null) return 'null';
    return typeof value === 'string' ? '字符串' : typeof value === 'number' ? '数字' : '布尔值';
  };

  const activateView = (view, focusTab = false) => {
    activeView = view;
    viewTabs.forEach(tab => {
      const selected = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
    treePanel.hidden = !hasResult || view !== 'tree';
    textPanel.hidden = !hasResult || view !== 'text';
    expandAll.disabled = !hasResult || view !== 'tree';
    collapseAll.disabled = !hasResult || view !== 'tree';
  };

  const renderRepairs = (repairs) => {
    repairList.replaceChildren();
    repairs.forEach(message => {
      const item = document.createElement('li');
      item.textContent = message;
      repairList.append(item);
    });
    repairNotice.hidden = repairs.length === 0;
  };

  const clearResults = () => {
    hasResult = false;
    latestFormatted = '';
    jsonTree.replaceChildren();
    formattedJson.textContent = '';
    repairNotice.hidden = true;
    repairList.replaceChildren();
    emptyState.hidden = false;
    treePanel.hidden = true;
    textPanel.hidden = true;
    resultSummary.textContent = '等待输入';
    copyFormatted.disabled = true;
    expandAll.disabled = true;
    collapseAll.disabled = true;
  };

  const formatInput = () => {
    const source = jsonInput.value;
    jsonInput.removeAttribute('aria-invalid');

    if (source.length > MAX_INPUT_LENGTH) {
      clearResults();
      jsonInput.setAttribute('aria-invalid', 'true');
      setStatus('输入超过 200 万字符，请拆分后再格式化。', 'error');
      return;
    }

    try {
      const result = parseJson(source, { repair: repairToggle.checked });
      latestFormatted = result.formatted;
      hasResult = true;
      jsonTree.replaceChildren(createTreeNode(result.value));
      formattedJson.textContent = result.formatted;
      emptyState.hidden = true;
      resultSummary.textContent = describeValue(result.value);
      copyFormatted.disabled = false;
      renderRepairs(result.repairs);
      activateView(activeView);
      setStatus(
        result.repaired ? `已完成格式化，并应用 ${result.repairs.length} 类修正。` : 'JSON 格式正确，已完成格式化。',
        'success',
      );
    } catch (error) {
      clearResults();
      jsonInput.setAttribute('aria-invalid', 'true');
      setStatus(error.message || 'JSON 无法解析，请检查输入。', 'error');
    }
  };

  jsonInput.addEventListener('input', () => {
    inputCount.textContent = `${jsonInput.value.length.toLocaleString('zh-CN')} 字符`;
    jsonInput.removeAttribute('aria-invalid');
  });

  jsonInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      formatInput();
    }
  });

  formatButton.addEventListener('click', formatInput);
  clearButton.addEventListener('click', () => {
    jsonInput.value = '';
    inputCount.textContent = '0 字符';
    jsonInput.removeAttribute('aria-invalid');
    clearResults();
    setStatus('输入和结果已清空。');
    jsonInput.focus();
  });

  copyFormatted.addEventListener('click', () => {
    if (!latestFormatted) {
      window.Toolbox.showToast('没有可复制的 JSON');
      return;
    }
    window.Toolbox.copyText(latestFormatted, '格式化 JSON 已复制');
  });

  expandAll.addEventListener('click', () => {
    jsonTree.querySelectorAll('details').forEach(details => { details.open = true; });
    window.Toolbox.showToast('已展开全部层级');
  });

  collapseAll.addEventListener('click', () => {
    jsonTree.querySelectorAll('details').forEach(details => { details.open = false; });
    window.Toolbox.showToast('已收起全部层级');
  });

  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => activateView(tab.dataset.view));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = viewTabs.indexOf(tab);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % viewTabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + viewTabs.length) % viewTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = viewTabs.length - 1;
      activateView(viewTabs[nextIndex].dataset.view, true);
    });
  });

  clearResults();
})();
