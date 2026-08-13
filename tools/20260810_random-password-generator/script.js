(() => {
  'use strict';

  const { DEFAULT_EXCLUDED, generatePasswords } = window.PasswordGeneratorCore;
  const form = document.getElementById('passwordForm');
  const groupInputs = [...document.querySelectorAll('input[name="characterGroup"]')];
  const passwordCount = document.getElementById('passwordCount');
  const minLength = document.getElementById('minLength');
  const maxLength = document.getElementById('maxLength');
  const includeCharacters = document.getElementById('includeCharacters');
  const excludeCharacters = document.getElementById('excludeCharacters');
  const generateButton = document.getElementById('generatePasswords');
  const resetButton = document.getElementById('resetSettings');
  const parameterSummary = document.getElementById('parameterSummary');
  const formStatus = document.getElementById('formStatus');
  const resultCount = document.getElementById('resultCount');
  const emptyState = document.getElementById('emptyState');
  const passwordList = document.getElementById('passwordList');
  const copyAll = document.getElementById('copyAll');

  let latestPasswords = [];

  const setStatus = (message, type = '') => {
    formStatus.textContent = message;
    formStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const clearInvalidState = () => {
    [passwordCount, minLength, maxLength, includeCharacters, excludeCharacters]
      .forEach(input => input.removeAttribute('aria-invalid'));
  };

  const getOptions = () => ({
    groups: groupInputs.filter(input => input.checked).map(input => input.value),
    count: passwordCount.value,
    minLength: minLength.value,
    maxLength: maxLength.value,
    includeCharacters: includeCharacters.value,
    excludeCharacters: excludeCharacters.value,
  });

  const updateSummary = () => {
    const count = passwordCount.value || '0';
    const minimum = minLength.value || '0';
    const maximum = maxLength.value.trim();
    parameterSummary.textContent = `${count} 个 · ${maximum ? `${minimum}–${maximum}` : minimum} 位`;
  };

  const renderPasswords = (passwords) => {
    latestPasswords = passwords;
    passwordList.replaceChildren();

    passwords.forEach((password, index) => {
      const item = document.createElement('li');
      item.className = 'password-item';

      const number = document.createElement('span');
      number.className = 'password-index';
      number.textContent = String(index + 1).padStart(2, '0');

      const value = document.createElement('code');
      value.className = 'password-value';
      value.textContent = password;

      const meta = document.createElement('span');
      meta.className = 'password-meta';
      meta.textContent = `${[...password].length} 位`;

      const copy = document.createElement('button');
      copy.className = 'copy-password';
      copy.type = 'button';
      copy.textContent = '复制';
      copy.dataset.passwordIndex = String(index);
      copy.setAttribute('aria-label', `复制第 ${index + 1} 个密码`);

      item.append(number, value, meta, copy);
      passwordList.append(item);
    });

    passwordList.hidden = passwords.length === 0;
    emptyState.hidden = passwords.length > 0;
    resultCount.textContent = `${passwords.length} 个`;
    copyAll.disabled = passwords.length === 0;
  };

  const markLikelyInvalidInput = (message) => {
    if (message.includes('生成数量')) passwordCount.setAttribute('aria-invalid', 'true');
    if (message.includes('密码长度')) minLength.setAttribute('aria-invalid', 'true');
    if (message.includes('最大密码长度')) maxLength.setAttribute('aria-invalid', 'true');
    if (message.includes('包含字符和排除字符')) {
      includeCharacters.setAttribute('aria-invalid', 'true');
      excludeCharacters.setAttribute('aria-invalid', 'true');
    }
  };

  const generate = () => {
    clearInvalidState();
    try {
      const passwords = generatePasswords(getOptions(), window.crypto);
      renderPasswords(passwords);
      setStatus(`已生成 ${passwords.length} 个随机密码。`, 'success');
    } catch (error) {
      renderPasswords([]);
      markLikelyInvalidInput(error.message);
      setStatus(error.message || '生成失败，请检查参数。', 'error');
    }
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    generate();
  });

  form.addEventListener('input', () => {
    clearInvalidState();
    updateSummary();
  });

  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      generate();
    }
  });

  resetButton.addEventListener('click', () => {
    groupInputs.forEach(input => {
      input.checked = input.value !== 'symbols';
    });
    passwordCount.value = '1';
    minLength.value = '20';
    maxLength.value = '';
    includeCharacters.value = '';
    excludeCharacters.value = DEFAULT_EXCLUDED;
    clearInvalidState();
    updateSummary();
    generate();
    window.Toolbox.showToast('已恢复默认参数');
  });

  passwordList.addEventListener('click', event => {
    const button = event.target.closest('[data-password-index]');
    if (!button) return;
    const password = latestPasswords[Number(button.dataset.passwordIndex)];
    if (password !== undefined) {
      window.Toolbox.copyText(password, '密码已复制');
    }
  });

  copyAll.addEventListener('click', () => {
    if (!latestPasswords.length) {
      window.Toolbox.showToast('没有可复制的密码');
      return;
    }
    window.Toolbox.copyText(latestPasswords.join('\n'), `已复制 ${latestPasswords.length} 个密码`);
  });

  if (!window.crypto?.getRandomValues) {
    generateButton.disabled = true;
    setStatus('当前浏览器不支持安全随机数，无法生成密码。', 'error');
  } else {
    updateSummary();
    generate();
  }
})();
