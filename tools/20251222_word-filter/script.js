function getBaseForm(word) {
  const variations = new Set();
  variations.add(word);

  if (word.endsWith('s') && word.length > 3) {
    variations.add(word.slice(0, -1));
  }

  if (word.endsWith('es') && word.length > 4) {
    variations.add(word.slice(0, -2));
  }

  if (word.endsWith('ies') && word.length > 4) {
    variations.add(`${word.slice(0, -3)}y`);
  }

  if (word.endsWith('ed') && word.length > 4) {
    const base = word.slice(0, -2);
    variations.add(base);

    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      variations.add(base.slice(0, -1));
    }
  }

  if (word.endsWith('ied') && word.length > 4) {
    variations.add(`${word.slice(0, -3)}y`);
  }

  return Array.from(variations);
}

function checkCriteria(word, length, mustInclude, mustExclude) {
  if (word.length !== length) return false;

  for (const character of mustInclude) {
    if (!word.includes(character)) return false;
  }

  for (const character of mustExclude) {
    if (word.includes(character)) return false;
  }

  return true;
}

(() => {
  const form = document.getElementById('filterForm');
  const sourceText = document.getElementById('sourceText');
  const wordLength = document.getElementById('wordLength');
  const mustIncludeInput = document.getElementById('mustInclude');
  const mustExcludeInput = document.getElementById('mustExclude');
  const enableStemming = document.getElementById('enableStemming');
  const filterMessage = document.getElementById('filterMessage');
  const countBadge = document.getElementById('countBadge');
  const resultSummary = document.getElementById('resultSummary');
  const resultContainer = document.getElementById('resultContainer');

  const setInvalid = (element, invalid) => {
    if (invalid) {
      element.setAttribute('aria-invalid', 'true');
    } else {
      element.removeAttribute('aria-invalid');
    }
  };

  const clearMessage = () => {
    filterMessage.textContent = '';
    filterMessage.hidden = true;
    setInvalid(sourceText, false);
    setInvalid(wordLength, false);
  };

  const createEmptyState = (message) => {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = message;
    return emptyState;
  };

  const resetResults = () => {
    countBadge.textContent = '0 个';
    resultSummary.textContent = '';
    resultContainer.replaceChildren(createEmptyState('请先修正输入条件'));
  };

  const showError = (message, element) => {
    resetResults();
    filterMessage.textContent = message;
    filterMessage.hidden = false;
    setInvalid(element, true);
    element.focus();
  };

  const renderResults = (results, sourceWordCount, emptyMessage = '没有找到符合条件的单词') => {
    const sortedResults = [...results].sort((a, b) => a.original.localeCompare(b.original));
    countBadge.textContent = `${sortedResults.length} 个`;
    resultSummary.textContent = `已检查 ${sourceWordCount} 个不重复源词，找到 ${sortedResults.length} 个结果。`;
    resultContainer.replaceChildren();

    if (sortedResults.length === 0) {
      resultContainer.append(createEmptyState(emptyMessage));
      return;
    }

    sortedResults.forEach((item) => {
      const tag = document.createElement('div');
      tag.className = 'word-tag';

      const mainText = document.createElement('span');
      mainText.textContent = item.original;
      tag.append(mainText);

      if (item.isVariation) {
        const subText = document.createElement('span');
        subText.className = 'sub-info';
        subText.textContent = `匹配词根：${item.matched}`;
        tag.append(subText);
      }

      resultContainer.append(tag);
    });
  };

  const processText = () => {
    clearMessage();
    const rawText = sourceText.value;
    const rawLength = wordLength.value.trim();

    if (!rawText.trim()) {
      showError('请输入要筛选的英文文本或单词列表。', sourceText);
      return;
    }

    if (!rawLength) {
      showError('请输入目标单词长度，例如 5。', wordLength);
      return;
    }

    const targetLength = Number(rawLength);
    if (!Number.isInteger(targetLength) || targetLength < 1) {
      showError('目标单词长度必须是大于 0 的整数。', wordLength);
      return;
    }

    const mustInclude = mustIncludeInput.value
      .toLowerCase()
      .split('')
      .filter((character) => character.trim() !== '');
    const mustExclude = mustExcludeInput.value
      .toLowerCase()
      .split('')
      .filter((character) => character.trim() !== '');
    const words = rawText.match(/[a-zA-Z]+/g);

    if (!words) {
      renderResults([], 0, '源文本中没有可识别的英文单词');
      return;
    }

    const uniqueSourceWords = [...new Set(words.map((word) => word.toLowerCase()))];
    const finalResults = [];

    uniqueSourceWords.forEach((originalWord) => {
      const variations = enableStemming.checked ? getBaseForm(originalWord) : [originalWord];

      for (const formVariation of variations) {
        if (checkCriteria(formVariation, targetLength, mustInclude, mustExclude)) {
          finalResults.push({
            original: originalWord,
            matched: formVariation,
            isVariation: originalWord !== formVariation
          });
          break;
        }
      }
    });

    renderResults(finalResults, uniqueSourceWords.length);
    if (window.Toolbox && typeof window.Toolbox.showToast === 'function') {
      window.Toolbox.showToast(`筛选完成：${finalResults.length} 个结果`);
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    processText();
  });

  sourceText.addEventListener('input', clearMessage);
  wordLength.addEventListener('input', clearMessage);
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      processText();
    }
  });
})();
