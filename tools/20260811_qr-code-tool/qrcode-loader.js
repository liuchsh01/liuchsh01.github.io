(() => {
  'use strict';

  const moduleUrl = './vendor/qrcode-1.5.4.esm.js';

  window.qrCodeDependency = import(moduleUrl)
    .then(module => {
      const qrCode = module.default || module;
      if (!qrCode || typeof qrCode.toCanvas !== 'function') {
        throw new Error('二维码生成组件缺少 Canvas API。');
      }
      window.QRCode = qrCode;
      return qrCode;
    })
    .catch(() => null);
})();
