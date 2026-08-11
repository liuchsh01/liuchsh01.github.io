((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SqlFormatterCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const DIALECTS = Object.freeze([
    'sql',
    'mysql',
    'mariadb',
    'postgresql',
    'sqlite',
    'transactsql',
    'bigquery',
    'snowflake',
    'redshift',
    'spark',
    'hive',
    'plsql',
    'db2',
  ]);
  const KEYWORD_CASES = Object.freeze(['preserve', 'upper', 'lower']);

  const normalizeOptions = (options = {}) => {
    const language = String(options.language || 'sql');
    if (!DIALECTS.includes(language)) throw new Error('请选择支持的 SQL 方言。');

    const tabWidth = Number(options.tabWidth ?? 2);
    if (![2, 4].includes(tabWidth)) throw new Error('缩进宽度必须是 2 或 4 个空格。');

    const keywordCase = String(options.keywordCase || 'upper');
    if (!KEYWORD_CASES.includes(keywordCase)) throw new Error('关键字大小写选项无效。');

    const linesBetweenQueries = Number(options.linesBetweenQueries ?? 1);
    if (![1, 2].includes(linesBetweenQueries)) throw new Error('语句间空行必须是 1 或 2。');

    const logicalOperatorNewline = String(options.logicalOperatorNewline || 'before');
    if (!['before', 'after'].includes(logicalOperatorNewline)) {
      throw new Error('逻辑运算符换行位置无效。');
    }

    return {
      keywordCase,
      language,
      linesBetweenQueries,
      logicalOperatorNewline,
      tabWidth,
    };
  };

  const readQuoted = (source, start, opener, closer = opener) => {
    let index = start + 1;
    while (index < source.length) {
      if (source[index] === closer) {
        if (source[index + 1] === closer) {
          index += 2;
          continue;
        }
        return index + 1;
      }
      if (source[index] === '\\' && opener !== '[') index += 1;
      index += 1;
    }
    return source.length;
  };

  const readLineComment = (source, start) => {
    let index = start + 2;
    while (index < source.length && source[index] !== '\n' && source[index] !== '\r') index += 1;
    return index;
  };

  const readBlockComment = (source, start) => {
    const closing = source.indexOf('*/', start + 2);
    return closing === -1 ? source.length : closing + 2;
  };

  const shouldSeparate = (left, right) => {
    if (!left || !right) return false;
    if ('(.,'.includes(left) || '),.;'.includes(right)) return false;
    return true;
  };

  const minifySql = (value, options = {}) => {
    const source = String(value ?? '');
    const removeComments = Boolean(options.removeComments);
    let output = '';
    let pendingSpace = false;
    let index = 0;

    const appendChunk = (chunk) => {
      if (!chunk) return;
      if (pendingSpace && shouldSeparate(output.at(-1), chunk[0])) output += ' ';
      output += chunk;
      pendingSpace = false;
    };

    while (index < source.length) {
      const character = source[index];
      if (/\s/.test(character)) {
        pendingSpace = output.length > 0;
        index += 1;
        continue;
      }

      if (character === '-' && source[index + 1] === '-') {
        const end = readLineComment(source, index);
        if (!removeComments) {
          appendChunk(source.slice(index, end).trimEnd());
          output = `${output.trimEnd()}\n`;
        } else {
          pendingSpace = output.length > 0;
        }
        index = end;
        continue;
      }

      if (character === '/' && source[index + 1] === '*') {
        const end = readBlockComment(source, index);
        if (!removeComments) appendChunk(source.slice(index, end));
        else pendingSpace = output.length > 0;
        index = end;
        continue;
      }

      const quoteClosers = { "'": "'", '"': '"', '`': '`', '[': ']' };
      if (Object.hasOwn(quoteClosers, character)) {
        const end = readQuoted(source, index, character, quoteClosers[character]);
        appendChunk(source.slice(index, end));
        index = end;
        continue;
      }

      if ('(),.;'.includes(character)) {
        output = output.trimEnd();
        output += character;
        pendingSpace = character === ',' || character === ';';
        index += 1;
        continue;
      }

      appendChunk(character);
      index += 1;
    }

    return output.trim();
  };

  const countStatements = (value) => {
    const source = String(value ?? '');
    let count = 0;
    let segmentHasContent = false;
    let index = 0;

    while (index < source.length) {
      const character = source[index];
      if (character === '-' && source[index + 1] === '-') {
        index = readLineComment(source, index);
        continue;
      }
      if (character === '/' && source[index + 1] === '*') {
        index = readBlockComment(source, index);
        continue;
      }
      const quoteClosers = { "'": "'", '"': '"', '`': '`', '[': ']' };
      if (Object.hasOwn(quoteClosers, character)) {
        segmentHasContent = true;
        index = readQuoted(source, index, character, quoteClosers[character]);
        continue;
      }
      if (character === ';') {
        if (segmentHasContent) count += 1;
        segmentHasContent = false;
      } else if (!/\s/.test(character)) {
        segmentHasContent = true;
      }
      index += 1;
    }
    return count + (segmentHasContent ? 1 : 0);
  };

  const getDownloadFilename = (language, compact = false) => {
    const normalized = DIALECTS.includes(language) ? language : 'sql';
    return `formatted-${normalized}${compact ? '-minified' : ''}.sql`;
  };

  return {
    DIALECTS,
    countStatements,
    getDownloadFilename,
    minifySql,
    normalizeOptions,
  };
});
