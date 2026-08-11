(() => {
  'use strict';

  const {
    ERROR_CORRECTION_CAPACITY,
    calculateScanDimensions,
    formatFileSize,
    getUtf8ByteLength,
    normalizeGeneratorOptions,
    validateScanFile,
  } = window.QrCodeToolCore;

  const qrContent = document.getElementById('qrContent');
  const contentCount = document.getElementById('contentCount');
  const qrSize = document.getElementById('qrSize');
  const errorLevel = document.getElementById('errorLevel');
  const darkColor = document.getElementById('darkColor');
  const lightColor = document.getElementById('lightColor');
  const darkColorValue = document.getElementById('darkColorValue');
  const lightColorValue = document.getElementById('lightColorValue');
  const generateButton = document.getElementById('generateButton');
  const resetGenerator = document.getElementById('resetGenerator');
  const qrCanvas = document.getElementById('qrCanvas');
  const generatorPlaceholder = document.getElementById('generatorPlaceholder');
  const downloadQr = document.getElementById('downloadQr');
  const copyQrContent = document.getElementById('copyQrContent');
  const generatorStatus = document.getElementById('generatorStatus');

  const qrImageInput = document.getElementById('qrImageInput');
  const qrDropZone = document.getElementById('qrDropZone');
  const scanPreview = document.getElementById('scanPreview');
  const scanPreviewImage = document.getElementById('scanPreviewImage');
  const scanFileName = document.getElementById('scanFileName');
  const scanFileMeta = document.getElementById('scanFileMeta');
  const scanButton = document.getElementById('scanButton');
  const clearScan = document.getElementById('clearScan');
  const scanResult = document.getElementById('scanResult');
  const copyScanResult = document.getElementById('copyScanResult');
  const scannerStatus = document.getElementById('scannerStatus');

  let generatedContent = '';
  let selectedScanFile = null;
  let selectedScanUrl = '';
  let scanning = false;

  const hasGeneratorDependency = () => Boolean(window.QRCode && typeof window.QRCode.toCanvas === 'function');
  const hasScannerDependency = () => typeof window.jsQR === 'function';

  const setGeneratorStatus = (message, type = '') => {
    generatorStatus.textContent = message;
    generatorStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const setScannerStatus = (message, type = '') => {
    scannerStatus.textContent = message;
    scannerStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const updateContentCount = () => {
    const bytes = getUtf8ByteLength(qrContent.value);
    const capacity = ERROR_CORRECTION_CAPACITY[errorLevel.value] ?? ERROR_CORRECTION_CAPACITY.M;
    contentCount.textContent = `${bytes} / ${capacity} 字节`;
    contentCount.classList.toggle('is-over-limit', bytes > capacity);
  };

  const clearGeneratedQr = () => {
    generatedContent = '';
    const context = qrCanvas.getContext('2d');
    if (context) context.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    qrCanvas.hidden = true;
    generatorPlaceholder.hidden = false;
    downloadQr.disabled = true;
    copyQrContent.disabled = true;
  };

  const invalidateGeneratedQr = (message) => {
    if (!generatedContent) return;
    clearGeneratedQr();
    setGeneratorStatus(message);
  };

  const setGeneratorBusy = (busy) => {
    qrContent.disabled = busy;
    qrSize.disabled = busy;
    errorLevel.disabled = busy;
    darkColor.disabled = busy;
    lightColor.disabled = busy;
    resetGenerator.disabled = busy;
    generateButton.disabled = busy || !hasGeneratorDependency();
  };

  const renderQrCode = () => {
    qrContent.removeAttribute('aria-invalid');
    qrSize.removeAttribute('aria-invalid');

    if (!hasGeneratorDependency()) {
      setGeneratorStatus('二维码生成组件加载失败，请检查网络后刷新页面。', 'error');
      generateButton.disabled = true;
      return;
    }

    let options;
    try {
      options = normalizeGeneratorOptions({
        content: qrContent.value,
        darkColor: darkColor.value,
        errorCorrectionLevel: errorLevel.value,
        lightColor: lightColor.value,
        size: qrSize.value,
      });
    } catch (error) {
      clearGeneratedQr();
      if (!qrContent.value.trim() || /字节/.test(error.message)) {
        qrContent.setAttribute('aria-invalid', 'true');
        qrContent.focus();
      } else if (/尺寸|像素|整数/.test(error.message)) {
        qrSize.setAttribute('aria-invalid', 'true');
        qrSize.focus();
      }
      setGeneratorStatus(error.message || '请检查二维码设置。', 'error');
      return;
    }

    setGeneratorBusy(true);
    setGeneratorStatus('正在生成二维码…');
    try {
      window.QRCode.toCanvas(qrCanvas, options.content, {
        color: {
          dark: options.darkColor,
          light: options.lightColor,
        },
        errorCorrectionLevel: options.errorCorrectionLevel,
        margin: 2,
        width: options.size,
      }, error => {
        setGeneratorBusy(false);
        if (error) {
          clearGeneratedQr();
          setGeneratorStatus(`生成失败：${error.message || '内容可能过长，请缩短后重试。'}`, 'error');
          return;
        }

        generatedContent = options.content;
        qrCanvas.hidden = false;
        generatorPlaceholder.hidden = true;
        downloadQr.disabled = false;
        copyQrContent.disabled = false;
        setGeneratorStatus(
          `二维码已生成：${options.size} × ${options.size} px，纠错等级 ${options.errorCorrectionLevel}。`,
          'success',
        );
      });
    } catch (error) {
      setGeneratorBusy(false);
      clearGeneratedQr();
      setGeneratorStatus(`生成失败：${error.message || '内容可能过长，请缩短后重试。'}`, 'error');
    }
  };

  const resetGeneratorForm = () => {
    qrContent.value = '';
    qrSize.value = '320';
    errorLevel.value = 'M';
    darkColor.value = '#15231f';
    lightColor.value = '#ffffff';
    darkColorValue.textContent = darkColor.value;
    lightColorValue.textContent = lightColor.value;
    qrContent.removeAttribute('aria-invalid');
    qrSize.removeAttribute('aria-invalid');
    clearGeneratedQr();
    updateContentCount();
    setGeneratorStatus(
      hasGeneratorDependency()
        ? '输入文本或网址并设置样式，然后生成二维码。'
        : '二维码生成组件加载失败，请检查网络后刷新页面。',
      hasGeneratorDependency() ? '' : 'error',
    );
    qrContent.focus();
  };

  const downloadCanvas = () => {
    if (!generatedContent || qrCanvas.hidden) return;
    qrCanvas.toBlob(blob => {
      if (!blob) {
        setGeneratorStatus('浏览器未能导出 PNG 图片，请重试。', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode-${Date.now()}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      window.Toolbox.showToast('二维码 PNG 已下载');
    }, 'image/png');
  };

  const cleanupScanUrl = () => {
    if (!selectedScanUrl) return;
    URL.revokeObjectURL(selectedScanUrl);
    selectedScanUrl = '';
  };

  const resetScanResult = () => {
    scanResult.value = '';
    copyScanResult.disabled = true;
  };

  const setScanning = (busy) => {
    scanning = busy;
    qrImageInput.disabled = busy;
    clearScan.disabled = busy || !selectedScanFile;
    scanButton.disabled = busy || !selectedScanFile || !hasScannerDependency();
  };

  const loadImageElement = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('浏览器无法读取这张图片。'));
    image.src = url;
  });

  const decodeScanSource = async () => {
    if (typeof window.createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(selectedScanFile, { imageOrientation: 'from-image' });
        return {
          cleanup: () => bitmap.close(),
          height: bitmap.height,
          source: bitmap,
          width: bitmap.width,
        };
      } catch (error) {
        // 部分图片格式不支持 ImageBitmap，继续使用 img 元素读取。
      }
    }

    const image = await loadImageElement(selectedScanUrl);
    return {
      cleanup: () => {},
      height: image.naturalHeight,
      source: image,
      width: image.naturalWidth,
    };
  };

  const scanSelectedImage = async () => {
    if (scanning || !selectedScanFile) return;
    if (!hasScannerDependency()) {
      scanButton.disabled = true;
      setScannerStatus('二维码识别组件加载失败，请检查网络后刷新页面。', 'error');
      return;
    }

    resetScanResult();
    setScanning(true);
    setScannerStatus(`正在识别 ${selectedScanFile.name}…`);
    let decoded;
    try {
      decoded = await decodeScanSource();
      const dimensions = calculateScanDimensions(decoded.width, decoded.height);
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('浏览器无法创建图片扫描环境。');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);
      const imageData = context.getImageData(0, 0, dimensions.width, dimensions.height);
      const result = window.jsQR(imageData.data, dimensions.width, dimensions.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (!result) {
        setScannerStatus('未识别到二维码。请尝试更清晰、对比度更高且二维码占比更大的图片。', 'error');
        return;
      }

      scanResult.value = result.data;
      copyScanResult.disabled = result.data.length === 0;
      setScannerStatus(
        result.data.length
          ? `识别成功，共 ${Array.from(result.data).length} 个字符。`
          : '识别到一个内容为空的二维码。',
        'success',
      );
    } catch (error) {
      setScannerStatus(error.message || '图片识别失败，请更换图片后重试。', 'error');
    } finally {
      if (decoded) decoded.cleanup();
      setScanning(false);
    }
  };

  const selectScanFile = (file) => {
    if (scanning) return;
    try {
      validateScanFile(file);
    } catch (error) {
      setScannerStatus(error.message || '请选择有效的二维码图片。', 'error');
      qrImageInput.value = '';
      return;
    }

    cleanupScanUrl();
    selectedScanFile = file;
    selectedScanUrl = URL.createObjectURL(file);
    scanPreviewImage.src = selectedScanUrl;
    scanFileName.textContent = file.name;
    scanFileName.title = file.name;
    scanFileMeta.textContent = `${formatFileSize(file.size)} · ${file.type || '按扩展名识别'}`;
    scanPreview.hidden = false;
    resetScanResult();
    clearScan.disabled = false;
    scanButton.disabled = !hasScannerDependency();

    if (!hasScannerDependency()) {
      setScannerStatus('图片已选择，但二维码识别组件加载失败。请检查网络后刷新页面。', 'error');
      return;
    }
    setScannerStatus('图片已选择，正在尝试识别…');
    void scanSelectedImage();
  };

  const clearSelectedScan = () => {
    cleanupScanUrl();
    selectedScanFile = null;
    qrImageInput.value = '';
    scanPreviewImage.removeAttribute('src');
    scanFileName.textContent = '';
    scanFileName.removeAttribute('title');
    scanFileMeta.textContent = '';
    scanPreview.hidden = true;
    resetScanResult();
    scanButton.disabled = true;
    clearScan.disabled = true;
    setScannerStatus(
      hasScannerDependency()
        ? '请选择或拖入一张二维码图片，页面会自动尝试识别。'
        : '二维码识别组件加载失败，请检查网络后刷新页面。',
      hasScannerDependency() ? '' : 'error',
    );
  };

  qrContent.addEventListener('input', () => {
    qrContent.removeAttribute('aria-invalid');
    updateContentCount();
    invalidateGeneratedQr('内容已修改，请重新生成二维码。');
  });
  qrContent.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      renderQrCode();
    }
  });
  qrSize.addEventListener('input', () => {
    qrSize.removeAttribute('aria-invalid');
    invalidateGeneratedQr('尺寸已修改，请重新生成二维码。');
  });
  errorLevel.addEventListener('change', () => {
    updateContentCount();
    invalidateGeneratedQr('纠错等级已修改，请重新生成二维码。');
  });
  darkColor.addEventListener('input', () => {
    darkColorValue.textContent = darkColor.value;
    invalidateGeneratedQr('前景色已修改，请重新生成二维码。');
  });
  lightColor.addEventListener('input', () => {
    lightColorValue.textContent = lightColor.value;
    invalidateGeneratedQr('背景色已修改，请重新生成二维码。');
  });

  generateButton.addEventListener('click', renderQrCode);
  resetGenerator.addEventListener('click', resetGeneratorForm);
  downloadQr.addEventListener('click', downloadCanvas);
  copyQrContent.addEventListener('click', () => {
    if (generatedContent) window.Toolbox.copyText(generatedContent, '二维码原文已复制');
  });

  qrImageInput.addEventListener('change', () => {
    const [file] = qrImageInput.files;
    if (file) selectScanFile(file);
  });
  scanButton.addEventListener('click', () => void scanSelectedImage());
  clearScan.addEventListener('click', clearSelectedScan);
  copyScanResult.addEventListener('click', () => {
    if (scanResult.value) window.Toolbox.copyText(scanResult.value, '识别结果已复制');
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    qrDropZone.addEventListener(eventName, event => {
      event.preventDefault();
      if (!scanning) qrDropZone.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach(eventName => {
    qrDropZone.addEventListener(eventName, event => {
      event.preventDefault();
      qrDropZone.classList.remove('is-dragging');
    });
  });
  qrDropZone.addEventListener('drop', event => {
    if (scanning) return;
    const [file] = event.dataTransfer.files;
    if (file) selectScanFile(file);
  });

  window.addEventListener('beforeunload', cleanupScanUrl);

  updateContentCount();
  generateButton.disabled = !hasGeneratorDependency();
  scanButton.disabled = true;
  setGeneratorStatus(
    hasGeneratorDependency()
      ? '输入文本或网址并设置样式，然后生成二维码。'
      : '二维码生成组件加载失败，请检查网络后刷新页面。',
    hasGeneratorDependency() ? '' : 'error',
  );
  setScannerStatus(
    hasScannerDependency()
      ? '请选择或拖入一张二维码图片，页面会自动尝试识别。'
      : '二维码识别组件加载失败，请检查网络后刷新页面。',
    hasScannerDependency() ? '' : 'error',
  );
})();
