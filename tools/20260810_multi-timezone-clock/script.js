(() => {
  'use strict';

  const DEFAULT_CLOCKS = [
    { zone: 'Asia/Shanghai', label: '中国' },
    { zone: 'Asia/Singapore', label: '新加坡' },
    { zone: 'America/New_York', label: '美国（纽约）' },
    { zone: 'Europe/Berlin', label: '德国' },
    { zone: 'Asia/Ho_Chi_Minh', label: '越南' }
  ];

  const COMMON_ZONE_LABELS = new Map([
    ...DEFAULT_CLOCKS.map((clock) => [clock.zone, clock.label]),
    ['Asia/Hong_Kong', '中国香港'],
    ['Asia/Macau', '中国澳门'],
    ['Asia/Taipei', '中国台北'],
    ['Asia/Tokyo', '日本（东京）'],
    ['Asia/Seoul', '韩国（首尔）'],
    ['Asia/Pyongyang', '朝鲜（平壤）'],
    ['Asia/Ulaanbaatar', '蒙古（乌兰巴托）'],
    ['Asia/Kuala_Lumpur', '马来西亚（吉隆坡）'],
    ['Asia/Jakarta', '印度尼西亚（雅加达）'],
    ['Asia/Makassar', '印度尼西亚（望加锡）'],
    ['Asia/Manila', '菲律宾（马尼拉）'],
    ['Asia/Bangkok', '泰国（曼谷）'],
    ['Asia/Phnom_Penh', '柬埔寨（金边）'],
    ['Asia/Vientiane', '老挝（万象）'],
    ['Asia/Yangon', '缅甸（仰光）'],
    ['Asia/Kolkata', '印度（加尔各答）'],
    ['Asia/Karachi', '巴基斯坦（卡拉奇）'],
    ['Asia/Dhaka', '孟加拉国（达卡）'],
    ['Asia/Colombo', '斯里兰卡（科伦坡）'],
    ['Asia/Kathmandu', '尼泊尔（加德满都）'],
    ['Asia/Thimphu', '不丹（廷布）'],
    ['Asia/Kabul', '阿富汗（喀布尔）'],
    ['Asia/Dubai', '阿联酋（迪拜）'],
    ['Asia/Riyadh', '沙特阿拉伯（利雅得）'],
    ['Asia/Qatar', '卡塔尔（多哈）'],
    ['Asia/Jerusalem', '以色列（耶路撒冷）'],
    ['Europe/Istanbul', '土耳其（伊斯坦布尔）'],
    ['Asia/Tehran', '伊朗（德黑兰）'],
    ['Asia/Baghdad', '伊拉克（巴格达）'],
    ['Asia/Almaty', '哈萨克斯坦（阿拉木图）'],
    ['Asia/Tashkent', '乌兹别克斯坦（塔什干）'],
    ['Europe/London', '英国（伦敦）'],
    ['Europe/Paris', '法国（巴黎）'],
    ['Europe/Rome', '意大利（罗马）'],
    ['Europe/Madrid', '西班牙（马德里）'],
    ['Europe/Lisbon', '葡萄牙（里斯本）'],
    ['Europe/Amsterdam', '荷兰（阿姆斯特丹）'],
    ['Europe/Brussels', '比利时（布鲁塞尔）'],
    ['Europe/Zurich', '瑞士（苏黎世）'],
    ['Europe/Vienna', '奥地利（维也纳）'],
    ['Europe/Warsaw', '波兰（华沙）'],
    ['Europe/Prague', '捷克（布拉格）'],
    ['Europe/Budapest', '匈牙利（布达佩斯）'],
    ['Europe/Athens', '希腊（雅典）'],
    ['Europe/Bucharest', '罗马尼亚（布加勒斯特）'],
    ['Europe/Sofia', '保加利亚（索非亚）'],
    ['Europe/Kyiv', '乌克兰（基辅）'],
    ['Europe/Moscow', '俄罗斯（莫斯科）'],
    ['Asia/Yekaterinburg', '俄罗斯（叶卡捷琳堡）'],
    ['Asia/Vladivostok', '俄罗斯（符拉迪沃斯托克）'],
    ['Europe/Stockholm', '瑞典（斯德哥尔摩）'],
    ['Europe/Oslo', '挪威（奥斯陆）'],
    ['Europe/Copenhagen', '丹麦（哥本哈根）'],
    ['Europe/Helsinki', '芬兰（赫尔辛基）'],
    ['Europe/Dublin', '爱尔兰（都柏林）'],
    ['Atlantic/Reykjavik', '冰岛（雷克雅未克）'],
    ['Europe/Belgrade', '塞尔维亚（贝尔格莱德）'],
    ['Europe/Zagreb', '克罗地亚（萨格勒布）'],
    ['America/Chicago', '美国（芝加哥）'],
    ['America/Denver', '美国（丹佛）'],
    ['America/Los_Angeles', '美国（洛杉矶）'],
    ['America/Anchorage', '美国（安克雷奇）'],
    ['Pacific/Honolulu', '美国（檀香山）'],
    ['America/Toronto', '加拿大（多伦多）'],
    ['America/Vancouver', '加拿大（温哥华）'],
    ['America/Edmonton', '加拿大（埃德蒙顿）'],
    ['America/Halifax', '加拿大（哈利法克斯）'],
    ['America/Mexico_City', '墨西哥（墨西哥城）'],
    ['America/Sao_Paulo', '巴西（圣保罗）'],
    ['America/Manaus', '巴西（马瑙斯）'],
    ['America/Argentina/Buenos_Aires', '阿根廷（布宜诺斯艾利斯）'],
    ['America/Santiago', '智利（圣地亚哥）'],
    ['America/Lima', '秘鲁（利马）'],
    ['America/Bogota', '哥伦比亚（波哥大）'],
    ['America/Caracas', '委内瑞拉（加拉加斯）'],
    ['America/Havana', '古巴（哈瓦那）'],
    ['America/Panama', '巴拿马（巴拿马城）'],
    ['America/Costa_Rica', '哥斯达黎加（圣何塞）'],
    ['America/Guayaquil', '厄瓜多尔（瓜亚基尔）'],
    ['America/La_Paz', '玻利维亚（拉巴斯）'],
    ['America/Asuncion', '巴拉圭（亚松森）'],
    ['America/Montevideo', '乌拉圭（蒙得维的亚）'],
    ['Africa/Cairo', '埃及（开罗）'],
    ['Africa/Johannesburg', '南非（约翰内斯堡）'],
    ['Africa/Lagos', '尼日利亚（拉各斯）'],
    ['Africa/Nairobi', '肯尼亚（内罗毕）'],
    ['Africa/Addis_Ababa', '埃塞俄比亚（亚的斯亚贝巴）'],
    ['Africa/Casablanca', '摩洛哥（卡萨布兰卡）'],
    ['Africa/Algiers', '阿尔及利亚（阿尔及尔）'],
    ['Africa/Accra', '加纳（阿克拉）'],
    ['Africa/Dar_es_Salaam', '坦桑尼亚（达累斯萨拉姆）'],
    ['Africa/Tunis', '突尼斯（突尼斯市）'],
    ['Australia/Sydney', '澳大利亚（悉尼）'],
    ['Australia/Melbourne', '澳大利亚（墨尔本）'],
    ['Australia/Brisbane', '澳大利亚（布里斯班）'],
    ['Australia/Adelaide', '澳大利亚（阿德莱德）'],
    ['Australia/Perth', '澳大利亚（珀斯）'],
    ['Australia/Darwin', '澳大利亚（达尔文）'],
    ['Pacific/Auckland', '新西兰（奥克兰）'],
    ['Pacific/Fiji', '斐济（苏瓦）'],
    ['Pacific/Port_Moresby', '巴布亚新几内亚（莫尔兹比港）'],
    ['UTC', '协调世界时']
  ]);

  const STORAGE_KEY = 'toolbox.multiTimezoneClock.v1';

  const form = document.getElementById('timezoneForm');
  const timezoneInput = document.getElementById('timezoneInput');
  const timezoneCombobox = document.querySelector('.timezone-combobox');
  const timezoneDropdown = document.getElementById('timezoneDropdown');
  const timezoneList = document.getElementById('timezoneList');
  const timezoneError = document.getElementById('timezoneError');
  const clockGrid = document.getElementById('clockGrid');
  const clockEmpty = document.getElementById('clockEmpty');
  const clockCount = document.getElementById('clockCount');
  const syncStatus = document.getElementById('syncStatus');
  const hideSecondsToggle = document.getElementById('hideSeconds');

  const formatterCache = new Map();
  const supportedZones = getSupportedZones();
  const canonicalZoneLabels = createCanonicalZoneLabels();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let clocks = DEFAULT_CLOCKS.map((clock) => ({ ...clock }));
  let hideSeconds = false;
  let filteredTimeZones = [];
  let activeOptionIndex = -1;
  let activeDrag = null;
  let secondTimer;
  let minuteSyncTimer;

  function getSupportedZones() {
    return [...COMMON_ZONE_LABELS.keys()];
  }

  function canonicalizeTimeZone(zone) {
    return new Intl.DateTimeFormat('zh-CN', { timeZone: zone }).resolvedOptions().timeZone;
  }

  function createCanonicalZoneLabels() {
    const labels = new Map();
    COMMON_ZONE_LABELS.forEach((label, zone) => {
      try {
        const canonicalZone = canonicalizeTimeZone(zone);
        if (!labels.has(canonicalZone)) labels.set(canonicalZone, label);
      } catch {
        // 忽略当前浏览器不支持的少数时区，列表中的其他选项仍然可用。
      }
    });
    return labels;
  }

  const getTimeZoneLabel = (zone, fallback = zone) => {
    if (COMMON_ZONE_LABELS.has(zone)) return COMMON_ZONE_LABELS.get(zone);
    try {
      return canonicalZoneLabels.get(canonicalizeTimeZone(zone)) || fallback;
    } catch {
      return fallback;
    }
  };

  const closeTimeZoneDropdown = () => {
    timezoneDropdown.hidden = true;
    timezoneInput.setAttribute('aria-expanded', 'false');
    timezoneInput.removeAttribute('aria-activedescendant');
    activeOptionIndex = -1;
  };

  const setActiveOption = (index) => {
    const options = [...timezoneList.querySelectorAll('.timezone-option')];
    if (!options.length) return;

    activeOptionIndex = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, optionIndex) => {
      const active = optionIndex === activeOptionIndex;
      option.classList.toggle('active', active);
      option.setAttribute('aria-selected', String(active));
    });

    const activeOption = options[activeOptionIndex];
    timezoneInput.setAttribute('aria-activedescendant', activeOption.id);
    activeOption.scrollIntoView({ block: 'nearest' });
  };

  const selectTimeZoneOption = (zone) => {
    timezoneInput.value = zone;
    clearError();
    closeTimeZoneDropdown();
    timezoneInput.focus();
  };

  const renderTimeZoneOptions = () => {
    timezoneList.replaceChildren();

    if (!filteredTimeZones.length) {
      const empty = document.createElement('li');
      empty.className = 'timezone-dropdown-empty';
      empty.textContent = '没有匹配的时区，可继续输入完整 IANA 名称后添加。';
      timezoneList.append(empty);
      activeOptionIndex = -1;
      return;
    }

    const fragment = document.createDocumentFragment();
    filteredTimeZones.forEach((zone, index) => {
      const item = document.createElement('li');
      item.setAttribute('role', 'presentation');

      const option = document.createElement('button');
      option.className = 'timezone-option';
      option.id = `timezone-option-${index}`;
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.dataset.zone = zone;

      const label = document.createElement('span');
      label.className = 'timezone-option-label';
      label.textContent = COMMON_ZONE_LABELS.get(zone);

      const zoneName = document.createElement('span');
      zoneName.className = 'timezone-option-zone';
      zoneName.textContent = zone;

      option.append(label, zoneName);
      option.addEventListener('mousedown', (event) => event.preventDefault());
      option.addEventListener('click', () => selectTimeZoneOption(zone));
      item.append(option);
      fragment.append(item);
    });
    timezoneList.append(fragment);
  };

  const filterTimeZoneOptions = (query = '') => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN');
    filteredTimeZones = supportedZones
      .filter((zone) => {
        const label = COMMON_ZONE_LABELS.get(zone) || '';
        return !keyword
          || zone.toLocaleLowerCase('en-US').includes(keyword)
          || label.toLocaleLowerCase('zh-CN').includes(keyword);
      })
      .slice(0, 120);

    renderTimeZoneOptions();
    timezoneDropdown.hidden = false;
    timezoneInput.setAttribute('aria-expanded', 'true');
  };

  const resolveTimeZone = (value) => {
    const zone = value.trim();
    if (!zone) throw new Error('请输入或选择一个时区。');

    try {
      const listedZone = supportedZones.find((candidate) => candidate.toLowerCase() === zone.toLowerCase());
      return listedZone || canonicalizeTimeZone(zone);
    } catch {
      throw new Error('无法识别这个时区，请输入有效的 IANA 时区名称。');
    }
  };

  const loadState = () => {
    const fallback = {
      clocks: DEFAULT_CLOCKS.map((clock) => ({ ...clock })),
      hideSeconds: false
    };

    try {
      const rawState = window.localStorage.getItem(STORAGE_KEY);
      if (!rawState) return fallback;

      const storedState = JSON.parse(rawState);
      if (!storedState || !Array.isArray(storedState.clocks)) return fallback;

      const seenZones = new Set();
      const restoredClocks = storedState.clocks.reduce((result, clock) => {
        if (!clock || typeof clock.zone !== 'string') return result;

        let canonicalZone;
        try {
          canonicalZone = canonicalizeTimeZone(clock.zone);
        } catch {
          return result;
        }
        if (seenZones.has(canonicalZone)) return result;

        seenZones.add(canonicalZone);
        const storedLabel = typeof clock.label === 'string' ? clock.label.trim().slice(0, 80) : '';
        result.push({
          zone: clock.zone,
          label: getTimeZoneLabel(clock.zone, storedLabel || clock.zone)
        });
        return result;
      }, []);

      return {
        clocks: storedState.clocks.length === 0 || restoredClocks.length > 0
          ? restoredClocks
          : fallback.clocks,
        hideSeconds: storedState.hideSeconds === true
      };
    } catch {
      return fallback;
    }
  };

  const saveState = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ clocks, hideSeconds }));
    } catch {
      // localStorage 可能在隐私模式或受限文件环境中不可用，时钟本身仍可正常使用。
    }
  };

  const getFormatters = (zone) => {
    if (!formatterCache.has(zone)) {
      formatterCache.set(zone, {
        timeWithSeconds: new Intl.DateTimeFormat('zh-CN', {
          timeZone: zone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23'
        }),
        timeWithoutSeconds: new Intl.DateTimeFormat('zh-CN', {
          timeZone: zone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        }),
        date: new Intl.DateTimeFormat('zh-CN', {
          timeZone: zone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          weekday: 'short'
        }),
        offset: new Intl.DateTimeFormat('zh-CN', {
          timeZone: zone,
          hour: '2-digit',
          timeZoneName: 'longOffset'
        })
      });
    }
    return formatterCache.get(zone);
  };

  const formatOffset = (formatter, date, zone) => {
    const offsetPart = formatter.formatToParts(date).find((part) => part.type === 'timeZoneName');
    return offsetPart?.value || zone;
  };

  const updateClockCount = () => {
    clockCount.textContent = `${clocks.length} 个时钟`;
    clockEmpty.hidden = clocks.length > 0;
    clockGrid.hidden = clocks.length === 0;
  };

  const updateAllClocks = (date = new Date()) => {
    clockGrid.querySelectorAll('.timezone-clock').forEach((card) => {
      const zone = card.dataset.zone;
      const formatters = getFormatters(zone);
      const timeFormatter = hideSeconds ? formatters.timeWithoutSeconds : formatters.timeWithSeconds;
      card.querySelector('.clock-time').textContent = timeFormatter.format(date);
      card.querySelector('.clock-date').textContent = formatters.date.format(date);
      card.querySelector('.clock-offset').textContent = formatOffset(formatters.offset, date, zone);
      card.querySelector('time').dateTime = date.toISOString();
    });
  };

  const createClockCard = ({ zone, label }) => {
    const card = document.createElement('article');
    card.className = 'timezone-clock';
    card.dataset.zone = zone;

    const header = document.createElement('div');
    header.className = 'clock-card-head';

    const place = document.createElement('div');
    place.className = 'clock-place';

    const title = document.createElement('h3');
    title.textContent = label;
    title.title = label;

    const zoneName = document.createElement('span');
    zoneName.className = 'clock-zone';
    zoneName.textContent = zone;
    zoneName.title = zone;

    const remove = document.createElement('button');
    remove.className = 'remove-clock';
    remove.type = 'button';
    remove.textContent = '删除';
    remove.setAttribute('aria-label', `删除${label}时钟`);
    remove.addEventListener('click', () => removeClock(zone));

    const dragHandle = document.createElement('button');
    dragHandle.className = 'drag-handle';
    dragHandle.type = 'button';
    dragHandle.textContent = '⠿';
    dragHandle.title = '拖动或使用方向键调整顺序';
    dragHandle.setAttribute('aria-label', `调整${label}时钟的顺序`);
    dragHandle.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown');
    dragHandle.addEventListener('pointerdown', (event) => beginClockDrag(event, card));
    dragHandle.addEventListener('keydown', (event) => moveClockByKeyboard(event, card));

    const actions = document.createElement('div');
    actions.className = 'clock-card-actions';
    actions.append(dragHandle, remove);

    const time = document.createElement('time');
    time.className = 'clock-time';
    time.textContent = hideSeconds ? '--:--' : '--:--:--';

    const date = document.createElement('p');
    date.className = 'clock-date';
    date.textContent = '等待校准';

    const offset = document.createElement('p');
    offset.className = 'clock-offset';
    offset.textContent = zone;

    place.append(title, zoneName);
    header.append(place, actions);
    card.append(header, time, date, offset);
    return card;
  };

  const updateCardPositions = () => {
    const cards = [...clockGrid.querySelectorAll('.timezone-clock')];
    cards.forEach((card, index) => {
      card.setAttribute('aria-posinset', String(index + 1));
      card.setAttribute('aria-setsize', String(cards.length));
    });
  };

  const syncClockOrderFromDom = () => {
    const clocksByZone = new Map(clocks.map((clock) => [clock.zone, clock]));
    clocks = [...clockGrid.querySelectorAll('.timezone-clock')]
      .map((card) => clocksByZone.get(card.dataset.zone))
      .filter(Boolean);
    updateCardPositions();
    saveState();
  };

  const getClosestClockCard = (clientX, clientY, draggedCard) => {
    let closestCard = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    clockGrid.querySelectorAll('.timezone-clock').forEach((card) => {
      if (card === draggedCard) return;
      const rect = card.getBoundingClientRect();
      const distance = Math.hypot(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCard = card;
      }
    });

    return closestCard;
  };

  const captureClockRects = (draggedCard) => new Map(
    [...clockGrid.querySelectorAll('.timezone-clock')]
      .filter((card) => card !== draggedCard)
      .map((card) => [card, card.getBoundingClientRect()])
  );

  const animateClockReflow = (previousRects) => {
    if (prefersReducedMotion) return;

    previousRects.forEach((previousRect, card) => {
      const currentRect = card.getBoundingClientRect();
      const deltaX = previousRect.left - currentRect.left;
      const deltaY = previousRect.top - currentRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      card.getAnimations().forEach((animation) => animation.cancel());
      card.animate([
        { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
        { transform: 'translate3d(0, 0, 0)' }
      ], {
        duration: 210,
        easing: 'cubic-bezier(0.2, 0.82, 0.28, 1)'
      });
    });
  };

  const paintDragPreview = () => {
    if (!activeDrag) return;

    activeDrag.animationFrame = 0;
    const deltaX = activeDrag.currentX - activeDrag.startX;
    const deltaY = activeDrag.currentY - activeDrag.startY;
    activeDrag.preview.style.setProperty('--drag-x', `${deltaX}px`);
    activeDrag.preview.style.setProperty('--drag-y', `${deltaY}px`);
    activeDrag.preview.style.setProperty('--drag-tilt', `${activeDrag.tilt}deg`);
  };

  const scheduleDragPreviewPaint = () => {
    if (!activeDrag || activeDrag.animationFrame) return;
    activeDrag.animationFrame = window.requestAnimationFrame(paintDragPreview);
  };

  const createDragPreview = () => {
    const { card, originRect } = activeDrag;
    const preview = card.cloneNode(true);
    preview.classList.add('drag-preview');
    preview.removeAttribute('aria-posinset');
    preview.removeAttribute('aria-setsize');
    preview.setAttribute('aria-hidden', 'true');
    preview.style.left = `${originRect.left}px`;
    preview.style.top = `${originRect.top}px`;
    preview.style.width = `${originRect.width}px`;
    preview.style.height = `${originRect.height}px`;
    preview.querySelectorAll('button').forEach((button) => button.setAttribute('tabindex', '-1'));
    document.body.append(preview);

    activeDrag.preview = preview;
    card.classList.add('drag-origin');
    document.body.classList.add('clock-dragging');
  };

  const moveClockDrag = (event) => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    event.preventDefault();

    const horizontalVelocity = event.clientX - activeDrag.currentX;
    activeDrag.currentX = event.clientX;
    activeDrag.currentY = event.clientY;
    activeDrag.tilt = Math.max(-2.2, Math.min(2.2, horizontalVelocity * 0.16));

    const distance = Math.hypot(event.clientX - activeDrag.startX, event.clientY - activeDrag.startY);
    if (!activeDrag.moved && distance < 6) return;
    if (!activeDrag.moved) {
      activeDrag.moved = true;
      createDragPreview();
    }
    scheduleDragPreviewPaint();

    const target = getClosestClockCard(event.clientX, event.clientY, activeDrag.card);
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;
    const onSameRow = Math.abs(event.clientY - centerY) <= targetRect.height * 0.42;
    const insertBefore = onSameRow ? event.clientX < centerX : event.clientY < centerY;

    if ((insertBefore && activeDrag.card.nextElementSibling === target)
      || (!insertBefore && target.nextElementSibling === activeDrag.card)) return;

    const previousRects = captureClockRects(activeDrag.card);
    clockGrid.insertBefore(activeDrag.card, insertBefore ? target : target.nextSibling);
    animateClockReflow(previousRects);
  };

  const finishClockDrag = (event) => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

    const dragState = activeDrag;
    document.removeEventListener('pointermove', moveClockDrag);
    document.removeEventListener('pointerup', finishClockDrag);
    document.removeEventListener('pointercancel', finishClockDrag);
    if (dragState.animationFrame) window.cancelAnimationFrame(dragState.animationFrame);

    activeDrag = null;
    if (!dragState.moved) return;
    document.body.classList.remove('clock-dragging');

    const destinationRect = dragState.card.getBoundingClientRect();
    const destinationX = destinationRect.left - dragState.originRect.left;
    const destinationY = destinationRect.top - dragState.originRect.top;
    let cleanupTimer;
    let cleanedUp = false;
    const completeDropAnimation = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      window.clearTimeout(cleanupTimer);
      dragState.preview.remove();
      dragState.card.classList.remove('drag-origin');
    };

    if (prefersReducedMotion) {
      completeDropAnimation();
    } else {
      dragState.preview.classList.add('settling');
      dragState.preview.addEventListener('transitionend', completeDropAnimation, { once: true });
      window.requestAnimationFrame(() => {
        dragState.preview.style.setProperty('--drag-x', `${destinationX}px`);
        dragState.preview.style.setProperty('--drag-y', `${destinationY}px`);
        dragState.preview.style.setProperty('--drag-tilt', '0deg');
        dragState.preview.style.setProperty('--drag-scale', '1');
      });
      cleanupTimer = window.setTimeout(completeDropAnimation, 280);
    }

    if (dragState.moved) {
      syncClockOrderFromDom();
      window.Toolbox?.showToast('时钟顺序已保存');
    }
  };

  const beginClockDrag = (event, card) => {
    if (activeDrag || clocks.length < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();

    const originRect = card.getBoundingClientRect();

    activeDrag = {
      card,
      preview: null,
      originRect,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      tilt: 0,
      animationFrame: 0,
      moved: false
    };
    document.addEventListener('pointermove', moveClockDrag, { passive: false });
    document.addEventListener('pointerup', finishClockDrag);
    document.addEventListener('pointercancel', finishClockDrag);
  };

  const moveClockByKeyboard = (event, card) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();

    const cards = [...clockGrid.querySelectorAll('.timezone-clock')];
    const currentIndex = cards.indexOf(card);
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const nextIndex = Math.max(0, Math.min(cards.length - 1, currentIndex + direction));
    if (nextIndex === currentIndex) return;

    const target = cards[nextIndex];
    const previousRects = captureClockRects(null);
    clockGrid.insertBefore(card, direction < 0 ? target : target.nextSibling);
    animateClockReflow(previousRects);
    syncClockOrderFromDom();
    card.querySelector('.drag-handle')?.focus();
    window.Toolbox?.showToast(`时钟已移动到第 ${nextIndex + 1} 位`);
  };

  const renderClocks = () => {
    const fragment = document.createDocumentFragment();
    clocks.forEach((clock) => fragment.append(createClockCard(clock)));
    clockGrid.replaceChildren(fragment);
    updateClockCount();
    updateCardPositions();
    updateAllClocks(new Date());
  };

  const clearError = () => {
    timezoneError.textContent = '';
    timezoneError.hidden = true;
    timezoneInput.removeAttribute('aria-invalid');
  };

  const showError = (message) => {
    timezoneError.textContent = message;
    timezoneError.hidden = false;
    timezoneInput.setAttribute('aria-invalid', 'true');
    timezoneInput.focus();
  };

  const addClock = (zone) => {
    const canonicalZone = canonicalizeTimeZone(zone);
    if (clocks.some((clock) => canonicalizeTimeZone(clock.zone) === canonicalZone)) {
      showError('这个时区已经显示在页面中。');
      return;
    }

    clocks.push({ zone, label: getTimeZoneLabel(zone) });
    renderClocks();
    saveState();
    timezoneInput.value = '';
    closeTimeZoneDropdown();
    clearError();
    window.Toolbox?.showToast('时区时钟已添加');
  };

  const removeClock = (zone) => {
    const removedClock = clocks.find((clock) => clock.zone === zone);
    clocks = clocks.filter((clock) => clock.zone !== zone);
    renderClocks();
    saveState();
    window.Toolbox?.showToast(`${removedClock?.label || zone}时钟已删除`);
  };

  const scheduleSecondTick = () => {
    window.clearTimeout(secondTimer);
    const delay = 1000 - (Date.now() % 1000) + 5;
    secondTimer = window.setTimeout(() => {
      updateAllClocks(new Date());
      scheduleSecondTick();
    }, delay);
  };

  const scheduleMinuteSync = () => {
    window.clearTimeout(minuteSyncTimer);
    const delay = 60000 - (Date.now() % 60000) + 20;
    minuteSyncTimer = window.setTimeout(() => {
      updateAllClocks(new Date());
      scheduleSecondTick();
      syncStatus.textContent = `已于本地时间 ${new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).format(new Date())} 校准`;
      scheduleMinuteSync();
    }, delay);
  };

  const synchronizeNow = () => {
    updateAllClocks(new Date());
    scheduleSecondTick();
    scheduleMinuteSync();
    syncStatus.textContent = '已与本地时间校准';
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();
    try {
      addClock(resolveTimeZone(timezoneInput.value));
    } catch (error) {
      showError(error.message);
    }
  });

  timezoneInput.addEventListener('focus', () => filterTimeZoneOptions(timezoneInput.value));
  timezoneInput.addEventListener('input', () => {
    clearError();
    filterTimeZoneOptions(timezoneInput.value);
  });
  timezoneInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (timezoneDropdown.hidden) filterTimeZoneOptions(timezoneInput.value);
      setActiveOption(activeOptionIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (timezoneDropdown.hidden) filterTimeZoneOptions(timezoneInput.value);
      setActiveOption(activeOptionIndex <= 0 ? filteredTimeZones.length - 1 : activeOptionIndex - 1);
    } else if (event.key === 'Enter' && !timezoneDropdown.hidden && activeOptionIndex >= 0) {
      event.preventDefault();
      selectTimeZoneOption(filteredTimeZones[activeOptionIndex]);
    } else if (event.key === 'Escape') {
      closeTimeZoneDropdown();
    }
  });
  hideSecondsToggle.addEventListener('change', () => {
    hideSeconds = hideSecondsToggle.checked;
    updateAllClocks(new Date());
    saveState();
    window.Toolbox?.showToast(hideSeconds ? '秒钟已隐藏' : '秒钟已显示');
  });
  document.addEventListener('click', (event) => {
    if (!timezoneCombobox.contains(event.target)) closeTimeZoneDropdown();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) synchronizeNow();
  });
  window.addEventListener('pagehide', () => {
    saveState();
    window.clearTimeout(secondTimer);
    window.clearTimeout(minuteSyncTimer);
  });

  const restoredState = loadState();
  clocks = restoredState.clocks;
  hideSeconds = restoredState.hideSeconds;
  hideSecondsToggle.checked = hideSeconds;
  filterTimeZoneOptions();
  closeTimeZoneDropdown();
  renderClocks();
  synchronizeNow();
})();
