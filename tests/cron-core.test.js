const test = require('node:test');
const assert = require('node:assert/strict');
const {
  describeCron,
  findNextOccurrences,
  matchesCron,
  parseCron,
} = require('../tools/20260811_cron-expression-tool/cron-core.js');

test('parses wildcard, steps, ranges, lists and weekday aliases', () => {
  const parsed = parseCron('*/15 9-17 * JAN,MAR MON-FRI');

  assert.deepEqual(parsed.fields.minute.values, [0, 15, 30, 45]);
  assert.deepEqual(parsed.fields.hour.values, [9, 10, 11, 12, 13, 14, 15, 16, 17]);
  assert.deepEqual(parsed.fields.month.values, [1, 3]);
  assert.deepEqual(parsed.fields.dayOfWeek.values, [1, 2, 3, 4, 5]);
});

test('expands common aliases to five-field expressions', () => {
  assert.equal(parseCron('@hourly').normalized, '0 * * * *');
  assert.equal(parseCron('@daily').normalized, '0 0 * * *');
  assert.equal(parseCron('@weekly').normalized, '0 0 * * 0');
});

test('rejects invalid field counts, values, ranges and steps', () => {
  assert.throws(() => parseCron('* * * *'), /5 段/);
  assert.throws(() => parseCron('60 * * * *'), /0-59/);
  assert.throws(() => parseCron('* 18-9 * * *'), /起点不能大于终点/);
  assert.throws(() => parseCron('*/0 * * * *'), /步长必须是正整数/);
  assert.throws(() => parseCron('* * * FOO *'), /无法识别/);
});

test('treats both 0 and 7 as Sunday', () => {
  const sunday = new Date(2026, 7, 16, 9, 0, 0);
  assert.equal(matchesCron(sunday, parseCron('0 9 * * 0')), true);
  assert.equal(matchesCron(sunday, parseCron('0 9 * * 7')), true);
});

test('uses traditional cron OR semantics when date and weekday are both restricted', () => {
  const mondayNotFirst = new Date(2026, 7, 17, 9, 0, 0);
  const firstNotMonday = new Date(2026, 8, 1, 9, 0, 0);
  const neither = new Date(2026, 8, 2, 9, 0, 0);
  const schedule = parseCron('0 9 1 * 1');

  assert.equal(matchesCron(mondayNotFirst, schedule), true);
  assert.equal(matchesCron(firstNotMonday, schedule), true);
  assert.equal(matchesCron(neither, schedule), false);
});

test('finds future daily executions strictly after the starting time', () => {
  const start = new Date(2026, 7, 11, 9, 0, 0);
  const results = findNextOccurrences('0 9 * * *', start, 2);

  assert.deepEqual(
    results.map(date => [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()]),
    [
      [2026, 8, 12, 9, 0],
      [2026, 8, 13, 9, 0],
    ],
  );
});

test('finds only weekday executions for a workday schedule', () => {
  const fridayAfterRun = new Date(2026, 7, 14, 10, 0, 0);
  const [next] = findNextOccurrences('0 9 * * 1-5', fridayAfterRun, 1);

  assert.equal(next.getDay(), 1);
  assert.equal(next.getDate(), 17);
  assert.equal(next.getHours(), 9);
});

test('reports impossible date and month combinations within the search window', () => {
  const start = new Date(2026, 0, 1, 0, 0, 0);
  assert.throws(
    () => findNextOccurrences('0 0 31 2 *', start, 1, { maxYears: 2 }),
    /找不到足够的执行时间/,
  );
});

test('creates concise Chinese descriptions for common schedules', () => {
  assert.equal(describeCron('* * * * *'), '每分钟执行一次。');
  assert.equal(describeCron('*/5 * * * *'), '每 5 分钟执行一次。');
  assert.equal(describeCron('0 9 * * *'), '每天 09:00 执行一次。');
  assert.equal(describeCron('0 9 * * 1-5'), '每周一、周二、周三、周四、周五 09:00 执行一次。');
});
