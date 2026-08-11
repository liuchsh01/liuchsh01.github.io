((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.ImageConverterCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const MAX_OUTPUT_DIMENSION = 16_384;
  const MAX_OUTPUT_PIXELS = 100_000_000;
  const FORMATS = Object.freeze({
    jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
    png: { extension: 'png', mimeType: 'image/png' },
    webp: { extension: 'webp', mimeType: 'image/webp' },
  });

  const parseDimension = (value, label) => {
    const source = String(value ?? '').trim();
    if (!source) return null;
    const numeric = Number(source);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new Error(`${label}必须是正整数。`);
    }
    if (numeric > MAX_OUTPUT_DIMENSION) {
      throw new Error(`${label}不能超过 ${MAX_OUTPUT_DIMENSION} 像素。`);
    }
    return numeric;
  };

  const validateOutputSize = (width, height) => {
    if (width > MAX_OUTPUT_DIMENSION || height > MAX_OUTPUT_DIMENSION) {
      throw new Error(`输出宽高不能超过 ${MAX_OUTPUT_DIMENSION} 像素。`);
    }
    if (width * height > MAX_OUTPUT_PIXELS) {
      throw new Error('输出图片总像素不能超过 1 亿，请缩小宽度或高度。');
    }
    return { height, width };
  };

  const normalizeResizeRequest = (requestedWidth, requestedHeight, keepAspect) => {
    const width = parseDimension(requestedWidth, '输出宽度');
    const height = parseDimension(requestedHeight, '输出高度');
    const preserveAspect = Boolean(keepAspect);
    if (!preserveAspect && (width === null) !== (height === null)) {
      throw new Error('关闭等比例后，请同时填写输出宽度和高度。');
    }
    return { height, keepAspect: preserveAspect, width };
  };

  const normalizeLinkedResizeRequest = (
    requestedWidth,
    requestedHeight,
    keepAspect,
    derivedDimension,
  ) => {
    const preserveAspect = Boolean(keepAspect);
    const width = preserveAspect && derivedDimension === 'width' ? '' : requestedWidth;
    const height = preserveAspect && derivedDimension === 'height' ? '' : requestedHeight;
    return normalizeResizeRequest(width, height, preserveAspect);
  };

  const calculateOutputDimensions = (
    originalWidth,
    originalHeight,
    requestedWidth,
    requestedHeight,
    keepAspect,
  ) => {
    if (!Number.isInteger(originalWidth) || originalWidth <= 0
      || !Number.isInteger(originalHeight) || originalHeight <= 0) {
      throw new Error('原图尺寸无效，无法进行转换。');
    }

    const request = normalizeResizeRequest(requestedWidth, requestedHeight, keepAspect);
    const { height, width } = request;

    if (width === null && height === null) {
      return validateOutputSize(originalWidth, originalHeight);
    }

    if (!request.keepAspect) {
      return validateOutputSize(width, height);
    }

    let outputWidth;
    let outputHeight;
    if (width !== null && height !== null) {
      const scale = Math.min(width / originalWidth, height / originalHeight);
      outputWidth = Math.max(1, Math.round(originalWidth * scale));
      outputHeight = Math.max(1, Math.round(originalHeight * scale));
    } else if (width !== null) {
      outputWidth = width;
      outputHeight = Math.max(1, Math.round(originalHeight * (width / originalWidth)));
    } else {
      outputHeight = height;
      outputWidth = Math.max(1, Math.round(originalWidth * (height / originalHeight)));
    }

    return validateOutputSize(outputWidth, outputHeight);
  };

  const shareAspectRatio = (dimensions) => {
    if (!Array.isArray(dimensions) || dimensions.length < 2) return true;
    const [first, ...rest] = dimensions;
    const isValid = item => (
      Number.isInteger(item?.width) && item.width > 0
      && Number.isInteger(item?.height) && item.height > 0
    );
    if (!isValid(first) || rest.some(item => !isValid(item))) {
      throw new Error('图片尺寸无效，无法比较宽高比例。');
    }
    return rest.every(item => first.width * item.height === item.width * first.height);
  };

  const normalizeFormat = (format) => {
    const value = String(format || '').toLowerCase();
    if (!FORMATS[value]) throw new Error('请选择 PNG、JPEG 或 WebP 输出格式。');
    return value;
  };

  const getOutputMimeType = format => FORMATS[normalizeFormat(format)].mimeType;

  const getOutputFilename = (filename, format) => {
    const normalizedFormat = normalizeFormat(format);
    const sourceName = String(filename || 'image').trim() || 'image';
    const withoutExtension = sourceName.replace(/\.[^.]+$/, '') || 'image';
    return `${withoutExtension}-converted.${FORMATS[normalizedFormat].extension}`;
  };

  const normalizeQuality = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 1 || numeric > 100) {
      throw new Error('输出质量必须是 1 到 100 之间的数字。');
    }
    return numeric / 100;
  };

  const formatBytes = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(Math.floor(Math.log(numeric) / Math.log(1024)), units.length - 1);
    const size = numeric / (1024 ** unitIndex);
    const decimals = unitIndex === 0 || size >= 100 ? 0 : size >= 10 ? 1 : 1;
    return `${size.toFixed(decimals)} ${units[unitIndex]}`;
  };

  return {
    MAX_OUTPUT_DIMENSION,
    MAX_OUTPUT_PIXELS,
    calculateOutputDimensions,
    formatBytes,
    getOutputFilename,
    getOutputMimeType,
    normalizeFormat,
    normalizeLinkedResizeRequest,
    normalizeQuality,
    normalizeResizeRequest,
    shareAspectRatio,
  };
});
