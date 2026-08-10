(() => {
  'use strict';

  const {
    dateTimeToTimestamp,
    formatDateTime,
    timestampToDate,
  } = window.TimestampConverterCore;

  const TIME_ZONES = Object.freeze([
    ['Asia/Shanghai', '中国（上海）'],
    ['UTC', '协调世界时（UTC）'],
    ['Asia/Tokyo', '日本（东京）'],
    ['Asia/Singapore', '新加坡'],
    ['Asia/Kolkata', '印度（加尔各答）'],
    ['Asia/Dubai', '阿联酋（迪拜）'],
    ['Europe/London', '英国（伦敦）'],
    ['Europe/Berlin', '德国（柏林）'],
    ['America/New_York', '美国（纽约）'],
    ['America/Chicago', '美国（芝加哥）'],
    ['America/Denver', '美国（丹佛）'],
    ['America/Los_Angeles', '美国（洛杉矶）'],
    ['America/Sao_Paulo', '巴西（圣保罗）'],
    ['Australia/Sydney', '澳大利亚（悉尼）'],
    ['Pacific/Auckland', '新西兰（奥克兰）'],
  ]);

  const currentTimestamp = document.getElementById('currentTimestamp');
  const currentUnitLabel = document.getElementById('currentUnitLabel');
  const toggleCurrentUnit = document.getElementById('toggleCurrentUnit');
  const copyCurrentTimestamp = document.getElementById('copyCurrentTimestamp');
  const toggleCurrentTimer = document.getElementById('toggleCurrentTimer');
  const timestampForm = document.getElementById('timestampForm');
  const timestampInput = document.getElementById('timestampInput');
  const timestampUnit = document.getElementById('timestampUnit');
  const timestampTimeZone = document.getElementById('timestampTimeZone');
  const fillCurrentTimestamp = document.getElementById('fillCurrentTimestamp');
  const dateResult = document.getElementById('dateResult');
  const dateResultMeta = document.getElementById('dateResultMeta');
  const copyDateResult = document.getElementById('copyDateResult');
  const timestampStatus = document.getElementById('timestampStatus');
  const dateTimeForm = document.getElementById('dateTimeForm');
  const dateTimeInput = document.getElementById('dateTimeInput');
  const dateTimeTimeZone = document.getElementById('dateTimeTimeZone');
  const dateTimeUnit = document.getElementById('dateTimeUnit');
  const fillCurrentDateTime = document.getElementById('fillCurrentDateTime');
  const timestampResult = document.getElementById('timestampResult');
  const timestampResultMeta = document.getElementById('timestampResultMeta');
  const copyTimestampResult = document.getElementById('copyTimestampResult');
  const dateTimeStatus = document.getElementById('dateTimeStatus');

  let liveUnit = 'seconds';
  let livePaused = false;
  let liveTimer = 0;
  let latestDateResult = '';
  let latestTimestampResult = '';

  const setStatus = (element, message, type = '') => {
    element.textContent = message;
    element.className = `status${type ? ` is-${type}` : ''}`;
  };

  const createTimeZoneOptions = (select) => {
    TIME_ZONES.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = `${label} · ${value}`;
      select.append(option);
    });
    select.value = 'Asia/Shanghai';
  };

  const getCurrentValue = (unit) => (
    unit === 'milliseconds' ? Date.now() : Math.floor(Date.now() / 1000)
  );

  const updateLiveTimestamp = () => {
    if (livePaused) return;
    currentTimestamp.textContent = String(getCurrentValue(liveUnit));
    window.clearTimeout(liveTimer);
    const delay = liveUnit === 'milliseconds' ? 50 : 1010 - (Date.now() % 1000);
    liveTimer = window.setTimeout(updateLiveTimestamp, delay);
  };

  const fillCurrentTimestampInput = () => {
    timestampInput.value = String(getCurrentValue(timestampUnit.value));
    timestampInput.removeAttribute('aria-invalid');
  };

  const fillCurrentDateTimeInput = () => {
    const formatted = formatDateTime(new Date(), dateTimeTimeZone.value);
    dateTimeInput.value = formatted.replace(' ', 'T');
    dateTimeInput.removeAttribute('aria-invalid');
  };

  const clearDateResult = () => {
    latestDateResult = '';
    dateResult.textContent = '等待转换';
    dateResultMeta.textContent = '';
    copyDateResult.disabled = true;
  };

  const clearTimestampResult = () => {
    latestTimestampResult = '';
    timestampResult.textContent = '等待转换';
    timestampResultMeta.textContent = '';
    copyTimestampResult.disabled = true;
  };

  timestampForm.addEventListener('submit', event => {
    event.preventDefault();
    timestampInput.removeAttribute('aria-invalid');

    try {
      const result = timestampToDate(timestampInput.value, timestampUnit.value, timestampTimeZone.value);
      latestDateResult = result.dateTime;
      dateResult.textContent = result.dateTime;
      dateResultMeta.textContent = `${result.timeZone} · ${result.offset} · UTC ${result.utcDateTime}`;
      copyDateResult.disabled = false;
      setStatus(timestampStatus, '转换完成。结果按所选时区显示。', 'success');
    } catch (error) {
      clearDateResult();
      timestampInput.setAttribute('aria-invalid', 'true');
      setStatus(timestampStatus, error.message || '时间戳转换失败，请检查输入。', 'error');
    }
  });

  dateTimeForm.addEventListener('submit', event => {
    event.preventDefault();
    dateTimeInput.removeAttribute('aria-invalid');

    try {
      const result = dateTimeToTimestamp(dateTimeInput.value, dateTimeTimeZone.value, dateTimeUnit.value);
      latestTimestampResult = String(result.timestamp);
      timestampResult.textContent = latestTimestampResult;
      timestampResultMeta.textContent = `${result.unit === 'seconds' ? '秒' : '毫秒'} · ${result.offset} · ${result.iso}`;
      copyTimestampResult.disabled = false;
      setStatus(
        dateTimeStatus,
        result.ambiguous
          ? '该时间在夏令时切换中出现两次，已采用较早的时间点。'
          : '转换完成。时间戳以 UTC 时间轴为基准。',
        'success',
      );
    } catch (error) {
      clearTimestampResult();
      dateTimeInput.setAttribute('aria-invalid', 'true');
      setStatus(dateTimeStatus, error.message || '日期时间转换失败，请检查输入。', 'error');
    }
  });

  toggleCurrentUnit.addEventListener('click', () => {
    liveUnit = liveUnit === 'seconds' ? 'milliseconds' : 'seconds';
    currentUnitLabel.textContent = liveUnit === 'seconds' ? '秒' : '毫秒';
    currentTimestamp.textContent = String(getCurrentValue(liveUnit));
    updateLiveTimestamp();
    window.Toolbox.showToast(`当前时间戳已切换为${liveUnit === 'seconds' ? '秒' : '毫秒'}`);
  });

  toggleCurrentTimer.addEventListener('click', () => {
    livePaused = !livePaused;
    toggleCurrentTimer.setAttribute('aria-pressed', String(livePaused));
    toggleCurrentTimer.textContent = livePaused ? '继续' : '暂停';
    if (livePaused) {
      window.clearTimeout(liveTimer);
    } else {
      updateLiveTimestamp();
    }
  });

  copyCurrentTimestamp.addEventListener('click', () => {
    window.Toolbox.copyText(currentTimestamp.textContent, '当前时间戳已复制');
  });

  fillCurrentTimestamp.addEventListener('click', fillCurrentTimestampInput);
  fillCurrentDateTime.addEventListener('click', fillCurrentDateTimeInput);

  copyDateResult.addEventListener('click', () => {
    if (latestDateResult) window.Toolbox.copyText(latestDateResult, '日期时间已复制');
  });

  copyTimestampResult.addEventListener('click', () => {
    if (latestTimestampResult) window.Toolbox.copyText(latestTimestampResult, '时间戳已复制');
  });

  [timestampTimeZone, dateTimeTimeZone].forEach(createTimeZoneOptions);
  fillCurrentTimestampInput();
  fillCurrentDateTimeInput();
  updateLiveTimestamp();
})();
