(() => {
  'use strict';

  const {
    calculateOutputDimensions,
    formatBytes,
    getOutputFilename,
    getOutputMimeType,
    normalizeQuality,
    normalizeResizeRequest,
  } = window.ImageConverterCore;

  const MAX_FILES = 30;
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 250 * 1024 * 1024;
  const ACCEPTED_EXTENSIONS = /\.(?:png|jpe?g|webp|gif|bmp|svg)$/i;
  const imageInput = document.getElementById('imageInput');
  const imageDropZone = document.getElementById('imageDropZone');
  const imageFileList = document.getElementById('imageFileList');
  const fileCount = document.getElementById('fileCount');
  const clearImagesButton = document.getElementById('clearImages');
  const outputFormat = document.getElementById('outputFormat');
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const keepAspect = document.getElementById('keepAspect');
  const dimensionHint = document.getElementById('dimensionHint');
  const qualityField = document.getElementById('qualityField');
  const qualityInput = document.getElementById('qualityInput');
  const qualityValue = document.getElementById('qualityValue');
  const backgroundField = document.getElementById('backgroundField');
  const backgroundColor = document.getElementById('backgroundColor');
  const convertButton = document.getElementById('convertImages');
  const conversionStatus = document.getElementById('conversionStatus');
  const resultList = document.getElementById('resultList');
  const resultCount = document.getElementById('resultCount');
  const emptyState = document.getElementById('emptyState');
  const downloadAllButton = document.getElementById('downloadAll');

  let selectedImages = [];
  let conversionResults = [];
  let isBusy = false;
  let nextImageId = 1;

  const makeText = (tagName, className, value) => {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = value;
    return element;
  };

  const setStatus = (message, type = '') => {
    conversionStatus.textContent = message;
    conversionStatus.className = `status${type ? ` is-${type}` : ''}`;
  };

  const revokeResults = () => {
    conversionResults.forEach(result => {
      if (result.url) URL.revokeObjectURL(result.url);
    });
    conversionResults = [];
  };

  const resetResults = () => {
    revokeResults();
    resultList.replaceChildren();
    resultList.hidden = true;
    emptyState.hidden = false;
    resultCount.textContent = '0 项';
    downloadAllButton.disabled = true;
  };

  const invalidateResults = (message) => {
    if (!conversionResults.length) return;
    resetResults();
    setStatus(message);
  };

  const loadHtmlImage = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('浏览器无法解码这张图片。'));
    image.src = url;
  });

  const decodeImageSource = async (file, url) => {
    if (typeof window.createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        return {
          height: bitmap.height,
          source: bitmap,
          width: bitmap.width,
          cleanup: () => bitmap.close(),
        };
      } catch (error) {
        // SVG 和少数浏览器格式可能无法通过 ImageBitmap 解码，继续使用 img 回退。
      }
    }
    const image = await loadHtmlImage(url);
    return {
      height: image.naturalHeight,
      source: image,
      width: image.naturalWidth,
      cleanup: () => {},
    };
  };

  const getFileKey = file => `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
  const isAcceptedImage = file => file.type.startsWith('image/') || ACCEPTED_EXTENSIONS.test(file.name);

  const renderFiles = () => {
    imageFileList.replaceChildren();
    fileCount.textContent = `${selectedImages.length} 张`;

    if (!selectedImages.length) {
      imageFileList.append(makeText('li', 'file-list-empty', '尚未选择图片。'));
    } else {
      selectedImages.forEach(item => {
        const row = document.createElement('li');
        row.className = 'image-file-item';

        const thumbnail = document.createElement('img');
        thumbnail.className = 'source-thumbnail';
        thumbnail.src = item.url;
        thumbnail.alt = `${item.file.name} 预览`;

        const copy = document.createElement('div');
        copy.className = 'file-copy';
        const name = makeText('span', 'file-name', item.file.name);
        name.title = item.file.name;
        const meta = makeText(
          'span',
          'file-meta',
          `${item.width} × ${item.height} · ${formatBytes(item.file.size)}`,
        );
        copy.append(name, meta);

        const remove = makeText('button', 'remove-image', '移除');
        remove.type = 'button';
        remove.dataset.imageId = String(item.id);
        remove.setAttribute('aria-label', `移除图片 ${item.file.name}`);
        remove.disabled = isBusy;
        row.append(thumbnail, copy, remove);
        imageFileList.append(row);
      });
    }

    clearImagesButton.disabled = isBusy || selectedImages.length === 0;
    convertButton.disabled = isBusy || selectedImages.length === 0;
  };

  const addFiles = async (fileList) => {
    if (isBusy) return;
    const files = [...fileList];
    if (!files.length) return;
    const existingKeys = new Set(selectedImages.map(item => getFileKey(item.file)));
    const rejected = [];
    let totalSize = selectedImages.reduce((sum, item) => sum + item.file.size, 0);

    for (const file of files) {
      if (selectedImages.length >= MAX_FILES) {
        rejected.push(`${file.name}：最多选择 ${MAX_FILES} 张图片`);
        continue;
      }
      if (!isAcceptedImage(file)) {
        rejected.push(`${file.name}：不是支持的图片文件`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}：单张不能超过 100 MB`);
        continue;
      }
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        rejected.push(`${file.name}：所选图片总大小不能超过 250 MB`);
        continue;
      }
      const key = getFileKey(file);
      if (existingKeys.has(key)) continue;

      const url = URL.createObjectURL(file);
      try {
        setStatus(`正在读取 ${file.name}…`);
        const decoded = await decodeImageSource(file, url);
        try {
          if (!decoded.width || !decoded.height) throw new Error('图片没有有效的宽高。');
          selectedImages.push({
            file,
            height: decoded.height,
            id: nextImageId,
            url,
            width: decoded.width,
          });
          nextImageId += 1;
          existingKeys.add(key);
          totalSize += file.size;
        } finally {
          decoded.cleanup();
        }
      } catch (error) {
        URL.revokeObjectURL(url);
        rejected.push(`${file.name}：${error.message || '无法读取'}`);
      }
    }

    invalidateResults('图片列表已修改，请重新转换。');
    renderFiles();
    if (rejected.length) {
      setStatus(`已选择 ${selectedImages.length} 张图片；${rejected.length} 张未加入。${rejected[0]}`, 'error');
    } else {
      setStatus(`已选择 ${selectedImages.length} 张图片，可设置格式和尺寸后转换。`, 'success');
    }
  };

  const canvasToBlob = (canvas, mimeType, quality) => new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('浏览器未能生成输出图片。'));
        return;
      }
      if (blob.type && blob.type !== mimeType) {
        reject(new Error(`当前浏览器不支持输出 ${mimeType}。`));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });

  const convertOne = async (item, settings) => {
    const decoded = await decodeImageSource(item.file, item.url);
    try {
      const dimensions = calculateOutputDimensions(
        decoded.width,
        decoded.height,
        settings.width,
        settings.height,
        settings.keepAspect,
      );
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d', { alpha: settings.format !== 'jpeg' });
      if (!context) throw new Error('浏览器无法创建 Canvas 绘图环境。');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      if (settings.format === 'jpeg') {
        context.fillStyle = settings.background;
        context.fillRect(0, 0, dimensions.width, dimensions.height);
      }
      context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);
      const mimeType = getOutputMimeType(settings.format);
      const blob = await canvasToBlob(canvas, mimeType, settings.format === 'png' ? undefined : settings.quality);
      return {
        blob,
        filename: getOutputFilename(item.file.name, settings.format),
        height: dimensions.height,
        item,
        mimeType,
        url: URL.createObjectURL(blob),
        width: dimensions.width,
      };
    } finally {
      decoded.cleanup();
    }
  };

  const renderResults = (results) => {
    conversionResults = results;
    resultList.replaceChildren();

    results.forEach(result => {
      const card = document.createElement('article');
      card.className = `image-result-card${result.error ? ' is-error' : ''}`;

      if (!result.error) {
        const previewWrap = document.createElement('div');
        previewWrap.className = 'result-preview-wrap';
        const preview = document.createElement('img');
        preview.className = 'result-preview';
        preview.src = result.url;
        preview.alt = `${result.filename} 转换预览`;
        previewWrap.append(preview);
        card.append(previewWrap);
      }

      const copy = document.createElement('div');
      copy.className = 'result-copy';
      const title = makeText('h3', '', result.error ? result.item.file.name : result.filename);
      title.title = title.textContent;
      copy.append(title);

      if (result.error) {
        copy.append(makeText('p', 'result-error', result.error));
      } else {
        const details = document.createElement('div');
        details.className = 'result-details';
        details.append(
          makeText('span', '', `原图：${result.item.width} × ${result.item.height} · ${formatBytes(result.item.file.size)}`),
          makeText('span', '', `输出：${result.width} × ${result.height} · ${formatBytes(result.blob.size)}`),
          makeText('span', '', result.mimeType),
        );
        const download = makeText('a', 'button secondary-button download-image', '下载图片');
        download.href = result.url;
        download.download = result.filename;
        copy.append(details, download);
      }
      card.append(copy);
      resultList.append(card);
    });

    const validCount = results.filter(result => !result.error).length;
    resultList.hidden = results.length === 0;
    emptyState.hidden = results.length > 0;
    resultCount.textContent = `${results.length} 项`;
    downloadAllButton.disabled = validCount === 0;
  };

  const setBusy = (busy) => {
    isBusy = busy;
    imageInput.disabled = busy;
    outputFormat.disabled = busy;
    widthInput.disabled = busy;
    heightInput.disabled = busy;
    keepAspect.disabled = busy;
    qualityInput.disabled = busy || outputFormat.value === 'png';
    backgroundColor.disabled = busy || outputFormat.value !== 'jpeg';
    renderFiles();
  };

  const convertImages = async () => {
    if (isBusy || !selectedImages.length) return;
    widthInput.removeAttribute('aria-invalid');
    heightInput.removeAttribute('aria-invalid');
    let settings;
    try {
      normalizeResizeRequest(widthInput.value, heightInput.value, keepAspect.checked);
      settings = {
        background: backgroundColor.value,
        format: outputFormat.value,
        height: heightInput.value,
        keepAspect: keepAspect.checked,
        quality: normalizeQuality(qualityInput.value),
        width: widthInput.value,
      };
    } catch (error) {
      widthInput.setAttribute('aria-invalid', 'true');
      heightInput.setAttribute('aria-invalid', 'true');
      setStatus(error.message || '请检查输出尺寸。', 'error');
      return;
    }

    resetResults();
    setBusy(true);
    const results = [];
    try {
      for (let index = 0; index < selectedImages.length; index += 1) {
        const item = selectedImages[index];
        setStatus(`正在转换 ${index + 1} / ${selectedImages.length}：${item.file.name}`);
        try {
          results.push(await convertOne(item, settings));
        } catch (error) {
          results.push({ item, error: error.message || '图片转换失败。' });
        }
      }
      renderResults(results);
      const failedCount = results.filter(result => result.error).length;
      setStatus(
        failedCount
          ? `已处理 ${results.length} 张图片，其中 ${failedCount} 张转换失败。`
          : `已完成 ${results.length} 张图片转换。`,
        failedCount ? 'error' : 'success',
      );
    } finally {
      setBusy(false);
    }
  };

  const syncFormatControls = () => {
    const isPng = outputFormat.value === 'png';
    const isJpeg = outputFormat.value === 'jpeg';
    qualityInput.disabled = isBusy || isPng;
    qualityField.classList.toggle('is-disabled', isPng);
    backgroundField.hidden = !isJpeg;
    backgroundColor.disabled = isBusy || !isJpeg;
  };

  imageInput.addEventListener('change', () => {
    addFiles(imageInput.files);
    imageInput.value = '';
  });

  imageDropZone.addEventListener('dragover', event => {
    event.preventDefault();
    if (!isBusy) imageDropZone.classList.add('is-dragging');
  });
  imageDropZone.addEventListener('dragleave', () => imageDropZone.classList.remove('is-dragging'));
  imageDropZone.addEventListener('drop', event => {
    event.preventDefault();
    imageDropZone.classList.remove('is-dragging');
    addFiles(event.dataTransfer.files);
  });

  imageFileList.addEventListener('click', event => {
    const button = event.target.closest('button[data-image-id]');
    if (!button || isBusy) return;
    const id = Number(button.dataset.imageId);
    const item = selectedImages.find(image => image.id === id);
    if (item) URL.revokeObjectURL(item.url);
    selectedImages = selectedImages.filter(image => image.id !== id);
    invalidateResults('图片列表已修改，请重新转换。');
    renderFiles();
    setStatus(selectedImages.length ? `剩余 ${selectedImages.length} 张图片。` : '请先选择至少一张图片。');
  });

  clearImagesButton.addEventListener('click', () => {
    if (isBusy) return;
    selectedImages.forEach(item => URL.revokeObjectURL(item.url));
    selectedImages = [];
    imageInput.value = '';
    resetResults();
    renderFiles();
    setStatus('图片和转换结果已清空。');
  });

  outputFormat.addEventListener('change', () => {
    syncFormatControls();
    invalidateResults('输出格式已修改，请重新转换。');
  });
  [widthInput, heightInput].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    invalidateResults('输出尺寸已修改，请重新转换。');
  }));
  keepAspect.addEventListener('change', () => {
    dimensionHint.textContent = keepAspect.checked
      ? '只填一边时自动计算另一边；两边都填时按边界框完整放入。'
      : '关闭等比例后必须同时填写宽度和高度，图片会拉伸到精确尺寸。';
    invalidateResults('缩放方式已修改，请重新转换。');
  });
  qualityInput.addEventListener('input', () => {
    qualityValue.textContent = `${qualityInput.value}%`;
    invalidateResults('输出质量已修改，请重新转换。');
  });
  backgroundColor.addEventListener('input', () => invalidateResults('JPEG 背景色已修改，请重新转换。'));
  convertButton.addEventListener('click', convertImages);

  downloadAllButton.addEventListener('click', () => {
    const downloadable = conversionResults.filter(result => !result.error);
    downloadable.forEach(result => {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      document.body.append(link);
      link.click();
      link.remove();
    });
    window.Toolbox.showToast(`已请求下载 ${downloadable.length} 张图片`);
  });

  window.addEventListener('beforeunload', () => {
    selectedImages.forEach(item => URL.revokeObjectURL(item.url));
    revokeResults();
  });

  renderFiles();
  syncFormatControls();
})();
