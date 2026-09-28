((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.UrlCodecCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const MODES = Object.freeze(['component', 'full', 'form']);
  const DIRECTIONS = Object.freeze(['encode', 'decode']);
  const MODE_HINTS = Object.freeze({
    component: '组件：编码为单个 URL 片段，保留字会被转义。',
    full: '完整 URL：保留 : / ? # 等 URL 结构字符。',
    form: '表单参数：按 application/x-www-form-urlencoded 编码；空格会转为 +。',
  });

  const requireText = (value) => {
    if (typeof value !== 'string') {
      throw new Error('请输入需要进行 URL 编解码的文本。');
    }
    return value;
  };

  const assertNoLoneSurrogates = text => {
    for (let index = 0; index < text.length; index += 1) {
      const codeUnit = text.charCodeAt(index);
      if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
        const next = text.charCodeAt(index + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) {
          throw new Error('文本包含无法进行 URL 编码的孤立代理项，请重新输入。');
        }
        index += 1;
      } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
        throw new Error('文本包含无法进行 URL 编码的孤立代理项，请重新输入。');
      }
    }
  };

  const validateOptions = options => {
    if (!options || typeof options !== 'object') {
      throw new Error('请选择 URL 编解码方向和模式。');
    }
    const { direction, mode } = options;
    if (!DIRECTIONS.includes(direction)) {
      throw new Error('URL 编解码方向无效，请选择编码或解码。');
    }
    if (!MODES.includes(mode)) {
      throw new Error('URL 编解码模式无效，请选择组件、完整 URL 或表单参数。');
    }
    return { direction, mode };
  };

  const encodeFormParameter = text => encodeURIComponent(text)
    .replace(/[!'()~]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');

  const decodeStrictly = (text, decoder) => {
    try {
      return decoder(text);
    } catch (error) {
      throw new Error('URL 编码无效：请检查百分号后的两位十六进制字符和 UTF-8 字节。本工具采用严格解码，不会像部分服务端那样保留或自动修复错误内容。');
    }
  };

  const getModeHint = mode => {
    if (!MODES.includes(mode)) {
      throw new Error('URL 编解码模式无效，请选择组件、完整 URL 或表单参数。');
    }
    return MODE_HINTS[mode];
  };

  const convertUrl = (value, options) => {
    const text = requireText(value);
    const { direction, mode } = validateOptions(options);

    if (direction === 'encode') {
      assertNoLoneSurrogates(text);
      if (mode === 'component') return encodeURIComponent(text);
      if (mode === 'full') return encodeURI(text);
      return encodeFormParameter(text);
    }

    if (mode === 'component') return decodeStrictly(text, decodeURIComponent);
    if (mode === 'full') return decodeStrictly(text, decodeURI);
    return decodeStrictly(text.replace(/\+/g, ' '), decodeURIComponent);
  };

  return {
    DIRECTIONS,
    MODES,
    assertNoLoneSurrogates,
    convertUrl,
    getModeHint,
  };
});
