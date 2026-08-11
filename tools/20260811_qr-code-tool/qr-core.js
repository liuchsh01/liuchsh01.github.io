((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QrCodeToolCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const MIN_QR_SIZE = 128;
  const MAX_QR_SIZE = 2048;
  const MAX_SCAN_FILE_SIZE = 15 * 1024 * 1024;
  const ERROR_CORRECTION_CAPACITY = Object.freeze({
    L: 2953,
    M: 2331,
    Q: 1663,
    H: 1273,
  });
  const SCANNABLE_MIME_TYPES = new Set([
    'image/bmp',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);
  const SCANNABLE_EXTENSION = /\.(?:bmp|gif|jpe?g|png|webp)$/i;

  const getUtf8ByteLength = value => new TextEncoder().encode(String(value ?? '')).length;

  const normalizeErrorCorrectionLevel = (value) => {
    const level = String(value ?? '').trim().toUpperCase();
    if (!Object.hasOwn(ERROR_CORRECTION_CAPACITY, level)) {
      throw new Error('纠错等级必须是 L、M、Q 或 H。');
    }
    return level;
  };

  const normalizeQrContent = (value, errorCorrectionLevel = 'M') => {
    const content = String(value ?? '');
    if (!content.trim()) {
      throw new Error('请输入需要生成二维码的文本或网址。');
    }

    const level = normalizeErrorCorrectionLevel(errorCorrectionLevel);
    const byteLength = getUtf8ByteLength(content);
    const capacity = ERROR_CORRECTION_CAPACITY[level];
    if (byteLength > capacity) {
      throw new Error(`当前纠错等级最多支持约 ${capacity} 个 UTF-8 字节，现有 ${byteLength} 字节。`);
    }
    return content;
  };

  const normalizeQrSize = (value) => {
    const size = Number(value);
    if (!Number.isInteger(size)) {
      throw new Error('二维码尺寸必须是整数。');
    }
    if (size < MIN_QR_SIZE || size > MAX_QR_SIZE) {
      throw new Error(`二维码尺寸应在 ${MIN_QR_SIZE} 到 ${MAX_QR_SIZE} 像素之间。`);
    }
    return size;
  };

  const normalizeHexColor = (value, label = '颜色') => {
    const color = String(value ?? '').trim();
    if (/^#[\da-f]{6}$/i.test(color)) return color.toLowerCase();
    if (/^#[\da-f]{3}$/i.test(color)) {
      return `#${color.slice(1).split('').map(character => character.repeat(2)).join('')}`.toLowerCase();
    }
    throw new Error(`${label}必须是有效的十六进制颜色。`);
  };

  const normalizeGeneratorOptions = (options = {}) => {
    const errorCorrectionLevel = normalizeErrorCorrectionLevel(options.errorCorrectionLevel ?? 'M');
    const darkColor = normalizeHexColor(options.darkColor ?? '#15231f', '前景色');
    const lightColor = normalizeHexColor(options.lightColor ?? '#ffffff', '背景色');
    if (darkColor === lightColor) {
      throw new Error('前景色和背景色不能相同。');
    }

    return {
      content: normalizeQrContent(options.content, errorCorrectionLevel),
      darkColor,
      errorCorrectionLevel,
      lightColor,
      size: normalizeQrSize(options.size ?? 320),
    };
  };

  const validateScanFile = (file) => {
    if (!file || typeof file.name !== 'string') {
      throw new Error('请选择二维码图片。');
    }
    const size = Number(file.size);
    if (!Number.isFinite(size) || size <= 0) {
      throw new Error('图片文件为空或大小无效。');
    }
    if (size > MAX_SCAN_FILE_SIZE) {
      throw new Error('二维码图片不能超过 15 MB。');
    }

    const type = String(file.type ?? '').toLowerCase();
    if (!SCANNABLE_MIME_TYPES.has(type) && !SCANNABLE_EXTENSION.test(file.name)) {
      throw new Error('请选择 PNG、JPEG、WebP、GIF 或 BMP 图片。');
    }
    return file;
  };

  const calculateScanDimensions = (width, height, maxEdge = 2400, maxPixels = 16_000_000) => {
    const sourceWidth = Number(width);
    const sourceHeight = Number(height);
    if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight)
      || sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error('图片没有有效的宽高。');
    }
    if (!Number.isFinite(maxEdge) || maxEdge <= 0 || !Number.isFinite(maxPixels) || maxPixels <= 0) {
      throw new Error('扫描尺寸限制无效。');
    }

    const edgeScale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
    const pixelScale = Math.min(1, Math.sqrt(maxPixels / (sourceWidth * sourceHeight)));
    const scale = Math.min(edgeScale, pixelScale);
    return {
      height: Math.max(1, Math.round(sourceHeight * scale)),
      width: Math.max(1, Math.round(sourceWidth * scale)),
    };
  };

  const formatFileSize = (bytes) => {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size < 0) return '未知大小';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Number((size / 1024).toFixed(1))} KB`;
    return `${Number((size / (1024 * 1024)).toFixed(1))} MB`;
  };

  return {
    ERROR_CORRECTION_CAPACITY,
    MAX_QR_SIZE,
    MAX_SCAN_FILE_SIZE,
    MIN_QR_SIZE,
    calculateScanDimensions,
    formatFileSize,
    getUtf8ByteLength,
    normalizeErrorCorrectionLevel,
    normalizeGeneratorOptions,
    normalizeHexColor,
    normalizeQrContent,
    normalizeQrSize,
    validateScanFile,
  };
});
