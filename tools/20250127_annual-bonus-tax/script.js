function calculatePostTax(preTaxAmount) {
  const monthlyAmount = preTaxAmount / 12;
  let taxRate;
  let quickDeduction;

  if (monthlyAmount <= 3000) {
    taxRate = 0.03;
    quickDeduction = 0;
  } else if (monthlyAmount <= 12000) {
    taxRate = 0.10;
    quickDeduction = 210;
  } else if (monthlyAmount <= 25000) {
    taxRate = 0.20;
    quickDeduction = 1410;
  } else if (monthlyAmount <= 35000) {
    taxRate = 0.25;
    quickDeduction = 2660;
  } else if (monthlyAmount <= 55000) {
    taxRate = 0.30;
    quickDeduction = 4410;
  } else if (monthlyAmount <= 80000) {
    taxRate = 0.35;
    quickDeduction = 7160;
  } else {
    taxRate = 0.45;
    quickDeduction = 15160;
  }

  const tax = preTaxAmount * taxRate - quickDeduction;
  const postTaxAmount = preTaxAmount - tax;
  return postTaxAmount;
}

function calculatePreTax(postTaxAmount) {
  let monthlyAmount = postTaxAmount / 12;
  let taxRate;
  let quickDeduction;

  while (true) {
    if (monthlyAmount <= 3000) {
      taxRate = 0.03;
      quickDeduction = 0;
    } else if (monthlyAmount <= 12000) {
      taxRate = 0.10;
      quickDeduction = 210;
    } else if (monthlyAmount <= 25000) {
      taxRate = 0.20;
      quickDeduction = 1410;
    } else if (monthlyAmount <= 35000) {
      taxRate = 0.25;
      quickDeduction = 2660;
    } else if (monthlyAmount <= 55000) {
      taxRate = 0.30;
      quickDeduction = 4410;
    } else if (monthlyAmount <= 80000) {
      taxRate = 0.35;
      quickDeduction = 7160;
    } else {
      taxRate = 0.45;
      quickDeduction = 15160;
    }

    const preTaxAmount = (postTaxAmount - quickDeduction) / (1 - taxRate);
    const postTaxResult = calculatePostTax(preTaxAmount);

    if (postTaxAmount === postTaxResult || Math.abs(postTaxAmount - postTaxResult) < 1) {
      return preTaxAmount;
    }

    if (monthlyAmount > 80000) {
      return '计算失败';
    }

    monthlyAmount += 3000;
  }
}

(() => {
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

  const renderResult = (preTaxAmount, postTaxAmount, sourceType) => {
    const taxAmount = preTaxAmount - postTaxAmount;

    preTaxResult.textContent = formatCurrency(preTaxAmount);
    postTaxResult.textContent = formatCurrency(postTaxAmount);
    taxResult.textContent = formatCurrency(taxAmount);
    resultNote.textContent = sourceType === 'preTax'
      ? '以上结果由税前金额按单独计税公式计算。'
      : '以上税前金额由税后金额反推，可能存在小于 1 元的算法误差。';
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

    if (inputType.value === 'preTax') {
      preTaxAmount = inputAmount;
      postTaxAmount = calculatePostTax(inputAmount);
    } else {
      postTaxAmount = inputAmount;
      preTaxAmount = calculatePreTax(inputAmount);
    }

    if (!Number.isFinite(preTaxAmount) || !Number.isFinite(postTaxAmount)) {
      showError('当前金额无法完成反推，请核对输入类型和金额后重试。');
      return;
    }

    renderResult(preTaxAmount, postTaxAmount, inputType.value);
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
