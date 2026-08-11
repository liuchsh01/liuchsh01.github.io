(() => {
  'use strict';

  const { compareTexts, splitLines } = window.TextDiffCore;
  const leftText = document.getElementById('leftText');
  const rightText = document.getElementById('rightText');
  const leftCount = document.getElementById('leftCount');
  const rightCount = document.getElementById('rightCount');
  const ignoreWhitespace = document.getElementById('ignoreWhitespace');
  const ignoreCase = document.getElementById('ignoreCase');
  const compareButton = document.getElementById('compareTexts');
  const swapButton = document.getElementById('swapTexts');
  const clearButton = document.getElementById('clearTexts');
  const copyDiff = document.getElementById('copyDiff');
  const compareStatus = document.getElementById('compareStatus');
  const resultSummary = document.getElementById('resultSummary');
  const diffStats = document.getElementById('diffStats');
  const changedCount = document.getElementById('changedCount');
  const addedCount = document.getElementById('addedCount');
  const deletedCount = document.getElementById('deletedCount');
  const equalCount = document.getElementById('equalCount');
  const emptyState = document.getElementById('emptyState');
  const diffScroll = document.getElementById('diffScroll');
  const diffBody = document.getElementById('diffBody');

  const MAX_CHARACTERS_PER_SIDE = 500_000;
  const MAX_TOTAL_LINES = 2_000;
  const statusSymbols = {
    equal: { symbol: '', label: '相同' },
    changed: { symbol: '±', label: '修改' },
    added: { symbol: '+', label: '新增' },
    deleted: { symbol: '−', label: '删除' },
  };
  let latestUnifiedDiff = '';
  let hasResult = false;

  const formatCount = value => `${splitLines(value).length.toLocaleString('zh-CN')} 行 · ${value.length.toLocaleString('zh-CN')} 字符`;

  const updateInputCounts = () => {
    leftCount.textContent = formatCount(leftText.value);
    rightCount.textContent = formatCount(rightText.value);
  };

  const setStatus = (message, type = '') => {
    compareStatus.textContent = message;
    compareStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const resetInputValidity = () => {
    leftText.removeAttribute('aria-invalid');
    rightText.removeAttribute('aria-invalid');
  };

  const clearResults = () => {
    hasResult = false;
    latestUnifiedDiff = '';
    diffBody.replaceChildren();
    diffStats.hidden = true;
    emptyState.hidden = false;
    diffScroll.hidden = true;
    resultSummary.textContent = '等待对比';
    copyDiff.disabled = true;
  };

  const makeCell = className => {
    const cell = document.createElement('td');
    cell.className = className;
    return cell;
  };

  const appendSegments = (cell, segments, text, missing) => {
    const code = document.createElement('code');
    code.className = 'diff-code';

    if (!missing && text === '') {
      const marker = document.createElement('span');
      marker.className = 'empty-line-marker';
      marker.textContent = '空行';
      code.append(marker);
    } else {
      segments.forEach(segment => {
        const span = document.createElement('span');
        span.className = segment.type === 'added'
          ? 'inline-added'
          : segment.type === 'deleted'
            ? 'inline-deleted'
            : '';
        span.textContent = segment.text;
        code.append(span);
      });
    }

    cell.append(code);
  };

  const renderRow = row => {
    const tableRow = document.createElement('tr');
    const kind = statusSymbols[row.status];
    tableRow.className = `diff-row-${row.status}`;

    const kindCell = makeCell('diff-kind');
    kindCell.textContent = kind.symbol;
    kindCell.setAttribute('aria-label', kind.label);

    const leftLineCell = makeCell('diff-line-number');
    leftLineCell.textContent = row.leftLine ?? '';
    const leftTextCell = makeCell('diff-text-cell');
    appendSegments(leftTextCell, row.leftSegments, row.leftText, row.leftLine === null);

    const rightLineCell = makeCell('diff-line-number');
    rightLineCell.textContent = row.rightLine ?? '';
    const rightTextCell = makeCell('diff-text-cell');
    appendSegments(rightTextCell, row.rightSegments, row.rightText, row.rightLine === null);

    tableRow.append(kindCell, leftLineCell, leftTextCell, rightLineCell, rightTextCell);
    return tableRow;
  };

  const renderResult = result => {
    const fragment = document.createDocumentFragment();
    result.rows.forEach(row => fragment.append(renderRow(row)));
    diffBody.replaceChildren(fragment);

    changedCount.textContent = result.stats.changed.toLocaleString('zh-CN');
    addedCount.textContent = result.stats.added.toLocaleString('zh-CN');
    deletedCount.textContent = result.stats.deleted.toLocaleString('zh-CN');
    equalCount.textContent = result.stats.equal.toLocaleString('zh-CN');

    latestUnifiedDiff = result.unifiedDiff;
    hasResult = true;
    diffStats.hidden = false;
    emptyState.hidden = true;
    diffScroll.hidden = false;
    copyDiff.disabled = false;

    const differenceCount = result.stats.changed + result.stats.added + result.stats.deleted;
    if (result.hasDifferences) {
      resultSummary.textContent = `${differenceCount.toLocaleString('zh-CN')} 处差异 · ${result.rows.length.toLocaleString('zh-CN')} 行结果`;
      setStatus(`对比完成：发现 ${differenceCount.toLocaleString('zh-CN')} 处行级差异。`, 'success');
    } else {
      resultSummary.textContent = `内容一致 · ${result.rows.length.toLocaleString('zh-CN')} 行`;
      setStatus(
        ignoreWhitespace.checked || ignoreCase.checked
          ? '按当前忽略选项对比，两段文本没有差异。'
          : '两段文本完全一致。',
        'success',
      );
    }
  };

  const validateInputs = () => {
    resetInputValidity();
    const leftValue = leftText.value;
    const rightValue = rightText.value;

    if (leftValue === '' && rightValue === '') {
      leftText.setAttribute('aria-invalid', 'true');
      rightText.setAttribute('aria-invalid', 'true');
      return '请至少输入一侧文本后再开始对比。';
    }

    if (leftValue.length > MAX_CHARACTERS_PER_SIDE || rightValue.length > MAX_CHARACTERS_PER_SIDE) {
      if (leftValue.length > MAX_CHARACTERS_PER_SIDE) leftText.setAttribute('aria-invalid', 'true');
      if (rightValue.length > MAX_CHARACTERS_PER_SIDE) rightText.setAttribute('aria-invalid', 'true');
      return '单侧文本不能超过 50 万字符，请拆分后再对比。';
    }

    const totalLines = splitLines(leftValue).length + splitLines(rightValue).length;
    if (totalLines > MAX_TOTAL_LINES) {
      leftText.setAttribute('aria-invalid', 'true');
      rightText.setAttribute('aria-invalid', 'true');
      return '两侧文本合计不能超过 2,000 行，请拆分后再对比。';
    }

    return '';
  };

  const compare = () => {
    const validationMessage = validateInputs();

    if (validationMessage) {
      clearResults();
      setStatus(validationMessage, 'error');
      return;
    }

    compareButton.disabled = true;
    setStatus('正在计算差异……');

    window.setTimeout(() => {
      try {
        const result = compareTexts(leftText.value, rightText.value, {
          ignoreWhitespace: ignoreWhitespace.checked,
          ignoreCase: ignoreCase.checked,
        });
        renderResult(result);
      } catch (error) {
        clearResults();
        setStatus('对比失败，请缩短文本后重试。', 'error');
      } finally {
        compareButton.disabled = false;
      }
    }, 0);
  };

  const swapTexts = () => {
    const shouldRefresh = hasResult;
    const value = leftText.value;
    leftText.value = rightText.value;
    rightText.value = value;
    updateInputCounts();
    resetInputValidity();

    if (shouldRefresh) {
      compare();
    } else {
      setStatus('已交换两侧文本。');
    }
  };

  const clearTexts = () => {
    leftText.value = '';
    rightText.value = '';
    resetInputValidity();
    clearResults();
    updateInputCounts();
    setStatus('内容已清空，可以重新输入。');
    leftText.focus();
  };

  leftText.addEventListener('input', updateInputCounts);
  rightText.addEventListener('input', updateInputCounts);
  compareButton.addEventListener('click', compare);
  swapButton.addEventListener('click', swapTexts);
  clearButton.addEventListener('click', clearTexts);
  copyDiff.addEventListener('click', () => {
    if (latestUnifiedDiff) {
      window.Toolbox.copyText(latestUnifiedDiff, '差异文本已复制');
    }
  });

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      compare();
    }
  });

  updateInputCounts();
})();
