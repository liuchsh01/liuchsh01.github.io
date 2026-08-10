(() => {
  'use strict';

  let toastTimer;

  const getToast = () => {
    let toast = document.querySelector('[data-toast]');

    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.dataset.toast = '';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.setAttribute('aria-atomic', 'true');
      (document.body || document.documentElement).append(toast);
    }

    return toast;
  };

  const showToast = (message) => {
    const toast = getToast();
    window.clearTimeout(toastTimer);
    toast.textContent = String(message);
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800);
  };

  const copyWithFallback = (value) => {
    const helper = document.createElement('textarea');
    const activeElement = document.activeElement;

    helper.value = value;
    helper.readOnly = true;
    helper.setAttribute('aria-hidden', 'true');
    helper.style.position = 'fixed';
    helper.style.top = '0';
    helper.style.left = '-9999px';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    helper.setSelectionRange(0, helper.value.length);

    try {
      if (!document.execCommand('copy')) {
        throw new Error('浏览器未能完成复制');
      }
    } finally {
      helper.remove();
      if (activeElement instanceof HTMLElement) {
        activeElement.focus();
      }
    }
  };

  const copyText = async (value, successMessage = '已复制') => {
    const text = String(value);

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        copyWithFallback(text);
      }
    } else {
      copyWithFallback(text);
    }

    showToast(successMessage);
  };

  window.Toolbox = { showToast, copyText };
})();
