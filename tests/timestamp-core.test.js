const test = require('node:test');
const assert = require('node:assert/strict');
const {
  dateTimeToTimestamp,
  formatDateTime,
  timestampToDate,
} = require('../tools/20260810_timestamp-converter/timestamp-core.js');

test('seconds timestamp converts to the selected time zone', () => {
  const result = timestampToDate('0', 'seconds', 'Asia/Shanghai');

  assert.equal(result.dateTime, '1970-01-01 08:00:00');
  assert.equal(result.utcDateTime, '1970-01-01 00:00:00');
  assert.equal(result.offset, 'UTC+08:00');
  assert.equal(result.iso, '1970-01-01T00:00:00.000Z');
});

test('millisecond timestamps retain the exact instant', () => {
  const result = timestampToDate('1234', 'milliseconds', 'UTC');

  assert.equal(result.epochMilliseconds, 1234);
  assert.equal(result.dateTime, '1970-01-01 00:00:01.234');
  assert.equal(result.iso, '1970-01-01T00:00:01.234Z');
});

test('local date time converts to seconds and milliseconds', () => {
  const seconds = dateTimeToTimestamp('1970-01-01 08:00:00', 'Asia/Shanghai', 'seconds');
  const milliseconds = dateTimeToTimestamp('1970-01-01T08:00:01', 'Asia/Shanghai', 'milliseconds');

  assert.equal(seconds.timestamp, 0);
  assert.equal(milliseconds.timestamp, 1000);
});

test('formatDateTime creates a stable input-friendly value', () => {
  assert.equal(formatDateTime(new Date(0), 'UTC'), '1970-01-01 00:00:00');
  assert.equal(formatDateTime(new Date(0), 'Asia/Tokyo'), '1970-01-01 09:00:00');
});

test('invalid timestamps and calendar dates return actionable errors', () => {
  assert.throws(() => timestampToDate('12.5', 'seconds', 'UTC'), /整数时间戳/);
  assert.throws(() => dateTimeToTimestamp('2026-02-30 10:00:00', 'UTC', 'seconds'), /有效的日期时间/);
  assert.throws(() => timestampToDate('0', 'seconds', 'Mars/Base'), /无法识别这个时区/);
});

test('nonexistent daylight-saving time is rejected', () => {
  assert.throws(
    () => dateTimeToTimestamp('2024-03-10 02:30:00', 'America/New_York', 'seconds'),
    /夏令时切换而不存在/,
  );
});

test('ambiguous daylight-saving time selects the earlier instant and reports it', () => {
  const result = dateTimeToTimestamp('2024-11-03 01:30:00', 'America/New_York', 'seconds');

  assert.equal(result.timestamp, 1730611800);
  assert.equal(result.ambiguous, true);
  assert.equal(result.candidateCount, 2);
});
