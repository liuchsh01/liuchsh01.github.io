((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.TextListOrganizerCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const SORT_MODES = new Set(['none', 'asc', 'desc']);
  const CASE_MODES = new Set(['none', 'upper', 'lower']);
  const SET_OPERATIONS = new Set(['intersection', 'difference-a', 'difference-b', 'union']);

  const splitLines = (value) => {
    const text = String(value ?? '');
    return text === '' ? [] : text.split(/\r\n?|\n/);
  };

  const getComparisonKey = (value, caseSensitive = false) => (
    caseSensitive ? value : value.toLocaleLowerCase('zh-CN')
  );

  const deduplicateLines = (lines, caseSensitive = false) => {
    const seen = new Set();
    return lines.filter(line => {
      const key = getComparisonKey(line, caseSensitive);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const naturalSortLines = (lines, direction = 'asc', caseSensitive = false) => {
    if (!['asc', 'desc'].includes(direction)) {
      throw new Error('排序方向必须是升序或降序。');
    }
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...lines].sort((left, right) => multiplier * left.localeCompare(right, 'zh-CN', {
      numeric: true,
      sensitivity: caseSensitive ? 'variant' : 'base',
    }));
  };

  const normalizeOrganizeOptions = (options = {}) => {
    const sort = String(options.sort ?? 'none');
    const caseTransform = String(options.caseTransform ?? 'none');
    if (!SORT_MODES.has(sort)) throw new Error('排序方式无效。');
    if (!CASE_MODES.has(caseTransform)) throw new Error('大小写转换方式无效。');
    return {
      caseSensitive: Boolean(options.caseSensitive),
      caseTransform,
      deduplicate: Boolean(options.deduplicate),
      prefix: String(options.prefix ?? ''),
      removeEmpty: Boolean(options.removeEmpty),
      sort,
      suffix: String(options.suffix ?? ''),
      trim: Boolean(options.trim),
    };
  };

  const organizeLines = (value, options = {}) => {
    const settings = normalizeOrganizeOptions(options);
    let lines = splitLines(value);

    if (settings.trim) lines = lines.map(line => line.trim());
    if (settings.removeEmpty) lines = lines.filter(line => line.length > 0);
    if (settings.caseTransform === 'upper') lines = lines.map(line => line.toLocaleUpperCase('zh-CN'));
    if (settings.caseTransform === 'lower') lines = lines.map(line => line.toLocaleLowerCase('zh-CN'));
    if (settings.deduplicate) lines = deduplicateLines(lines, settings.caseSensitive);
    if (settings.sort !== 'none') lines = naturalSortLines(lines, settings.sort, settings.caseSensitive);
    if (settings.prefix || settings.suffix) {
      lines = lines.map(line => `${settings.prefix}${line}${settings.suffix}`);
    }
    return lines;
  };

  const prepareSetLines = (value, options = {}) => {
    const trim = options.trim !== false;
    const removeEmpty = options.removeEmpty !== false;
    const caseSensitive = Boolean(options.caseSensitive);
    let lines = splitLines(value);
    if (trim) lines = lines.map(line => line.trim());
    if (removeEmpty) lines = lines.filter(line => line.length > 0);
    return deduplicateLines(lines, caseSensitive);
  };

  const performSetOperation = (leftValue, rightValue, operation, options = {}) => {
    if (!SET_OPERATIONS.has(operation)) throw new Error('集合运算类型无效。');
    const caseSensitive = Boolean(options.caseSensitive);
    const left = prepareSetLines(leftValue, options);
    const right = prepareSetLines(rightValue, options);
    const leftKeys = new Set(left.map(line => getComparisonKey(line, caseSensitive)));
    const rightKeys = new Set(right.map(line => getComparisonKey(line, caseSensitive)));

    if (operation === 'intersection') {
      return left.filter(line => rightKeys.has(getComparisonKey(line, caseSensitive)));
    }
    if (operation === 'difference-a') {
      return left.filter(line => !rightKeys.has(getComparisonKey(line, caseSensitive)));
    }
    if (operation === 'difference-b') {
      return right.filter(line => !leftKeys.has(getComparisonKey(line, caseSensitive)));
    }
    return deduplicateLines([...left, ...right], caseSensitive);
  };

  const countLines = (value) => splitLines(value).length;
  const joinLines = lines => lines.join('\n');

  return {
    countLines,
    deduplicateLines,
    getComparisonKey,
    joinLines,
    naturalSortLines,
    normalizeOrganizeOptions,
    organizeLines,
    performSetOperation,
    prepareSetLines,
    splitLines,
  };
});
