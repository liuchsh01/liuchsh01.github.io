(() => {
  'use strict';

  const {
    countLines,
    joinLines,
    organizeLines,
    performSetOperation,
  } = window.TextListOrganizerCore;

  const OPERATION_LABELS = Object.freeze({
    intersection: '交集（A ∩ B）',
    'difference-a': '差集（A − B）',
    'difference-b': '差集（B − A）',
    union: '并集（A ∪ B）',
  });

  const tabs = [...document.querySelectorAll('[data-mode]')];
  const organizePanel = document.getElementById('organizePanel');
  const setPanel = document.getElementById('setPanel');

  const sourceList = document.getElementById('sourceList');
  const sourceCount = document.getElementById('sourceCount');
  const trimLines = document.getElementById('trimLines');
  const removeEmpty = document.getElementById('removeEmpty');
  const deduplicate = document.getElementById('deduplicate');
  const caseSensitive = document.getElementById('caseSensitive');
  const sortMode = document.getElementById('sortMode');
  const caseTransform = document.getElementById('caseTransform');
  const linePrefix = document.getElementById('linePrefix');
  const lineSuffix = document.getElementById('lineSuffix');
  const organizeButton = document.getElementById('organizeButton');
  const clearOrganizer = document.getElementById('clearOrganizer');
  const organizeResult = document.getElementById('organizeResult');
  const organizeResultCount = document.getElementById('organizeResultCount');
  const copyOrganizeResult = document.getElementById('copyOrganizeResult');
  const downloadOrganizeResult = document.getElementById('downloadOrganizeResult');
  const organizeStatus = document.getElementById('organizeStatus');

  const listA = document.getElementById('listA');
  const listB = document.getElementById('listB');
  const listACount = document.getElementById('listACount');
  const listBCount = document.getElementById('listBCount');
  const setOperation = document.getElementById('setOperation');
  const setTrim = document.getElementById('setTrim');
  const setRemoveEmpty = document.getElementById('setRemoveEmpty');
  const setCaseSensitive = document.getElementById('setCaseSensitive');
  const swapLists = document.getElementById('swapLists');
  const calculateSet = document.getElementById('calculateSet');
  const clearSets = document.getElementById('clearSets');
  const setResult = document.getElementById('setResult');
  const setResultCount = document.getElementById('setResultCount');
  const copySetResult = document.getElementById('copySetResult');
  const downloadSetResult = document.getElementById('downloadSetResult');
  const setStatus = document.getElementById('setStatus');

  let activeMode = 'organize';
  let hasOrganizeResult = false;
  let hasSetResult = false;

  const getVisibleLineCount = value => (value === '' ? 0 : countLines(value));

  const updateRawCounts = () => {
    sourceCount.textContent = `${getVisibleLineCount(sourceList.value)} 行`;
    listACount.textContent = `${getVisibleLineCount(listA.value)} 行`;
    listBCount.textContent = `${getVisibleLineCount(listB.value)} 行`;
  };

  const setOrganizeStatus = (message, type = '') => {
    organizeStatus.textContent = message;
    organizeStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const setSetStatus = (message, type = '') => {
    setStatus.textContent = message;
    setStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const resetOrganizeOutput = () => {
    hasOrganizeResult = false;
    organizeResult.value = '';
    organizeResultCount.textContent = '0 行';
    copyOrganizeResult.disabled = true;
    downloadOrganizeResult.disabled = true;
  };

  const resetSetOutput = () => {
    hasSetResult = false;
    setResult.value = '';
    setResultCount.textContent = '0 行';
    copySetResult.disabled = true;
    downloadSetResult.disabled = true;
  };

  const invalidateOrganizeOutput = () => {
    if (!hasOrganizeResult) return;
    resetOrganizeOutput();
    setOrganizeStatus('输入或规则已修改，请重新整理。');
  };

  const invalidateSetOutput = () => {
    if (!hasSetResult) return;
    resetSetOutput();
    setSetStatus('列表或比较规则已修改，请重新计算。');
  };

  const selectMode = (mode, focusTab = false) => {
    if (!['organize', 'sets'].includes(mode)) return;
    activeMode = mode;
    organizePanel.hidden = mode !== 'organize';
    setPanel.hidden = mode !== 'sets';
    tabs.forEach(tab => {
      const selected = tab.dataset.mode === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
  };

  const runOrganizer = () => {
    sourceList.removeAttribute('aria-invalid');
    if (sourceList.value === '') {
      resetOrganizeOutput();
      sourceList.setAttribute('aria-invalid', 'true');
      setOrganizeStatus('请输入需要整理的文本列表。', 'error');
      sourceList.focus();
      return;
    }

    try {
      const lines = organizeLines(sourceList.value, {
        caseSensitive: caseSensitive.checked,
        caseTransform: caseTransform.value,
        deduplicate: deduplicate.checked,
        prefix: linePrefix.value,
        removeEmpty: removeEmpty.checked,
        sort: sortMode.value,
        suffix: lineSuffix.value,
        trim: trimLines.checked,
      });
      organizeResult.value = joinLines(lines);
      organizeResultCount.textContent = `${lines.length} 行`;
      hasOrganizeResult = true;
      copyOrganizeResult.disabled = lines.length === 0;
      downloadOrganizeResult.disabled = lines.length === 0;
      setOrganizeStatus(
        lines.length ? `整理完成，共输出 ${lines.length} 行。` : '整理完成，当前规则下没有可输出的内容。',
        'success',
      );
    } catch (error) {
      resetOrganizeOutput();
      setOrganizeStatus(error.message || '整理失败，请检查输入和规则。', 'error');
    }
  };

  const runSetOperation = () => {
    listA.removeAttribute('aria-invalid');
    listB.removeAttribute('aria-invalid');
    if (listA.value === '' && listB.value === '') {
      resetSetOutput();
      listA.setAttribute('aria-invalid', 'true');
      listB.setAttribute('aria-invalid', 'true');
      setSetStatus('请至少输入一个列表。', 'error');
      listA.focus();
      return;
    }

    try {
      const lines = performSetOperation(listA.value, listB.value, setOperation.value, {
        caseSensitive: setCaseSensitive.checked,
        removeEmpty: setRemoveEmpty.checked,
        trim: setTrim.checked,
      });
      setResult.value = joinLines(lines);
      setResultCount.textContent = `${lines.length} 行`;
      hasSetResult = true;
      copySetResult.disabled = lines.length === 0;
      downloadSetResult.disabled = lines.length === 0;
      const label = OPERATION_LABELS[setOperation.value] || '集合运算';
      setSetStatus(
        lines.length ? `${label}计算完成，共 ${lines.length} 行。` : `${label}计算完成，结果为空。`,
        'success',
      );
    } catch (error) {
      resetSetOutput();
      setSetStatus(error.message || '集合运算失败，请检查输入。', 'error');
    }
  };

  const downloadText = (value, filename, successMessage) => {
    if (value === null || value === undefined) return;
    const blob = new Blob(['\uFEFF', value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    window.Toolbox.showToast(successMessage);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectMode(tab.dataset.mode));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      selectMode(tabs[nextIndex].dataset.mode, true);
    });
  });

  sourceList.addEventListener('input', () => {
    sourceList.removeAttribute('aria-invalid');
    updateRawCounts();
    invalidateOrganizeOutput();
  });
  sourceList.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      runOrganizer();
    }
  });

  [trimLines, removeEmpty, deduplicate, caseSensitive, sortMode, caseTransform, linePrefix, lineSuffix]
    .forEach(control => control.addEventListener('change', invalidateOrganizeOutput));
  [linePrefix, lineSuffix].forEach(control => control.addEventListener('input', invalidateOrganizeOutput));

  organizeButton.addEventListener('click', runOrganizer);
  clearOrganizer.addEventListener('click', () => {
    sourceList.value = '';
    sourceList.removeAttribute('aria-invalid');
    resetOrganizeOutput();
    updateRawCounts();
    setOrganizeStatus('内容已清空。');
    sourceList.focus();
  });
  copyOrganizeResult.addEventListener('click', () => {
    if (hasOrganizeResult) window.Toolbox.copyText(organizeResult.value, '整理结果已复制');
  });
  downloadOrganizeResult.addEventListener('click', () => {
    downloadText(organizeResult.value, 'text-list-organized.txt', '整理结果已下载');
  });

  [listA, listB].forEach(input => {
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      updateRawCounts();
      invalidateSetOutput();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        runSetOperation();
      }
    });
  });
  [setOperation, setTrim, setRemoveEmpty, setCaseSensitive]
    .forEach(control => control.addEventListener('change', invalidateSetOutput));

  swapLists.addEventListener('click', () => {
    const previousA = listA.value;
    listA.value = listB.value;
    listB.value = previousA;
    listA.removeAttribute('aria-invalid');
    listB.removeAttribute('aria-invalid');
    updateRawCounts();
    resetSetOutput();
    setSetStatus('列表 A 与列表 B 已交换，请重新计算。');
  });
  calculateSet.addEventListener('click', runSetOperation);
  clearSets.addEventListener('click', () => {
    listA.value = '';
    listB.value = '';
    listA.removeAttribute('aria-invalid');
    listB.removeAttribute('aria-invalid');
    resetSetOutput();
    updateRawCounts();
    setSetStatus('两个列表已清空。');
    listA.focus();
  });
  copySetResult.addEventListener('click', () => {
    if (hasSetResult) window.Toolbox.copyText(setResult.value, '集合运算结果已复制');
  });
  downloadSetResult.addEventListener('click', () => {
    downloadText(setResult.value, 'text-list-set-result.txt', '集合运算结果已下载');
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey)) return;
    if (event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    if (activeMode === 'organize') runOrganizer();
    else runSetOperation();
  });

  updateRawCounts();
})();
