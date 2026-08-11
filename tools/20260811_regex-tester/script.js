(() => {
  'use strict';

  const { collectMatches, replaceMatches } = window.RegexTesterCore;
  const form = document.getElementById('regexForm');
  const patternInput = document.getElementById('patternInput');
  const patternControl = patternInput.closest('.pattern-control');
  const flagInputs = [...document.querySelectorAll('input[name="regexFlag"]')];
  const testText = document.getElementById('testText');
  const replacementInput = document.getElementById('replacementInput');
  const clearAll = document.getElementById('clearAll');
  const textCount = document.getElementById('textCount');
  const regexStatus = document.getElementById('regexStatus');
  const matchSummary = document.getElementById('matchSummary');
  const highlightOutput = document.getElementById('highlightOutput');
  const previewEmpty = document.getElementById('previewEmpty');
  const matchList = document.getElementById('matchList');
  const detailsEmpty = document.getElementById('detailsEmpty');
  const replacementOutput = document.getElementById('replacementOutput');
  const replaceEmpty = document.getElementById('replaceEmpty');
  const copyReplacement = document.getElementById('copyReplacement');
  const resultTabs = [...document.querySelectorAll('[role="tab"][data-view]')];
  const resultPanels = [...document.querySelectorAll('[role="tabpanel"]')];

  const MAX_TEXT_LENGTH = 500_000;
  const MAX_MATCHES = 1000;
  const MAX_DISPLAY_MATCHES = 200;
  let activeView = 'preview';
  let latestReplacement = '';
  let hasValidResult = false;
  let updateTimer;

  const selectedFlags = () => flagInputs
    .filter(input => input.checked)
    .map(input => input.value)
    .join('');

  const setStatus = (message, type = '') => {
    regexStatus.textContent = message;
    regexStatus.className = 'status' + (type ? ' is-' + type : '');
  };

  const setSummary = (message, type = '') => {
    matchSummary.textContent = message;
    matchSummary.className = 'match-summary' + (type ? ' ' + type : '');
  };

  const clearRenderedResults = () => {
    highlightOutput.replaceChildren();
    matchList.replaceChildren();
    replacementOutput.textContent = '';
    highlightOutput.hidden = true;
    matchList.hidden = true;
    replacementOutput.hidden = true;
    previewEmpty.hidden = false;
    detailsEmpty.hidden = false;
    replaceEmpty.hidden = false;
    copyReplacement.disabled = true;
    latestReplacement = '';
    hasValidResult = false;
  };

  const createZeroWidthMarker = (position) => {
    const marker = document.createElement('span');
    marker.className = 'zero-width-marker';
    marker.setAttribute('aria-label', '索引 ' + position + ' 的零宽匹配');
    marker.title = '零宽匹配 · 索引 ' + position;
    return marker;
  };

  const renderHighlight = (text, matches) => {
    const fragment = document.createDocumentFragment();
    let cursor = 0;

    matches.forEach((match, index) => {
      if (match.index < cursor) return;
      fragment.append(document.createTextNode(text.slice(cursor, match.index)));

      if (match.value === '') {
        fragment.append(createZeroWidthMarker(match.index));
      } else {
        const mark = document.createElement('mark');
        mark.className = 'regex-match';
        mark.textContent = match.value;
        mark.title = '匹配 #' + (index + 1) + ' · 索引 ' + match.index + '–' + match.end;
        fragment.append(mark);
        cursor = match.end;
      }
    });

    fragment.append(document.createTextNode(text.slice(cursor)));
    highlightOutput.replaceChildren(fragment);
    previewEmpty.hidden = true;
    highlightOutput.hidden = false;
  };

  const appendCaptureRow = (list, label, value) => {
    const row = document.createElement('div');
    row.className = 'capture-row';
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value === undefined ? '未参与匹配' : value === '' ? '（空字符串）' : value;
    row.append(term, description);
    list.append(row);
  };

  const createMatchCard = (match, index) => {
    const item = document.createElement('li');
    item.className = 'match-card';

    const head = document.createElement('div');
    head.className = 'match-card-head';
    const number = document.createElement('span');
    number.className = 'match-number';
    number.textContent = '匹配 #' + (index + 1);
    const range = document.createElement('span');
    range.className = 'match-range';
    range.textContent = match.index + '–' + match.end;
    head.append(number, range);

    const value = document.createElement('code');
    value.className = 'match-value';
    value.textContent = match.value === '' ? '（零宽匹配）' : match.value;
    item.append(head, value);

    if (match.captures.length || match.namedGroups.length) {
      const captures = document.createElement('dl');
      captures.className = 'capture-list';
      match.captures.forEach(capture => appendCaptureRow(captures, '$' + capture.index, capture.value));
      match.namedGroups.forEach(group => appendCaptureRow(captures, '$<' + group.name + '>', group.value));
      item.append(captures);
    } else {
      const empty = document.createElement('p');
      empty.className = 'capture-empty';
      empty.textContent = '该匹配没有捕获组。';
      item.append(empty);
    }

    return item;
  };

  const renderMatchDetails = (matches) => {
    const fragment = document.createDocumentFragment();
    matches.slice(0, MAX_DISPLAY_MATCHES).forEach((match, index) => {
      fragment.append(createMatchCard(match, index));
    });

    if (matches.length > MAX_DISPLAY_MATCHES) {
      const notice = document.createElement('li');
      notice.className = 'match-limit-notice';
      notice.textContent = '为保持页面流畅，仅展示前 ' + MAX_DISPLAY_MATCHES + ' 条匹配详情。';
      fragment.append(notice);
    }

    matchList.replaceChildren(fragment);
    detailsEmpty.hidden = matches.length > 0;
    matchList.hidden = matches.length === 0;
    if (!matches.length) detailsEmpty.textContent = '表达式有效，但没有找到匹配内容。';
  };

  const renderReplacement = (value) => {
    latestReplacement = value;
    replacementOutput.textContent = value;
    replaceEmpty.hidden = true;
    replacementOutput.hidden = false;
    copyReplacement.disabled = false;
  };

  const runTest = () => {
    window.clearTimeout(updateTimer);
    patternInput.removeAttribute('aria-invalid');
    patternControl.classList.remove('has-error');
    textCount.textContent = testText.value.length.toLocaleString('zh-CN') + ' 字符';

    if (!patternInput.value) {
      clearRenderedResults();
      setSummary('等待表达式');
      setStatus('请输入正则表达式。');
      return;
    }

    if (testText.value.length > MAX_TEXT_LENGTH) {
      clearRenderedResults();
      testText.setAttribute('aria-invalid', 'true');
      setSummary('文本过长', 'has-error');
      setStatus('测试文本超过 50 万字符，请拆分后再测试。', 'error');
      return;
    }

    testText.removeAttribute('aria-invalid');

    try {
      const flags = selectedFlags();
      const result = collectMatches(patternInput.value, testText.value, flags, MAX_MATCHES);
      const replacement = replaceMatches(patternInput.value, testText.value, flags, replacementInput.value);
      hasValidResult = true;
      renderHighlight(testText.value, result.matches);
      renderMatchDetails(result.matches);
      renderReplacement(replacement);

      const countLabel = result.matches.length.toLocaleString('zh-CN') + (result.truncated ? '+' : '') + ' 个匹配';
      setSummary(countLabel, result.matches.length ? 'has-matches' : '');
      setStatus(
        result.truncated
          ? '正则表达式有效。匹配超过 ' + MAX_MATCHES + ' 个，结果已截断以保持页面流畅。'
          : result.matches.length
            ? '正则表达式有效，已找到 ' + result.matches.length.toLocaleString('zh-CN') + ' 个匹配。'
            : '正则表达式有效，但没有找到匹配内容。',
        result.matches.length ? 'success' : '',
      );
    } catch (error) {
      clearRenderedResults();
      patternInput.setAttribute('aria-invalid', 'true');
      patternControl.classList.add('has-error');
      setSummary('表达式错误', 'has-error');
      setStatus('正则表达式无法解析：' + error.message, 'error');
    }
  };

  const scheduleTest = () => {
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(runTest, 220);
  };

  const activateView = (view, focusTab = false) => {
    activeView = view;
    resultTabs.forEach(tab => {
      const selected = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
    resultPanels.forEach(panel => {
      panel.hidden = panel.id !== view + 'Panel';
    });
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    runTest();
  });

  [patternInput, testText, replacementInput].forEach(input => {
    input.addEventListener('input', scheduleTest);
  });
  flagInputs.forEach(input => input.addEventListener('change', runTest));

  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      runTest();
    }
  });

  clearAll.addEventListener('click', () => {
    patternInput.value = '';
    testText.value = '';
    replacementInput.value = '';
    flagInputs.forEach(input => { input.checked = input.value === 'g'; });
    textCount.textContent = '0 字符';
    patternInput.removeAttribute('aria-invalid');
    testText.removeAttribute('aria-invalid');
    patternControl.classList.remove('has-error');
    clearRenderedResults();
    setSummary('等待测试');
    setStatus('表达式、文本和结果已清空。');
    patternInput.focus();
  });

  copyReplacement.addEventListener('click', () => {
    if (!hasValidResult) {
      window.Toolbox.showToast('没有可复制的替换结果');
      return;
    }
    window.Toolbox.copyText(latestReplacement, '替换结果已复制');
  });

  resultTabs.forEach(tab => {
    tab.addEventListener('click', () => activateView(tab.dataset.view));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = resultTabs.indexOf(tab);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % resultTabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + resultTabs.length) % resultTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = resultTabs.length - 1;
      activateView(resultTabs[nextIndex].dataset.view, true);
    });
  });

  activateView(activeView);
  runTest();
})();
