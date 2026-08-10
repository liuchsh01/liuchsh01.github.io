((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.TimestampConverterCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const formatterCache = new Map();
  const SAMPLE_OFFSETS = Object.freeze([
    -366 * 86_400_000,
    -183 * 86_400_000,
    -2 * 86_400_000,
    0,
    2 * 86_400_000,
    183 * 86_400_000,
    366 * 86_400_000,
  ]);

  const normalizeUnit = (unit) => {
    if (unit === 'seconds' || unit === 'milliseconds') return unit;
    throw new Error('请选择秒或毫秒作为时间戳单位。');
  };

  const getFormatter = (timeZone) => {
    const zone = String(timeZone || '').trim();
    if (!zone) throw new Error('请选择时区。');
    if (formatterCache.has(zone)) return formatterCache.get(zone);

    try {
      const formatter = new Intl.DateTimeFormat('en-CA-u-nu-latn', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
      formatter.format(new Date(0));
      formatterCache.set(zone, formatter);
      return formatter;
    } catch (error) {
      throw new Error('无法识别这个时区，请选择有效的 IANA 时区。');
    }
  };

  const getParts = (date, timeZone) => {
    const formatter = getFormatter(timeZone);
    const values = {};
    formatter.formatToParts(date).forEach(part => {
      if (part.type !== 'literal') values[part.type] = Number(part.value);
    });
    return {
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.hour,
      minute: values.minute,
      second: values.second,
    };
  };

  const pad = (value, length = 2) => String(value).padStart(length, '0');

  const partsToText = (parts) => (
    `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)} `
    + `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`
  );

  const partsToUtcEpoch = (parts) => {
    const date = new Date(0);
    date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
    date.setUTCHours(parts.hour, parts.minute, parts.second, 0);
    return date.getTime();
  };

  const sameParts = (left, right) => (
    left.year === right.year
    && left.month === right.month
    && left.day === right.day
    && left.hour === right.hour
    && left.minute === right.minute
    && left.second === right.second
  );

  const parseDateTime = (value) => {
    const source = String(value || '').trim();
    const match = source.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
      throw new Error('请输入有效的日期时间，格式为 YYYY-MM-DD HH:mm:ss。');
    }

    const parts = {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: Number(match[6] || 0),
    };
    const epoch = partsToUtcEpoch(parts);
    const validationDate = new Date(epoch);
    const valid = validationDate.getUTCFullYear() === parts.year
      && validationDate.getUTCMonth() + 1 === parts.month
      && validationDate.getUTCDate() === parts.day
      && validationDate.getUTCHours() === parts.hour
      && validationDate.getUTCMinutes() === parts.minute
      && validationDate.getUTCSeconds() === parts.second;

    if (!valid) {
      throw new Error('请输入有效的日期时间，请检查日期、小时、分钟和秒。');
    }
    return parts;
  };

  const getOffsetMilliseconds = (epochMilliseconds, timeZone) => {
    const instant = new Date(epochMilliseconds);
    const zonedParts = getParts(instant, timeZone);
    const zonedAsUtc = partsToUtcEpoch(zonedParts);
    const instantAtSecond = Math.floor(epochMilliseconds / 1000) * 1000;
    return zonedAsUtc - instantAtSecond;
  };

  const formatOffset = (offsetMilliseconds) => {
    const totalMinutes = Math.round(offsetMilliseconds / 60_000);
    const sign = totalMinutes >= 0 ? '+' : '-';
    const absolute = Math.abs(totalMinutes);
    return `UTC${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
  };

  const formatDateTime = (dateValue, timeZone, options = {}) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(date.getTime())) throw new Error('日期时间超出浏览器可处理的范围。');
    const base = partsToText(getParts(date, timeZone));
    return options.milliseconds ? `${base}.${pad(date.getUTCMilliseconds(), 3)}` : base;
  };

  const parseTimestamp = (value, unit) => {
    const source = String(value ?? '').trim();
    if (!/^-?\d+$/.test(source)) throw new Error('请输入整数时间戳，不要包含小数或其他字符。');

    const numeric = Number(source);
    if (!Number.isSafeInteger(numeric)) throw new Error('时间戳数值过大，请输入安全整数范围内的值。');
    const epochMilliseconds = unit === 'seconds' ? numeric * 1000 : numeric;
    if (!Number.isSafeInteger(epochMilliseconds)) throw new Error('时间戳数值过大，请缩小后再转换。');

    const date = new Date(epochMilliseconds);
    if (Number.isNaN(date.getTime())) throw new Error('时间戳超出浏览器可处理的日期范围。');
    return { date, epochMilliseconds, numeric };
  };

  const timestampToDate = (value, requestedUnit, timeZone) => {
    const unit = normalizeUnit(requestedUnit);
    getFormatter(timeZone);
    const parsed = parseTimestamp(value, unit);
    const offsetMilliseconds = getOffsetMilliseconds(parsed.epochMilliseconds, timeZone);

    return {
      dateTime: formatDateTime(parsed.date, timeZone, { milliseconds: unit === 'milliseconds' }),
      epochMilliseconds: parsed.epochMilliseconds,
      iso: parsed.date.toISOString(),
      offset: formatOffset(offsetMilliseconds),
      timeZone,
      timestamp: parsed.numeric,
      unit,
      utcDateTime: formatDateTime(parsed.date, 'UTC', { milliseconds: unit === 'milliseconds' }),
    };
  };

  const dateTimeToTimestamp = (value, timeZone, requestedUnit) => {
    const unit = normalizeUnit(requestedUnit);
    getFormatter(timeZone);
    const desiredParts = parseDateTime(value);
    const wallTimeAsUtc = partsToUtcEpoch(desiredParts);
    const offsets = new Set(
      SAMPLE_OFFSETS.map(sampleOffset => getOffsetMilliseconds(wallTimeAsUtc + sampleOffset, timeZone)),
    );
    const candidates = [...offsets]
      .map(offset => wallTimeAsUtc - offset)
      .filter(epoch => sameParts(getParts(new Date(epoch), timeZone), desiredParts))
      .filter((epoch, index, values) => values.indexOf(epoch) === index)
      .sort((left, right) => left - right);

    if (candidates.length === 0) {
      throw new Error('这个本地时间可能因夏令时切换而不存在，请调整时间或时区。');
    }

    const epochMilliseconds = candidates[0];
    const date = new Date(epochMilliseconds);
    const timestamp = unit === 'seconds' ? Math.trunc(epochMilliseconds / 1000) : epochMilliseconds;

    return {
      ambiguous: candidates.length > 1,
      candidateCount: candidates.length,
      epochMilliseconds,
      iso: date.toISOString(),
      offset: formatOffset(getOffsetMilliseconds(epochMilliseconds, timeZone)),
      timeZone,
      timestamp,
      unit,
      utcDateTime: formatDateTime(date, 'UTC'),
    };
  };

  return {
    dateTimeToTimestamp,
    formatDateTime,
    formatOffset,
    parseDateTime,
    timestampToDate,
  };
});
