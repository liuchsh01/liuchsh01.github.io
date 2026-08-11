((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.CronExpressionCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const MONTH_ALIASES = Object.freeze({
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AUG: 8,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DEC: 12,
  });

  const WEEKDAY_ALIASES = Object.freeze({
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
  });

  const FIELD_DEFINITIONS = Object.freeze({
    minute: Object.freeze({ label: '分钟', min: 0, max: 59 }),
    hour: Object.freeze({ label: '小时', min: 0, max: 23 }),
    dayOfMonth: Object.freeze({ label: '日期', min: 1, max: 31 }),
    month: Object.freeze({ aliases: MONTH_ALIASES, label: '月份', min: 1, max: 12 }),
    dayOfWeek: Object.freeze({
      aliases: WEEKDAY_ALIASES,
      label: '星期',
      min: 0,
      max: 7,
      normalize: value => value === 7 ? 0 : value,
    }),
  });

  const FIELD_ORDER = Object.freeze(['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']);
  const ALIASES = Object.freeze({
    '@yearly': '0 0 1 1 *',
    '@annually': '0 0 1 1 *',
    '@monthly': '0 0 1 * *',
    '@weekly': '0 0 * * 0',
    '@daily': '0 0 * * *',
    '@midnight': '0 0 * * *',
    '@hourly': '0 * * * *',
  });

  const WEEKDAY_NAMES = Object.freeze(['周日', '周一', '周二', '周三', '周四', '周五', '周六']);

  const parseValue = (token, definition) => {
    const source = String(token || '').trim().toUpperCase();
    if (!source) throw new Error(`${definition.label}字段包含空值。`);

    let value;
    if (/^\d+$/.test(source)) {
      value = Number(source);
    } else if (definition.aliases && Object.hasOwn(definition.aliases, source)) {
      value = definition.aliases[source];
    } else {
      throw new Error(`${definition.label}字段中的“${token}”无法识别。`);
    }

    if (!Number.isInteger(value) || value < definition.min || value > definition.max) {
      throw new Error(`${definition.label}字段的取值范围应为 ${definition.min}-${definition.max}。`);
    }
    return value;
  };

  const parseField = (fieldValue, definition) => {
    const source = String(fieldValue || '').trim();
    if (!source) throw new Error(`${definition.label}字段不能为空。`);

    const values = new Set();
    const segments = source.split(',');
    if (segments.some(segment => !segment)) {
      throw new Error(`${definition.label}字段的列表中存在空项。`);
    }

    segments.forEach(segment => {
      const stepParts = segment.split('/');
      if (stepParts.length > 2 || !stepParts[0]) {
        throw new Error(`${definition.label}字段中的“${segment}”格式不正确。`);
      }

      const step = stepParts.length === 2 ? Number(stepParts[1]) : 1;
      if (!Number.isInteger(step) || step <= 0) {
        throw new Error(`${definition.label}字段的步长必须是正整数。`);
      }

      const base = stepParts[0];
      let start;
      let end;
      if (base === '*') {
        start = definition.min;
        end = definition.max;
      } else if (base.includes('-')) {
        const rangeParts = base.split('-');
        if (rangeParts.length !== 2) {
          throw new Error(`${definition.label}字段中的范围“${base}”格式不正确。`);
        }
        start = parseValue(rangeParts[0], definition);
        end = parseValue(rangeParts[1], definition);
        if (start > end) {
          throw new Error(`${definition.label}字段的范围起点不能大于终点。`);
        }
      } else {
        start = parseValue(base, definition);
        end = stepParts.length === 2 ? definition.max : start;
      }

      for (let value = start; value <= end; value += step) {
        values.add(definition.normalize ? definition.normalize(value) : value);
      }
    });

    if (values.size === 0) throw new Error(`${definition.label}字段没有有效取值。`);
    return {
      source,
      values: [...values].sort((left, right) => left - right),
      valueSet: values,
      wildcard: source === '*',
    };
  };

  const parseCron = expression => {
    const original = String(expression ?? '').trim();
    if (!original) throw new Error('请输入 Cron 表达式。');

    const aliasKey = original.toLowerCase();
    const expanded = ALIASES[aliasKey] || original;
    const parts = expanded.split(/\s+/);
    if (parts.length !== 5) {
      throw new Error('请输入 5 段 Unix Cron 表达式：分钟 小时 日期 月份 星期。');
    }

    const fields = {};
    FIELD_ORDER.forEach((fieldName, index) => {
      fields[fieldName] = parseField(parts[index], FIELD_DEFINITIONS[fieldName]);
    });

    return {
      alias: ALIASES[aliasKey] ? aliasKey : null,
      expression: original,
      fields,
      normalized: parts.join(' '),
    };
  };

  const ensureSchedule = schedule => (
    typeof schedule === 'string' ? parseCron(schedule) : schedule
  );

  const matchesCron = (dateValue, scheduleValue) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) throw new Error('用于匹配的日期时间无效。');
    const schedule = ensureSchedule(scheduleValue);
    const { fields } = schedule;

    if (!fields.minute.valueSet.has(date.getMinutes())
      || !fields.hour.valueSet.has(date.getHours())
      || !fields.month.valueSet.has(date.getMonth() + 1)) {
      return false;
    }

    const dayOfMonthMatches = fields.dayOfMonth.valueSet.has(date.getDate());
    const dayOfWeekMatches = fields.dayOfWeek.valueSet.has(date.getDay());
    if (fields.dayOfMonth.wildcard && fields.dayOfWeek.wildcard) return true;
    if (fields.dayOfMonth.wildcard) return dayOfWeekMatches;
    if (fields.dayOfWeek.wildcard) return dayOfMonthMatches;
    return dayOfMonthMatches || dayOfWeekMatches;
  };

  const advanceToNextMonth = (cursor, allowedMonths) => {
    const currentMonth = cursor.getMonth() + 1;
    const nextMonth = allowedMonths.find(month => month > currentMonth);
    if (nextMonth) {
      cursor.setMonth(nextMonth - 1, 1);
    } else {
      cursor.setFullYear(cursor.getFullYear() + 1, allowedMonths[0] - 1, 1);
    }
    cursor.setHours(0, 0, 0, 0);
  };

  const advanceToNextDay = cursor => {
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  };

  const findNextOccurrences = (scheduleValue, fromValue = new Date(), requestedCount = 5, options = {}) => {
    const schedule = ensureSchedule(scheduleValue);
    const from = fromValue instanceof Date ? new Date(fromValue) : new Date(fromValue);
    if (Number.isNaN(from.getTime())) throw new Error('起算时间无效。');

    const count = Number(requestedCount);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      throw new Error('执行时间数量必须是 1 到 100 之间的整数。');
    }

    const maxYears = Number(options.maxYears ?? Math.max(8, count + 2));
    if (!Number.isInteger(maxYears) || maxYears < 1 || maxYears > 100) {
      throw new Error('搜索年份范围必须是 1 到 100 之间的整数。');
    }

    const deadline = new Date(from);
    deadline.setFullYear(deadline.getFullYear() + maxYears);
    let cursor = new Date(Math.floor(from.getTime() / 60_000) * 60_000 + 60_000);
    const results = [];
    const { fields } = schedule;

    while (cursor <= deadline && results.length < count) {
      const month = cursor.getMonth() + 1;
      if (!fields.month.valueSet.has(month)) {
        advanceToNextMonth(cursor, fields.month.values);
        continue;
      }

      const dayOfMonthMatches = fields.dayOfMonth.valueSet.has(cursor.getDate());
      const dayOfWeekMatches = fields.dayOfWeek.valueSet.has(cursor.getDay());
      const dayMatches = fields.dayOfMonth.wildcard && fields.dayOfWeek.wildcard
        ? true
        : fields.dayOfMonth.wildcard
          ? dayOfWeekMatches
          : fields.dayOfWeek.wildcard
            ? dayOfMonthMatches
            : dayOfMonthMatches || dayOfWeekMatches;
      if (!dayMatches) {
        advanceToNextDay(cursor);
        continue;
      }

      const currentHour = cursor.getHours();
      if (!fields.hour.valueSet.has(currentHour)) {
        const nextHour = fields.hour.values.find(hour => hour > currentHour);
        if (nextHour !== undefined) {
          cursor.setHours(nextHour, 0, 0, 0);
        } else {
          advanceToNextDay(cursor);
          cursor.setHours(fields.hour.values[0], 0, 0, 0);
        }
        continue;
      }

      const currentMinute = cursor.getMinutes();
      if (!fields.minute.valueSet.has(currentMinute)) {
        const nextMinute = fields.minute.values.find(minute => minute > currentMinute);
        if (nextMinute !== undefined) {
          cursor.setMinutes(nextMinute, 0, 0);
        } else {
          cursor.setHours(cursor.getHours() + 1, fields.minute.values[0], 0, 0);
        }
        continue;
      }

      results.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + 60_000);
    }

    if (results.length < count) {
      throw new Error(`在未来 ${maxYears} 年内找不到足够的执行时间，请检查日期与月份组合。`);
    }
    return results;
  };

  const pad = value => String(value).padStart(2, '0');

  const formatFieldValues = (fieldName, field) => {
    if (field.wildcard) return '任意';
    const formatter = fieldName === 'dayOfWeek'
      ? value => WEEKDAY_NAMES[value]
      : fieldName === 'month'
        ? value => `${value} 月`
        : value => String(value);
    if (field.values.length <= 12) return field.values.map(formatter).join('、');
    return `${field.values.length} 个取值`;
  };

  const summarizeField = (fieldName, field) => {
    if (field.wildcard) return '不限制';
    const stepMatch = field.source.match(/^\*\/(\d+)$/);
    if (stepMatch) return `每 ${stepMatch[1]} 个单位`;
    return formatFieldValues(fieldName, field);
  };

  const getFieldDetails = scheduleValue => {
    const schedule = ensureSchedule(scheduleValue);
    return FIELD_ORDER.map(fieldName => ({
      key: fieldName,
      label: FIELD_DEFINITIONS[fieldName].label,
      source: schedule.fields[fieldName].source,
      meaning: summarizeField(fieldName, schedule.fields[fieldName]),
    }));
  };

  const describeCron = scheduleValue => {
    const schedule = ensureSchedule(scheduleValue);
    const { fields } = schedule;
    const allWildcards = FIELD_ORDER.every(fieldName => fields[fieldName].wildcard);
    if (allWildcards) return '每分钟执行一次。';

    const everyMinutes = fields.minute.source.match(/^\*\/(\d+)$/);
    if (everyMinutes && FIELD_ORDER.slice(1).every(fieldName => fields[fieldName].wildcard)) {
      return `每 ${everyMinutes[1]} 分钟执行一次。`;
    }

    const minute = fields.minute.values.length === 1 ? fields.minute.values[0] : null;
    const hour = fields.hour.values.length === 1 ? fields.hour.values[0] : null;
    const monthWildcard = fields.month.wildcard;
    const dayOfMonthWildcard = fields.dayOfMonth.wildcard;
    const dayOfWeekWildcard = fields.dayOfWeek.wildcard;

    if (minute !== null && fields.hour.wildcard && monthWildcard
      && dayOfMonthWildcard && dayOfWeekWildcard) {
      return `每小时的第 ${minute} 分钟执行一次。`;
    }

    if (minute !== null && hour !== null && monthWildcard) {
      const time = `${pad(hour)}:${pad(minute)}`;
      if (dayOfMonthWildcard && dayOfWeekWildcard) return `每天 ${time} 执行一次。`;
      if (dayOfMonthWildcard && !dayOfWeekWildcard) {
        return `每${formatFieldValues('dayOfWeek', fields.dayOfWeek)} ${time} 执行一次。`;
      }
      if (!dayOfMonthWildcard && dayOfWeekWildcard) {
        return `每月 ${formatFieldValues('dayOfMonth', fields.dayOfMonth)} 日的 ${time} 执行一次。`;
      }
    }

    const details = getFieldDetails(schedule);
    const detailText = details.map(detail => `${detail.label}：${detail.meaning}`).join('；');
    const dayNote = !dayOfMonthWildcard && !dayOfWeekWildcard
      ? '；日期与星期同时受限时，任一条件匹配即执行'
      : '';
    return `${detailText}${dayNote}。`;
  };

  return {
    ALIASES,
    FIELD_ORDER,
    describeCron,
    findNextOccurrences,
    getFieldDetails,
    matchesCron,
    parseCron,
  };
});
