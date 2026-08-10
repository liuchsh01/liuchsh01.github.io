(() => {
  const formulas = document.getElementById('formulas');
  const calculate = document.getElementById('calculate');
  const formulaCount = document.getElementById('formulaCount');
  const resultList = document.getElementById('resultList');
  const emptyState = document.getElementById('emptyState');
  const percentToggle = document.getElementById('percentToggle');
  const copyAll = document.getElementById('copyAll');
  let latestResults = [];
  let showPercent = false;

  const updateLineCount = () => {
    const lines = formulas.value.split(/\r?\n/).filter(line => line.trim()).length;
    formulaCount.textContent = `${lines} 行`;
  };

  // Tokenizer + recursive descent parser: only arithmetic tokens are accepted.
  const evaluate = (source) => {
    const text = source.replace(/\s+/g, '').replace(/=$/, '');
    if (!text) throw new Error('公式为空');

    const tokens = [];
    let position = 0;
    while (position < text.length) {
      const rest = text.slice(position);
      const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
      if (number) {
        tokens.push({ type: 'number', value: Number(number[0]) });
        position += number[0].length;
        continue;
      }

      const char = text[position];
      if ('+-*/()%'.includes(char)) {
        tokens.push({ type: char });
        position += 1;
        continue;
      }

      throw new Error(`不支持的字符：${char}`);
    }

    let index = 0;
    const peek = () => tokens[index]?.type;
    const take = () => tokens[index++];

    const primary = () => {
      if (peek() === '+') {
        take();
        return primary();
      }
      if (peek() === '-') {
        take();
        return -primary();
      }

      let value;
      if (peek() === '(') {
        take();
        value = expression();
        if (peek() !== ')') throw new Error('缺少右括号');
        take();
      } else {
        if (peek() !== 'number') throw new Error('需要数字或左括号');
        value = take().value;
      }

      while (peek() === '%') {
        take();
        value /= 100;
      }
      return value;
    };

    const term = () => {
      let value = primary();
      while (peek() === '*' || peek() === '/') {
        const operator = take().type;
        const right = primary();
        if (operator === '/' && right === 0) throw new Error('不能除以 0');
        value = operator === '*' ? value * right : value / right;
      }
      return value;
    };

    const expression = () => {
      let value = term();
      while (peek() === '+' || peek() === '-') {
        const operator = take().type;
        const right = term();
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    };

    const result = expression();
    if (index < tokens.length) throw new Error('公式格式不正确');
    if (!Number.isFinite(result)) throw new Error('计算结果无效');
    return result;
  };

  const formatNumber = (value) => {
    if (Object.is(value, -0)) return '0';
    const formatted = Number(value.toPrecision(10));
    return Math.abs(formatted) >= 1e10 || (Math.abs(formatted) > 0 && Math.abs(formatted) < 1e-6)
      ? formatted.toExponential(9).replace(/\.?(0+)(e)/, '$2')
      : String(formatted);
  };

  const formatPercent = (value) => {
    const scaled = value * 100;
    if (Number.isFinite(scaled)) return `${formatNumber(scaled)}%`;

    const [coefficient, exponentText] = value.toExponential(9).split('e');
    const normalizedCoefficient = coefficient.replace(/\.?0+$/, '');
    const shiftedExponent = Number(exponentText) + 2;
    const exponentSign = shiftedExponent >= 0 ? '+' : '';
    return `${normalizedCoefficient}e${exponentSign}${shiftedExponent}%`;
  };

  const formatResult = (value) => showPercent ? formatPercent(value) : formatNumber(value);

  const render = () => {
    const lines = formulas.value.split(/\r?\n/);
    latestResults = lines
      .map((line, lineIndex) => ({ line: line.trim(), lineIndex }))
      .filter(item => item.line)
      .map(item => {
        try {
          return { ...item, value: evaluate(item.line), error: false };
        } catch (error) {
          return { ...item, answer: error.message, error: true };
        }
      })
      .map(item => item.error ? item : { ...item, answer: formatResult(item.value) });

    emptyState.hidden = latestResults.length > 0;
    resultList.hidden = latestResults.length === 0;
    copyAll.disabled = !latestResults.some(item => !item.error);
    resultList.replaceChildren();

    latestResults.forEach((item) => {
      const row = document.createElement('div');
      row.className = `result-row${item.error ? ' error' : ''}`;

      const lineNumber = document.createElement('span');
      lineNumber.className = 'line-number';
      lineNumber.textContent = item.lineIndex + 1;

      const answer = document.createElement('code');
      answer.className = 'answer';
      answer.textContent = item.answer;
      answer.title = item.line;

      const copy = document.createElement('button');
      copy.className = 'copy-one';
      copy.type = 'button';
      copy.textContent = '复制';
      copy.setAttribute('aria-label', `复制第 ${item.lineIndex + 1} 行结果`);
      copy.disabled = item.error;
      if (!item.error) {
        copy.addEventListener('click', () => {
          window.Toolbox.copyText(item.answer, '结果已复制');
        });
      }

      row.append(lineNumber, answer, copy);
      resultList.append(row);
    });
  };

  calculate.addEventListener('click', render);
  formulas.addEventListener('input', updateLineCount);
  formulas.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      render();
    }
  });

  copyAll.addEventListener('click', () => {
    const values = latestResults.filter(item => !item.error).map(item => item.answer);
    if (!values.length) {
      window.Toolbox.showToast('没有可复制的结果');
      return;
    }
    window.Toolbox.copyText(values.join('\n'), `已复制 ${values.length} 条结果`);
  });

  percentToggle.addEventListener('click', () => {
    showPercent = !showPercent;
    percentToggle.setAttribute('aria-pressed', String(showPercent));
    percentToggle.textContent = showPercent ? '显示小数' : '转为百分数';
    render();
  });

  updateLineCount();
  render();
})();
