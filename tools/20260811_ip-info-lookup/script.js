(() => {
  'use strict';

  const {
    FIELD_DEFINITIONS,
    PROVIDERS,
    aggregateResults,
    buildRequestUrls,
    getDisplayFields,
    normalizeProviderResponse,
    validateIp,
  } = window.IpInfoCore;

  const queryForm = document.getElementById('queryForm');
  const ipInput = document.getElementById('ipInput');
  const ipinfoToken = document.getElementById('ipinfoToken');
  const lookupButton = document.getElementById('lookupIp');
  const currentIpButton = document.getElementById('currentIp');
  const queryStatus = document.getElementById('queryStatus');
  const summarySection = document.getElementById('summarySection');
  const summaryMeta = document.getElementById('summaryMeta');
  const summaryGrid = document.getElementById('summaryGrid');
  const copySummary = document.getElementById('copySummary');
  const sourceSection = document.getElementById('sourceSection');
  const sourceGrid = document.getElementById('sourceGrid');
  const providerInputs = [...document.querySelectorAll('input[name="provider"]')];

  const providerMap = new Map(PROVIDERS.map(provider => [provider.id, provider]));
  const fieldLabelMap = new Map(FIELD_DEFINITIONS.map(field => [field.key, field.label]));
  const REQUEST_TIMEOUT = 12_000;
  let activeQueryId = 0;
  let latestExport = '';
  let sourceCards = new Map();

  const setStatus = (message, type = '') => {
    queryStatus.textContent = message;
    queryStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const setBusy = busy => {
    lookupButton.disabled = busy;
    currentIpButton.disabled = busy;
    providerInputs.forEach(input => {
      input.disabled = busy;
    });
  };

  const getSelectedProviderIds = () => providerInputs
    .filter(input => input.checked)
    .map(input => input.value);

  const clearResults = () => {
    latestExport = '';
    sourceCards = new Map();
    summaryGrid.replaceChildren();
    sourceGrid.replaceChildren();
    summarySection.hidden = true;
    sourceSection.hidden = true;
    copySummary.disabled = true;
  };

  const formatFetchError = error => {
    if (error?.name === 'AbortError') return '请求超时，请稍后重试。';
    const message = String(error?.message || error || '未知错误');
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return '浏览器无法连接该接口，可能受到网络、CORS 或地区策略限制。';
    }
    return message.length > 180 ? `${message.slice(0, 180)}…` : message;
  };

  const fetchJson = async url => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'omit',
        headers: { Accept: 'application/json' },
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });
      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (error) {
        if (!response.ok) {
          throw new Error(`接口返回 HTTP ${response.status}。`);
        }
        throw new Error('接口返回的内容不是有效 JSON。');
      }

      if (!response.ok) {
        const remoteMessage = data?.message || data?.reason || data?.error?.message;
        const prefix = response.status === 429 ? '已达到免费额度' : `HTTP ${response.status}`;
        throw new Error(remoteMessage ? `${prefix}：${remoteMessage}` : prefix);
      }

      return data;
    } finally {
      window.clearTimeout(timer);
    }
  };

  const queryProvider = async (providerId, targetIp) => {
    const startedAt = performance.now();
    const urls = buildRequestUrls(providerId, targetIp, ipinfoToken.value);
    const responses = await Promise.all(urls.map(fetchJson));
    const raw = providerId === 'ripestat'
      ? { networkInfo: responses[0], prefixOverview: responses[1] }
      : responses[0];
    const normalized = normalizeProviderResponse(providerId, raw, targetIp);

    return {
      providerId,
      raw,
      normalized,
      duration: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  };

  const createSourceCard = providerId => {
    const provider = providerMap.get(providerId);
    const card = document.createElement('article');
    card.className = 'source-card';
    card.dataset.provider = providerId;

    const head = document.createElement('div');
    head.className = 'source-card-head';

    const title = document.createElement('div');
    title.className = 'source-title';
    const name = document.createElement('strong');
    name.textContent = provider.name;
    const docs = document.createElement('a');
    docs.href = provider.docs;
    docs.target = '_blank';
    docs.rel = 'noopener noreferrer';
    docs.textContent = '官方文档 ↗';
    title.append(name, docs);

    const badge = document.createElement('span');
    badge.className = 'source-badge';
    badge.textContent = '查询中';

    const body = document.createElement('div');
    body.className = 'source-body';
    const loading = document.createElement('p');
    loading.className = 'source-loading';
    loading.textContent = '正在等待接口响应……';
    body.append(loading);

    head.append(title, badge);
    card.append(head, body);
    sourceGrid.append(card);
    sourceCards.set(providerId, { card, badge, body });
  };

  const renderSourceSuccess = result => {
    const elements = sourceCards.get(result.providerId);
    if (!elements) return;
    const display = getDisplayFields(result.normalized);
    elements.card.classList.remove('is-error');
    elements.card.classList.add('is-success');
    elements.badge.textContent = `成功 · ${result.duration} ms`;
    elements.body.replaceChildren();

    const list = document.createElement('dl');
    list.className = 'source-fields';
    FIELD_DEFINITIONS.forEach(field => {
      const value = display[field.key];
      if (!value) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'source-field';
      const term = document.createElement('dt');
      term.textContent = field.label;
      const description = document.createElement('dd');
      description.textContent = value;
      wrapper.append(term, description);
      list.append(wrapper);
    });

    const details = document.createElement('details');
    details.className = 'raw-details';
    const summary = document.createElement('summary');
    summary.textContent = '查看原始 JSON';
    const pre = document.createElement('pre');
    pre.className = 'raw-json';
    pre.textContent = JSON.stringify(result.raw, null, 2);
    details.append(summary, pre);
    elements.body.append(list, details);
  };

  const renderSourceError = (providerId, error) => {
    const elements = sourceCards.get(providerId);
    if (!elements) return;
    elements.card.classList.remove('is-success');
    elements.card.classList.add('is-error');
    elements.badge.textContent = '失败';
    elements.body.replaceChildren();
    const message = document.createElement('p');
    message.className = 'source-error';
    message.textContent = formatFetchError(error);
    elements.body.append(message);
  };

  const renderSummary = (targetIp, providerStates, selectedCount) => {
    const successes = providerStates.filter(state => state.status === 'success');
    if (successes.length === 0) {
      summarySection.hidden = true;
      copySummary.disabled = true;
      latestExport = '';
      return;
    }

    const aggregate = aggregateResults(successes.map(state => state.normalized));
    summaryGrid.replaceChildren();
    aggregate.forEach(field => {
      const wrapper = document.createElement('div');
      wrapper.className = 'summary-item';
      const term = document.createElement('dt');
      term.textContent = field.label;
      const description = document.createElement('dd');
      description.textContent = field.value;
      const note = document.createElement('span');
      note.className = `agreement-note${field.alternatives.length ? ' has-conflict' : ''}`;
      note.textContent = field.alternatives.length
        ? `${field.agreement}/${field.reportedBy} 个来源一致，另有 ${field.alternatives.length} 种结果`
        : `${field.agreement} 个来源提供`;
      description.append(note);
      wrapper.append(term, description);
      summaryGrid.append(wrapper);
    });

    const failedCount = providerStates.filter(state => state.status === 'error').length;
    const pendingCount = providerStates.filter(state => state.status === 'loading').length;
    summaryMeta.textContent = `${successes.length}/${selectedCount} 个接口成功${failedCount ? ` · ${failedCount} 个失败` : ''}${pendingCount ? ` · ${pendingCount} 个查询中` : ''}`;
    summarySection.hidden = false;
    copySummary.disabled = pendingCount > 0;

    const aggregateObject = Object.fromEntries(aggregate.map(field => [field.label, {
      value: field.value,
      agreement: `${field.agreement}/${field.reportedBy}`,
      alternatives: field.alternatives.map(item => item.value),
    }]));
    const providerObject = Object.fromEntries(providerStates.map(state => [
      providerMap.get(state.providerId).name,
      state.status === 'success'
        ? { status: 'success', durationMs: state.duration, data: state.normalized, raw: state.raw }
        : { status: state.status, error: state.error || '' },
    ]));
    latestExport = JSON.stringify({
      query: targetIp,
      queriedAt: new Date().toISOString(),
      summary: aggregateObject,
      providers: providerObject,
    }, null, 2);
  };

  const runLookup = async value => {
    let target;
    try {
      target = validateIp(value);
    } catch (error) {
      clearResults();
      ipInput.setAttribute('aria-invalid', 'true');
      setStatus(error.message, 'error');
      return;
    }

    const providerIds = getSelectedProviderIds();
    if (providerIds.length === 0) {
      clearResults();
      setStatus('请至少选择一个数据源。', 'error');
      return;
    }

    ipInput.removeAttribute('aria-invalid');
    ipInput.value = target.ip;
    const queryId = ++activeQueryId;
    setBusy(true);
    clearResults();
    sourceSection.hidden = false;
    providerIds.forEach(createSourceCard);
    setStatus(`正在通过 ${providerIds.length} 个数据源查询 ${target.ip}……`);

    const states = providerIds.map(providerId => ({ providerId, status: 'loading' }));
    await Promise.all(providerIds.map(async (providerId, index) => {
      try {
        const result = await queryProvider(providerId, target.ip);
        if (queryId !== activeQueryId) return;
        states[index] = { ...result, status: 'success' };
        renderSourceSuccess(result);
      } catch (error) {
        if (queryId !== activeQueryId) return;
        const message = formatFetchError(error);
        states[index] = { providerId, status: 'error', error: message };
        renderSourceError(providerId, error);
      }

      renderSummary(target.ip, states, providerIds.length);
    }));

    if (queryId !== activeQueryId) return;
    const successCount = states.filter(state => state.status === 'success').length;
    const failedCount = states.filter(state => state.status === 'error').length;
    renderSummary(target.ip, states, providerIds.length);
    setBusy(false);

    if (successCount === 0) {
      setStatus('所有数据源均查询失败，请检查网络、免费额度或稍后重试。', 'error');
    } else if (failedCount > 0) {
      setStatus(`查询完成：${successCount} 个接口成功，${failedCount} 个接口失败。`, 'success');
    } else {
      setStatus(`查询完成：${successCount} 个接口全部成功。`, 'success');
    }
  };

  const detectCurrentIp = async () => {
    setBusy(true);
    ipInput.removeAttribute('aria-invalid');
    setStatus('正在获取当前公网出口 IP……');

    try {
      let detectedIp = '';
      try {
        const geojs = await fetchJson('https://get.geojs.io/v1/ip.json');
        detectedIp = geojs.ip;
      } catch (error) {
        const ipwhois = await fetchJson('https://ipwho.is/');
        detectedIp = ipwhois.ip;
      }
      const target = validateIp(detectedIp);
      ipInput.value = target.ip;
      setBusy(false);
      await runLookup(target.ip);
    } catch (error) {
      setBusy(false);
      setStatus(`无法获取当前 IP：${formatFetchError(error)}`, 'error');
    }
  };

  queryForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!lookupButton.disabled) runLookup(ipInput.value);
  });

  currentIpButton.addEventListener('click', () => {
    if (!currentIpButton.disabled) detectCurrentIp();
  });

  ipInput.addEventListener('input', () => ipInput.removeAttribute('aria-invalid'));
  copySummary.addEventListener('click', () => {
    if (latestExport) window.Toolbox.copyText(latestExport, 'IP 查询结果已复制');
  });

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!lookupButton.disabled) runLookup(ipInput.value);
    }
  });
})();
