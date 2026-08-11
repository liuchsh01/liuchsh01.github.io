((root, factory) => {
  'use strict';

  const api = factory();
  root.RegexTesterCore = api;

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, () => {
  'use strict';

  const SUPPORTED_FLAGS = 'gimsu';

  const normalizeFlags = (flags = '') => SUPPORTED_FLAGS
    .split('')
    .filter(flag => String(flags).includes(flag))
    .join('');

  const compileRegex = (pattern, flags = '') => new RegExp(String(pattern), normalizeFlags(flags));

  const advanceStringIndex = (text, index, unicode) => {
    if (!unicode || index + 1 >= text.length) return index + 1;
    const first = text.charCodeAt(index);
    if (first < 0xD800 || first > 0xDBFF) return index + 1;
    const second = text.charCodeAt(index + 1);
    return second >= 0xDC00 && second <= 0xDFFF ? index + 2 : index + 1;
  };

  const serializeMatch = (match) => ({
    index: match.index,
    end: match.index + match[0].length,
    value: match[0],
    captures: match.slice(1).map((value, captureIndex) => ({
      index: captureIndex + 1,
      value,
    })),
    namedGroups: Object.entries(match.groups || {}).map(([name, value]) => ({ name, value })),
  });

  const collectMatches = (pattern, text, flags = '', maxMatches = 1000) => {
    const sourceText = String(text);
    const limit = Math.max(1, Number(maxMatches) || 1);
    const regex = compileRegex(pattern, flags);
    const iterative = regex.global || regex.sticky;
    const matches = [];
    let truncated = false;

    while (matches.length < limit) {
      const match = regex.exec(sourceText);
      if (!match) break;
      matches.push(serializeMatch(match));

      if (!iterative) break;
      if (match[0] === '') {
        regex.lastIndex = advanceStringIndex(sourceText, regex.lastIndex, regex.unicode);
      }
    }

    if (iterative && matches.length === limit) {
      truncated = regex.exec(sourceText) !== null;
    }

    return {
      flags: regex.flags,
      matches,
      truncated,
    };
  };

  const replaceMatches = (pattern, text, flags = '', replacement = '') => String(text)
    .replace(compileRegex(pattern, flags), String(replacement));

  return {
    SUPPORTED_FLAGS,
    normalizeFlags,
    compileRegex,
    collectMatches,
    replaceMatches,
  };
});
