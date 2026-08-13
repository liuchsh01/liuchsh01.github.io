(() => {
  'use strict';

  const STORAGE_KEY = 'toolbox-home-category';
  const tabList = document.querySelector('.tool-tabs');
  const panel = document.getElementById('toolGrid');
  const label = document.getElementById('activeCategoryLabel');
  const count = document.getElementById('activeCategoryCount');

  if (!tabList || !panel || !label || !count) return;

  const tabs = [...tabList.querySelectorAll('[role="tab"][data-tool-category]')];
  const cards = [...panel.querySelectorAll('.tool-card[data-tool-category]')];
  const categoryLabels = Object.freeze({
    development: '开发辅助工具',
    security: '编码与安全工具',
    text: '文本工具',
    datetime: '时间日期工具',
    calculate: '计算工具',
  });

  const readStoredCategory = () => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) || '';
    } catch (error) {
      return '';
    }
  };

  const persistCategory = (category) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, category);
    } catch (error) {
      // file:// 或隐私模式可能禁用存储；当前页面仍然可以正常切换分类。
    }
  };

  const activateCategory = (category, options = {}) => {
    const { focus = false, persist = true } = options;
    const activeTab = tabs.find(tab => tab.dataset.toolCategory === category);
    if (!activeTab) return;

    tabs.forEach(tab => {
      const isActive = tab === activeTab;
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    let visibleCount = 0;
    cards.forEach(card => {
      const isVisible = card.dataset.toolCategory === category;
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    panel.setAttribute('aria-labelledby', activeTab.id);
    panel.dataset.activeCategory = category;
    label.textContent = categoryLabels[category] || '分类工具';
    count.textContent = visibleCount + ' 个';
    if (persist) persistCategory(category);
    if (focus) activeTab.focus();
  };

  tabList.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"][data-tool-category]');
    if (tab && tabList.contains(tab)) activateCategory(tab.dataset.toolCategory);
  });

  tabList.addEventListener('keydown', (event) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === currentIndex && !['Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    activateCategory(tabs[nextIndex].dataset.toolCategory, { focus: true });
  });

  const selectedTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0];
  const storedCategory = readStoredCategory();
  const initialTab = tabs.find(tab => tab.dataset.toolCategory === storedCategory) || selectedTab;
  if (initialTab) activateCategory(initialTab.dataset.toolCategory, { persist: false });
})();
