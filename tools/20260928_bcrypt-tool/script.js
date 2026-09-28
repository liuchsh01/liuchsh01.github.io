(() => {
  'use strict';

  const core = window.BcryptToolCore;
  const form = document.getElementById('bcryptForm');
  const modes = [...form.querySelectorAll('input[name="mode"]')];
  const passwordInput = document.getElementById('passwordInput');
  const togglePassword = document.getElementById('togglePassword');
  const byteCount = document.getElementById('byteCount');
  const costInput = document.getElementById('costInput');
  const hashInput = document.getElementById('hashInput');
  const generateFields = document.getElementById('generateFields');
  const verifyFields = document.getElementById('verifyFields');
  const runButton = document.getElementById('runButton');
  const cancelButton = document.getElementById('cancelButton');
  const clearButton = document.getElementById('clearButton');
  const formStatus = document.getElementById('formStatus');
  const emptyState = document.getElementById('emptyState');
  const resultDetails = document.getElementById('resultDetails');
  const resultOutput = document.getElementById('resultOutput');
  const outputLabel = document.getElementById('outputLabel');
  const resultMeta = document.getElementById('resultMeta');
  const copyResult = document.getElementById('copyResult');
  const useForVerify = document.getElementById('useForVerify');
  const progressPanel = document.getElementById('progressPanel');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');
  const progressHint = document.getElementById('progressHint');
  const controls = [...modes, passwordInput, togglePassword, costInput, hashInput, runButton, clearButton];
  const available = Boolean(core && window.bcrypt && window.TextEncoder);
  let nextId = 0;
  let activeJob = null;
  let workerAvailable = typeof window.Worker === 'function' && window.location.protocol !== 'file:';

  const getMode = () => modes.find(input => input.checked).value;

  const setStatus = (message, state = '') => {
    formStatus.textContent = message;
    formStatus.className = `status${state ? ` is-${state}` : ''}`;
  };

  const clearResult = () => {
    resultOutput.value = '';
    resultOutput.className = 'mono-input result-output';
    resultMeta.textContent = '';
    resultDetails.hidden = true;
    emptyState.hidden = false;
    copyResult.disabled = true;
    useForVerify.hidden = true;
  };

  const clearInvalid = () => {
    [passwordInput, costInput, hashInput].forEach(input => input.removeAttribute('aria-invalid'));
  };

  const updateByteCount = () => {
    if (window.TextEncoder) {
      byteCount.textContent = `${new TextEncoder().encode(passwordInput.value).length} / 72 字节`;
    }
  };

  const syncMode = () => {
    const generating = getMode() === 'generate';
    generateFields.hidden = !generating;
    verifyFields.hidden = generating;
    runButton.textContent = generating ? '生成 Hash' : '验证密码';
    outputLabel.textContent = generating ? 'Bcrypt Hash' : '验证结论';
    clearResult();
    clearInvalid();
    if (available) {
      setStatus(generating
        ? '输入密码后生成 Hash，每次会自动使用新的随机盐。'
        : '输入密码与完整 Hash 后验证；盐和 cost 从 Hash 自动读取。');
    }
  };

  const setBusy = (busy, cancellable = false) => {
    controls.forEach(control => { control.disabled = busy || !available; });
    cancelButton.hidden = !busy;
    cancelButton.disabled = !cancellable;
    progressPanel.hidden = !busy;
    if (busy) emptyState.hidden = true;
  };

  const releaseJob = job => {
    window.clearTimeout(job.startupTimer);
    if (job.worker) {
      job.worker.onmessage = null;
      job.worker.onerror = null;
      job.worker.onmessageerror = null;
      job.worker.terminate();
      job.worker = null;
    }
  };

  const finish = (job, result, error) => {
    if (activeJob !== job) return;
    releaseJob(job);
    activeJob = null;
    setBusy(false);
    if (error) {
      clearResult();
      setStatus(error, 'error');
      return;
    }
    const elapsed = ((performance.now() - job.startedAt) / 1000).toFixed(2);
    resultDetails.hidden = false;
    emptyState.hidden = true;
    if (job.mode === 'generate') {
      resultOutput.value = result.hash;
      resultMeta.textContent = `60 字符 · cost ${job.cost} · 随机盐 · 耗时 ${elapsed} 秒`;
      copyResult.disabled = false;
      useForVerify.hidden = false;
      setStatus('Hash 已生成，可复制保存或切换到验证。', 'success');
    } else {
      const matched = result.matched === true;
      resultOutput.value = matched ? '匹配成功' : '不匹配';
      resultOutput.classList.add(matched ? 'is-success' : 'is-error');
      resultMeta.textContent = `${job.version} · cost ${job.cost} · 耗时 ${elapsed} 秒`;
      setStatus(matched ? '验证完成：密码与该 Hash 匹配。' : '验证完成：密码与该 Hash 不匹配，请检查密码及 Hash。', matched ? 'success' : 'error');
    }
  };

  const updateProgress = (job, progress) => {
    if (activeJob !== job) return;
    const value = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    progressBar.value = value;
    progressLabel.textContent = `正在${job.mode === 'generate' ? '生成' : '验证'}… ${Math.floor(value * 100)}%`;
  };

  // 本地文件或不支持 Worker 的环境使用库的分段异步 API；限制耗时，避免假装可取消。
  const runFallback = (job, payload) => {
    if (activeJob !== job) return;
    releaseJob(job);
    if (job.cost > 12) {
      finish(job, null, '当前环境无法在后台计算，最高支持 cost 12。请降低生成 cost，或通过支持后台计算的现代浏览器打开本站后重试。');
      return;
    }
    cancelButton.disabled = true;
    progressHint.textContent = '当前环境无法取消计算，请等待完成（最高 cost 12）。';
    const callback = (error, value) => {
      finish(job, job.mode === 'generate' ? { hash: value } : { matched: value }, error ? '计算失败，请检查浏览器是否支持安全随机数，或刷新页面后重试。' : null);
    };
    try {
      if (job.mode === 'generate') {
        if (!window.crypto?.getRandomValues) {
          finish(job, null, '当前浏览器无法提供安全随机数，不能生成随机盐。请使用现代浏览器后重试。');
          return;
        }
        window.bcrypt.hash(payload.password, payload.cost, callback, value => updateProgress(job, value));
      } else {
        window.bcrypt.compare(payload.password, payload.hash, callback, value => updateProgress(job, value));
      }
    } catch (error) {
      finish(job, null, '计算未能启动，请刷新页面或使用现代浏览器重试。');
    }
  };

  const validateField = (input, validate) => {
    try {
      return validate(input.value);
    } catch (error) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      throw error;
    }
  };

  const run = () => {
    if (activeJob || !available) return;
    clearInvalid();
    clearResult();
    let payload;
    let parsed;
    try {
      validateField(passwordInput, core.validatePassword);
      payload = { id: ++nextId, mode: getMode(), password: passwordInput.value };
      if (payload.mode === 'generate') {
        payload.cost = validateField(costInput, core.validateCost);
      } else {
        parsed = validateField(hashInput, core.parseHash);
        payload.hash = parsed.hash;
      }
    } catch (error) {
      setStatus(error.message || '输入无效，请检查密码与参数。', 'error');
      return;
    }
    const job = {
      id: payload.id,
      mode: payload.mode,
      cost: parsed ? parsed.cost : payload.cost,
      version: parsed?.version,
      startedAt: performance.now(),
      worker: null,
      startupTimer: null,
    };
    activeJob = job;
    setBusy(true, workerAvailable);
    updateProgress(job, 0);
    progressHint.textContent = '可随时取消本次计算。';
    setStatus(`正在${job.mode === 'generate' ? '生成 Hash' : '验证密码'}，cost ${job.cost}…`);

    if (!workerAvailable) {
      runFallback(job, payload);
      return;
    }
    try {
      job.worker = new Worker('./worker.js');
      const fallback = () => {
        if (activeJob !== job) return;
        workerAvailable = false;
        runFallback(job, payload);
      };
      job.worker.onmessage = event => {
        if (activeJob !== job || event.data?.id !== job.id) return;
        window.clearTimeout(job.startupTimer);
        const data = event.data;
        if (data.type === 'progress') updateProgress(job, data.progress);
        else if (data.type === 'result') finish(job, data);
        else if (data.type === 'error') finish(job, null, data.message || '计算失败，请检查输入后重试。');
      };
      job.worker.onerror = event => {
        event.preventDefault();
        fallback();
      };
      job.worker.onmessageerror = fallback;
      job.startupTimer = window.setTimeout(fallback, 15000);
      job.worker.postMessage(payload);
    } catch (error) {
      workerAvailable = false;
      runFallback(job, payload);
    }
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    run();
  });
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      run();
    }
  });
  modes.forEach(input => input.addEventListener('change', syncMode));
  form.addEventListener('input', event => {
    if (activeJob || event.target.name === 'mode') return;
    updateByteCount();
    clearInvalid();
    clearResult();
    if (available) setStatus('输入已更新，请重新执行。');
  });
  togglePassword.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    togglePassword.setAttribute('aria-pressed', String(show));
    togglePassword.textContent = show ? '隐藏密码' : '显示密码';
  });
  cancelButton.addEventListener('click', () => {
    if (!activeJob?.worker) return;
    releaseJob(activeJob);
    activeJob = null;
    setBusy(false);
    clearResult();
    setStatus('已取消计算，可修改输入后重试。');
    runButton.focus();
  });
  clearButton.addEventListener('click', () => {
    if (activeJob) return;
    passwordInput.value = '';
    hashInput.value = '';
    passwordInput.type = 'password';
    togglePassword.textContent = '显示密码';
    togglePassword.setAttribute('aria-pressed', 'false');
    updateByteCount();
    clearInvalid();
    clearResult();
    setStatus('已清空密码、Hash 和结果。');
    passwordInput.focus();
  });
  copyResult.addEventListener('click', () => {
    if (!copyResult.disabled) window.Toolbox.copyText(resultOutput.value, 'Bcrypt Hash 已复制');
  });
  useForVerify.addEventListener('click', () => {
    hashInput.value = resultOutput.value;
    modes.forEach(input => { input.checked = input.value === 'verify'; });
    syncMode();
    setStatus('已填入生成的 Hash；可直接验证，或修改密码后测试。');
    runButton.focus();
  });
  window.addEventListener('pagehide', () => {
    if (!activeJob) return;
    releaseJob(activeJob);
    activeJob = null;
    setBusy(false);
    clearResult();
    setStatus('本次结果已丢弃，请重新执行。');
  });

  syncMode();
  if (!available) {
    setBusy(false);
    setStatus('本地计算组件未能加载，或浏览器缺少所需功能。请刷新页面，并确保本工具的依赖文件完整。', 'error');
  }
})();
