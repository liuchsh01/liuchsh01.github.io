((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.JsonYamlConverterCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const SUPPORTED_INDENTS = Object.freeze([2, 4]);

  const normalizeIndent = (value) => {
    const indent = Number(value);
    if (!SUPPORTED_INDENTS.includes(indent)) {
      throw new Error('缩进宽度只支持 2 个或 4 个空格。');
    }
    return indent;
  };

  const requireSource = (value, label) => {
    const source = String(value ?? '');
    if (!source.trim()) {
      throw new Error(`请输入需要转换的 ${label} 内容。`);
    }
    return source;
  };

  const requireYamlApi = (yamlApi) => {
    if (!yamlApi || typeof yamlApi.load !== 'function' || typeof yamlApi.dump !== 'function') {
      throw new Error('本地转换依赖 js-yaml 4.1.0 未能加载，请刷新页面或检查文件完整性。');
    }
    return yamlApi;
  };

  const parseJson = (value) => {
    const source = requireSource(value, 'JSON');
    try {
      return JSON.parse(source);
    } catch (error) {
      const detail = String(error?.message || '输入内容不符合 JSON 规范');
      throw new Error(`JSON 语法错误：${detail}`);
    }
  };

  const formatYamlError = (error) => {
    const detail = String(error?.reason || error?.message || '输入内容不符合 YAML 规范')
      .split('\n')[0]
      .trim();
    const line = Number.isInteger(error?.mark?.line) ? error.mark.line + 1 : null;
    const column = Number.isInteger(error?.mark?.column) ? error.mark.column + 1 : null;
    const location = line === null
      ? ''
      : `（第 ${line} 行${column === null ? '' : `，第 ${column} 列`}）`;
    return `YAML 语法错误${location}：${detail}`;
  };

  const convertJsonToYaml = (source, indentValue = 2, yamlApi) => {
    const indent = normalizeIndent(indentValue);
    const yaml = requireYamlApi(yamlApi);
    const value = parseJson(source);

    try {
      return yaml.dump(value, {
        indent,
        lineWidth: -1,
        noCompatMode: true,
        noRefs: true,
        sortKeys: false,
      });
    } catch (error) {
      throw new Error(`无法生成 YAML：${error?.message || '请检查输入内容'}`);
    }
  };

  const convertYamlToJson = (source, indentValue = 2, yamlApi) => {
    const indent = normalizeIndent(indentValue);
    const yaml = requireYamlApi(yamlApi);
    const text = requireSource(source, 'YAML');

    let value;
    try {
      value = yaml.load(text);
    } catch (error) {
      throw new Error(formatYamlError(error));
    }

    if (value === undefined) {
      throw new Error('YAML 文档没有可转换的数据，请输入对象、列表或标量值。');
    }

    try {
      const result = JSON.stringify(value, null, indent);
      if (result === undefined) {
        throw new Error('该 YAML 值无法表示为 JSON。');
      }
      return result;
    } catch (error) {
      if (/circular|cyclic|循环/i.test(String(error?.message))) {
        throw new Error('YAML 包含循环引用，无法转换为 JSON。');
      }
      throw new Error(`无法生成 JSON：${error?.message || '请检查 YAML 数据结构'}`);
    }
  };

  return {
    convertJsonToYaml,
    convertYamlToJson,
    formatYamlError,
    normalizeIndent,
    parseJson,
    requireYamlApi,
  };
});
