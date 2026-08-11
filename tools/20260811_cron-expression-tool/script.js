(() => {
  'use strict';

  const core = window.CronExpressionCore;
  const form = document.querySelector('#cronForm');
  const cronExpression = document.querySelector('#cronExpression');
  const startTime = document.querySelector('#startTime');
  const previewCount = document.querySelector('#previewCount');
  const fillNow = document.querySelector('#fillNow');
  const cronStatus = document.querySelector('#cronStatus');
  const summaryCard = document.querySelector('#summaryCard');
  const cronSummary = document.querySelector('#cronSummary');
  const normalizedExpression = document.querySelector('#normalizedExpression');
  const copyExpression = document.querySelector('#copyExpression');
  const fieldDetails = document.querySelector('#fieldDetails');
  const scheduleEmpty = document.querySelector('#scheduleEmpty');
  const scheduleList = document.querySelector('#scheduleList');
  const copySchedule = document.querySelector('#copySchedule');
  const timeZoneLabel = document.querySelector('#timeZoneLabel');
  const templateButtons = [...document.querySelectorAll('[data-cron]')];
  const fieldInputs = [
    document.querySelector('#minuteField'),
    document.querySelector('#hourField'),
    document.querySelector('#dayOfMonthField'),
    document.querySelector('#monthField'),
    document.querySelector('#dayOfWeekField'),
  ];

  let latestExpression = '';
  let latestScheduleLines = [];

  const pad = value => String(value).padStart(2, '0');

  const formatDateTimeLocalValue = date => (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );

  const setCurrentStartTime = () => {
    startTime.value = formatDateTimeLocalValue(new Date());
  };

  const setStatus = (message, type = '') => {
    cronStatus.textContent = message;
    cronStatus.className = 'status';
    if (type) cronStatus.classList.add(type);
  };

  const clearNode = node => {
    while (node.firstChild) node.firstChild.remove();
  };

  const syncBuilder = normalized => {
    normalized.split(/\s+/).forEach((value, index) => {
      if (fieldInputs[index]) fieldInputs[index].value = value;
    });
  };

  const syncExpressionFromBuilder = () => {
    cronExpression.value = fieldInputs.map(input => input.value.trim()).join(' ');
  };

  const getStartDate = () => {
    if (!startTime.value) throw new Error('请选择起算时间。');
    const value = new Date(startTime.value);
    if (Number.isNaN(value.getTime())) throw new Error('起算时间无效，请重新选择。');
    return value;
  };

  const getTimeZoneName = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '浏览器本地时区';
    } catch (error) {
      return '浏览器本地时区';
    }
  };

  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const formatRelative = (date, start) => {
    const totalMinutes = Math.max(1, Math.round((date.getTime() - start.getTime()) / 60_000));
    if (totalMinutes < 60) return `${totalMinutes} 分钟后`;
    if (totalMinutes < 1_440) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes ? `${hours} 小时 ${minutes} 分后` : `${hours} 小时后`;
    }
    const days = Math.floor(totalMinutes / 1_440);
    const remainingHours = Math.floor((totalMinutes % 1_440) / 60);
    return remainingHours ? `${days} 天 ${remainingHours} 小时后` : `${days} 天后`;
  };

  const renderFieldDetails = details => {
    clearNode(fieldDetails);
    details.forEach(detail => {
      const row = document.createElement('div');
      const label = document.createElement('span');
      const source = document.createElement('code');
      const meaning = document.createElement('span');

      row.className = 'field-detail';
      label.className = 'field-detail-label';
      source.className = 'field-detail-source';
      meaning.className = 'field-detail-meaning';
      label.textContent = detail.label;
      source.textContent = detail.source;
      meaning.textContent = detail.meaning;
      row.append(label, source, meaning);
      fieldDetails.append(row);
    });
  };

  const renderSchedule = (dates, start) => {
    clearNode(scheduleList);
    latestScheduleLines = dates.map(date => dateFormatter.format(date));

    dates.forEach((date, index) => {
      const item = document.createElement('li');
      const number = document.createElement('span');
      const time = document.createElement('time');
      const relative = document.createElement('span');

      item.className = 'schedule-item';
      number.className = 'schedule-index';
      time.className = 'schedule-time';
      relative.className = 'schedule-relative';
      number.textContent = String(index + 1);
      time.dateTime = date.toISOString();
      time.textContent = latestScheduleLines[index];
      relative.textContent = formatRelative(date, start);
      item.append(number, time, relative);
      scheduleList.append(item);
    });

    scheduleEmpty.hidden = true;
    scheduleList.hidden = false;
    copySchedule.disabled = false;
  };

  const clearResults = message => {
    latestExpression = '';
    latestScheduleLines = [];
    summaryCard.hidden = true;
    copyExpression.disabled = true;
    copySchedule.disabled = true;
    clearNode(fieldDetails);
    clearNode(scheduleList);
    scheduleList.hidden = true;
    scheduleEmpty.textContent = message;
    scheduleEmpty.hidden = false;
  };

  const parseAndRender = () => {
    if (!core) {
      setStatus('Cron 核心模块未加载，请刷新页面后重试。', 'is-error');
      return;
    }

    try {
      const parsed = core.parseCron(cronExpression.value);
      const start = getStartDate();
      const count = Number(previewCount.value);
      const dates = core.findNextOccurrences(parsed, start, count);

      cronExpression.setAttribute('aria-invalid', 'false');
      latestExpression = parsed.normalized;
      syncBuilder(parsed.normalized);
      cronExpression.value = parsed.normalized;
      cronSummary.textContent = core.describeCron(parsed);
      normalizedExpression.textContent = parsed.normalized;
      summaryCard.hidden = false;
      copyExpression.disabled = false;
      renderFieldDetails(core.getFieldDetails(parsed));
      renderSchedule(dates, start);
      setStatus(`表达式有效，已生成未来 ${dates.length} 次执行时间。`, 'is-success');
    } catch (error) {
      cronExpression.setAttribute('aria-invalid', 'true');
      clearResults('修正表达式或起算时间后，执行计划会显示在这里。');
      setStatus(error instanceof Error ? error.message : '无法解析这个 Cron 表达式。', 'is-error');
    }
  };

  fieldInputs.forEach(input => input.addEventListener('input', syncExpressionFromBuilder));

  templateButtons.forEach(button => {
    button.addEventListener('click', () => {
      cronExpression.value = button.dataset.cron || '';
      syncBuilder(cronExpression.value);
      parseAndRender();
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    parseAndRender();
  });

  fillNow.addEventListener('click', () => {
    setCurrentStartTime();
    parseAndRender();
  });

  copyExpression.addEventListener('click', () => {
    if (latestExpression) window.Toolbox.copyText(latestExpression, 'Cron 表达式已复制');
  });

  copySchedule.addEventListener('click', () => {
    if (latestScheduleLines.length) {
      window.Toolbox.copyText(latestScheduleLines.join('\n'), '执行时间已复制');
    }
  });

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  setCurrentStartTime();
  timeZoneLabel.textContent = getTimeZoneName();
  parseAndRender();
})();
