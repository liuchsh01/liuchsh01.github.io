(() => {
  'use strict';

  const THEME_STORAGE_KEY = 'toolbox-theme';
  const DEFAULT_THEME = 'jade';
  const THEMES = Object.freeze([
    { id: 'jade', label: '翡翠青', colorScheme: 'light', accent: '#0f766e' },
    { id: 'blueprint', label: '像素蓝图', colorScheme: 'light', accent: '#006ee6' },
    { id: 'soda', label: '橘子汽水', colorScheme: 'light', accent: '#e85d04' },
    { id: 'violet', label: '紫电薄暮', colorScheme: 'light', accent: '#7c3aed' },
    { id: 'night', label: '深林夜色', colorScheme: 'dark', accent: '#63c7b1' },
  ]);
  const LEGACY_THEME_MAP = Object.freeze({
    ocean: 'blueprint',
    sand: 'soda',
    rose: 'violet',
  });
  const themeMap = new Map(THEMES.map(theme => [theme.id, theme]));
  let toastTimer;
  let activeTheme = DEFAULT_THEME;

  const normalizeTheme = (themeId) => {
    const migrated = LEGACY_THEME_MAP[themeId] || themeId;
    return themeMap.has(migrated) ? migrated : DEFAULT_THEME;
  };

  const readStoredTheme = () => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      const normalized = normalizeTheme(stored);
      if (stored && stored !== normalized) persistTheme(normalized);
      return normalized;
    } catch (error) {
      return DEFAULT_THEME;
    }
  };

  const persistTheme = themeId => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch (error) {
      // file:// 或隐私模式可能禁用存储；当前页面仍然可以正常切换主题。
    }
  };

  const updateThemeControls = () => {
    document.querySelectorAll('[data-theme-select]').forEach(select => {
      if (select.value !== activeTheme) select.value = activeTheme;
    });
  };

  const updateThemeColor = theme => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.accent);
  };

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

  const applyTheme = (themeId, options = {}) => {
    const { persist = true, announce = false } = options;
    const normalized = normalizeTheme(themeId);
    const theme = themeMap.get(normalized);
    activeTheme = normalized;
    document.documentElement.dataset.theme = normalized;
    document.documentElement.style.colorScheme = theme.colorScheme;
    updateThemeColor(theme);
    updateThemeControls();
    if (persist) persistTheme(normalized);
    if (announce && document.body) showToast('已切换为' + theme.label + '主题');
    window.dispatchEvent(new CustomEvent('toolbox-theme-change', {
      detail: { id: normalized, label: theme.label, colorScheme: theme.colorScheme },
    }));
    return normalized;
  };

  const setupThemeControls = () => {
    updateThemeControls();
    document.querySelectorAll('[data-theme-select]').forEach(select => {
      select.addEventListener('change', () => {
        applyTheme(select.value, { persist: true, announce: true });
      });
    });
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

    try {
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
      return true;
    } catch (error) {
      showToast('复制失败，请手动选择并复制');
      return false;
    }
  };

  activeTheme = readStoredTheme();
  applyTheme(activeTheme, { persist: false });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupThemeControls, { once: true });
  } else {
    setupThemeControls();
  }

  window.addEventListener('storage', event => {
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme(event.newValue || DEFAULT_THEME, { persist: false });
    }
  });

  window.Toolbox = {
    showToast,
    copyText,
    themes: THEMES,
    getTheme: () => activeTheme,
    setTheme: themeId => applyTheme(themeId, { persist: true }),
  };
})();
