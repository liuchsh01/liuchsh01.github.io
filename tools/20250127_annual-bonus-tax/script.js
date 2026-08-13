(() => {
  const { calculatePostTax, calculatePreTaxCandidates } = window.AnnualBonusTaxCore;
  const form = document.getElementById('taxForm');
  const amountInput = document.getElementById('inputAmount');
  const inputType = document.getElementById('inputType');
  const formError = document.getElementById('formError');
  const resultEmpty = document.getElementById('resultEmpty');
  const resultContent = document.getElementById('resultContent');
  const resultBadge = document.getElementById('resultBadge');
  const preTaxResult = document.getElementById('preTaxResult');
  const postTaxResult = document.getElementById('postTaxResult');
  const taxResult = document.getElementById('taxResult');
  const resultNote = document.getElementById('resultNote');
  const alternativeResults = document.getElementById('alternativeResults');

  const currencyFormatter = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatCurrency = (value) => `${currencyFormatter.format(value)} 元`;

  const resetResult = () => {
    preTaxResult.textContent = '—';
    postTaxResult.textContent = '—';
    taxResult.textContent = '—';
    resultNote.textContent = '';
    alternativeResults.replaceChildren();
    alternativeResults.hidden = true;
    resultBadge.textContent = '等待输入';
    resultContent.hidden = true;
    resultEmpty.hidden = false;
  };

  const showError = (message) => {
    resetResult();
    formError.textContent = message;
    formError.hidden = false;
    amountInput.setAttribute('aria-invalid', 'true');
    resultBadge.textContent = '输入有误';
  };

  const clearError = () => {
    formError.textContent = '';
    formError.hidden = true;
    amountInput.removeAttribute('aria-invalid');
  };

  const renderAlternatives = (candidates, selectedCandidate, postTaxAmount) => {
    const alternatives = candidates.filter(candidate => Math.abs(candidate - selectedCandidate) >= 0.01);
    alternativeResults.replaceChildren();
    alternativeResults.hidden = alternatives.length === 0;

    if (!alternatives.length) return;

    const title = document.createElement('strong');
    title.textContent = '另有可能的税前金额';
    const list = document.createElement('ul');
    alternatives.forEach(candidate => {
      const item = document.createElement('li');
      item.textContent = `${formatCurrency(candidate)}（税额 ${formatCurrency(candidate - postTaxAmount)}）`;
      list.append(item);
    });
    alternativeResults.append(title, list);
  };

  const renderResult = (preTaxAmount, postTaxAmount, sourceType, candidates = []) => {
    const taxAmount = preTaxAmount - postTaxAmount;

    preTaxResult.textContent = formatCurrency(preTaxAmount);
    postTaxResult.textContent = formatCurrency(postTaxAmount);
    taxResult.textContent = formatCurrency(taxAmount);
    resultNote.textContent = sourceType === 'preTax'
      ? '以上结果由税前金额按单独计税公式计算。'
      : candidates.length > 1
        ? '税率跳档可能使同一税后金额对应多个税前金额；上方先展示税前金额较小的方案。'
        : '以上税前金额由税后金额反推，金额按分显示。';
    renderAlternatives(candidates, preTaxAmount, postTaxAmount);
    resultBadge.textContent = sourceType === 'preTax' ? '税前转税后' : '税后反推税前';
    resultEmpty.hidden = true;
    resultContent.hidden = false;
  };

  const calculate = () => {
    clearError();
    const rawAmount = amountInput.value.trim();

    if (!rawAmount) {
      showError('请输入年终奖金额，例如 100000。');
      amountInput.focus();
      return;
    }

    const inputAmount = Number(rawAmount);
    if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
      showError('金额必须是大于 0 的有效数字，请检查后重试。');
      amountInput.focus();
      return;
    }

    let preTaxAmount;
    let postTaxAmount;
    let preTaxCandidates = [];

    if (inputType.value === 'preTax') {
      preTaxAmount = inputAmount;
      postTaxAmount = calculatePostTax(inputAmount);
    } else {
      postTaxAmount = inputAmount;
      preTaxCandidates = calculatePreTaxCandidates(inputAmount);
      preTaxAmount = preTaxCandidates[0];
    }

    if (!Number.isFinite(preTaxAmount) || !Number.isFinite(postTaxAmount)) {
      showError('当前金额无法完成反推，请核对输入类型和金额后重试。');
      return;
    }

    renderResult(preTaxAmount, postTaxAmount, inputType.value, preTaxCandidates);
    if (window.Toolbox && typeof window.Toolbox.showToast === 'function') {
      window.Toolbox.showToast('计算完成');
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });

  amountInput.addEventListener('input', clearError);
  inputType.addEventListener('change', clearError);
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      calculate();
    }
  });
})();
