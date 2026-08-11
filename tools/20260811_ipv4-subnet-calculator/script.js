(() => {
  'use strict';

  const { calculateSubnet } = window.Ipv4SubnetCore;
  const subnetForm = document.getElementById('subnetForm');
  const addressInput = document.getElementById('addressInput');
  const prefixInput = document.getElementById('prefixInput');
  const clearSubnet = document.getElementById('clearSubnet');
  const subnetStatus = document.getElementById('subnetStatus');
  const emptyState = document.getElementById('emptyState');
  const resultContent = document.getElementById('resultContent');
  const copyResults = document.getElementById('copyResults');
  const resultNote = document.getElementById('resultNote');
  const presetButtons = [...document.querySelectorAll('[data-prefix]')];

  const fields = Object.freeze({
    addressBinary: document.getElementById('addressBinaryResult'),
    broadcast: document.getElementById('broadcastResult'),
    cidr: document.getElementById('cidrResult'),
    mask: document.getElementById('maskResult'),
    maskBinary: document.getElementById('maskBinaryResult'),
    network: document.getElementById('networkResult'),
    range: document.getElementById('rangeResult'),
    total: document.getElementById('totalResult'),
    type: document.getElementById('typeResult'),
    usable: document.getElementById('usableResult'),
    wildcard: document.getElementById('wildcardResult'),
  });

  let latestResult = null;

  const setStatus = (message, type = '') => {
    subnetStatus.textContent = message;
    subnetStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const setInvalid = (input, invalid) => {
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  const resetResults = () => {
    latestResult = null;
    emptyState.hidden = false;
    resultContent.hidden = true;
    copyResults.disabled = true;
  };

  const formatCount = value => new Intl.NumberFormat('zh-CN').format(value);

  const renderResult = (result) => {
    latestResult = result;
    fields.cidr.textContent = result.cidr;
    fields.type.textContent = result.addressType;
    fields.network.textContent = result.networkAddress;
    fields.broadcast.textContent = result.broadcastAddress;
    fields.mask.textContent = `${result.subnetMask} (/${result.prefix})`;
    fields.wildcard.textContent = result.wildcardMask;
    fields.range.textContent = `${result.firstUsable} – ${result.lastUsable}`;
    fields.total.textContent = formatCount(result.totalAddresses);
    fields.usable.textContent = formatCount(result.usableHosts);
    fields.addressBinary.textContent = result.addressBinary;
    fields.maskBinary.textContent = result.maskBinary;

    const notes = [];
    if (result.hostNote) notes.push(result.hostNote);
    if (result.isNetworkAddress) notes.push('输入地址本身是该子网的网络地址。');
    if (result.isBroadcastAddress) notes.push('输入地址本身是该子网的广播地址。');
    resultNote.textContent = notes.join(' ');
    resultNote.hidden = notes.length === 0;
    emptyState.hidden = true;
    resultContent.hidden = false;
    copyResults.disabled = false;
  };

  const calculate = () => {
    setInvalid(addressInput, false);
    setInvalid(prefixInput, false);
    try {
      const result = calculateSubnet(addressInput.value, prefixInput.value);
      renderResult(result);
      setStatus(`已计算 ${result.address}/${result.prefix} 所在子网。`, 'success');
    } catch (error) {
      resetResults();
      setInvalid(addressInput, true);
      setInvalid(prefixInput, true);
      setStatus(error.message || '无法计算，请检查输入。', 'error');
    }
  };

  subnetForm.addEventListener('submit', event => {
    event.preventDefault();
    calculate();
  });

  subnetForm.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      calculate();
    }
  });

  [addressInput, prefixInput].forEach(input => {
    input.addEventListener('input', () => {
      setInvalid(addressInput, false);
      setInvalid(prefixInput, false);
      if (latestResult) {
        resetResults();
        setStatus('输入已修改，请重新计算。');
      }
    });
  });

  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      prefixInput.value = button.dataset.prefix;
      const slashIndex = addressInput.value.indexOf('/');
      if (slashIndex !== -1) addressInput.value = addressInput.value.slice(0, slashIndex);
      resetResults();
      setStatus(`已选择 /${button.dataset.prefix}，点击“计算子网”查看结果。`);
      prefixInput.focus();
    });
  });

  clearSubnet.addEventListener('click', () => {
    addressInput.value = '';
    prefixInput.value = '';
    setInvalid(addressInput, false);
    setInvalid(prefixInput, false);
    resetResults();
    setStatus('内容已清空。');
    addressInput.focus();
  });

  copyResults.addEventListener('click', () => {
    if (!latestResult) return;
    const result = latestResult;
    const output = [
      `输入地址：${result.address}/${result.prefix}`,
      `规范 CIDR：${result.cidr}`,
      `地址类型：${result.addressType}`,
      `网络地址：${result.networkAddress}`,
      `广播 / 最后地址：${result.broadcastAddress}`,
      `子网掩码：${result.subnetMask}`,
      `反向掩码：${result.wildcardMask}`,
      `可用范围：${result.firstUsable} - ${result.lastUsable}`,
      `地址总数：${result.totalAddresses}`,
      `可用主机数：${result.usableHosts}`,
    ];
    if (result.hostNote) output.push(`说明：${result.hostNote}`);
    window.Toolbox.copyText(output.join('\n'), '子网信息已复制');
  });

  calculate();
})();
