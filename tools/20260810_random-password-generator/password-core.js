((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PasswordGeneratorCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, (root) => {
  'use strict';

  const CHARACTER_GROUPS = Object.freeze({
    digits: '0123456789',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    symbols: '!@#$%^&*()-_=+[]{};:,.?/',
  });

  const GROUP_LABELS = Object.freeze({
    digits: '数字',
    lowercase: '小写字母',
    uppercase: '大写字母',
    symbols: '特殊字符',
  });

  const DEFAULT_EXCLUDED = '0oO1ilILq9';
  const MAX_PASSWORD_LENGTH = 1024;
  const MAX_PASSWORD_COUNT = 100;

  const uniqueCharacters = (value) => [...new Set([...String(value || '')])];

  const parseInteger = (value, label, minimum, maximum) => {
    const text = String(value ?? '').trim();
    if (!/^\d+$/.test(text)) {
      throw new Error(`${label}必须是 ${minimum}–${maximum} 的整数。`);
    }

    const number = Number(text);
    if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
      throw new Error(`${label}必须是 ${minimum}–${maximum} 的整数。`);
    }
    return number;
  };

  const normalizeOptions = (options = {}) => {
    const groups = [...new Set(Array.isArray(options.groups) ? options.groups : [])]
      .filter(group => Object.hasOwn(CHARACTER_GROUPS, group));
    const count = parseInteger(options.count ?? 1, '生成数量', 1, MAX_PASSWORD_COUNT);
    const minLength = parseInteger(options.minLength ?? 20, '密码长度', 1, MAX_PASSWORD_LENGTH);
    const maxText = String(options.maxLength ?? '').trim();
    const maxLength = maxText === ''
      ? minLength
      : parseInteger(maxText, '最大密码长度', 1, MAX_PASSWORD_LENGTH);

    if (maxLength < minLength) {
      throw new Error('最大密码长度不能小于最小密码长度。');
    }

    const includeCharacters = uniqueCharacters(options.includeCharacters).join('');
    const excludeCharacters = uniqueCharacters(options.excludeCharacters).join('');
    const excluded = new Set([...excludeCharacters]);
    const overlap = [...includeCharacters].filter(character => excluded.has(character));

    if (overlap.length) {
      throw new Error(`字符“${overlap.join('')}”同时出现在包含字符和排除字符中，请保留在其中一处。`);
    }

    if (!groups.length && !includeCharacters) {
      throw new Error('请至少选择一个字符组，或填写包含字符。');
    }

    const filteredGroups = groups.map(name => {
      const characters = [...CHARACTER_GROUPS[name]]
        .filter(character => !excluded.has(character))
        .join('');
      if (!characters) {
        throw new Error(`排除字符移除了“${GROUP_LABELS[name]}”组的所有字符。`);
      }
      return { name, characters };
    });

    const requiredCharacters = [...includeCharacters];
    const unsatisfiedGroups = filteredGroups.filter(group => (
      !requiredCharacters.some(character => group.characters.includes(character))
    ));
    const minimumRequiredLength = requiredCharacters.length + unsatisfiedGroups.length;

    if (minLength < minimumRequiredLength) {
      throw new Error(`按当前规则，密码长度至少需要 ${minimumRequiredLength} 位。`);
    }

    const pool = uniqueCharacters([
      ...filteredGroups.map(group => group.characters),
      includeCharacters,
    ].join('')).join('');

    if (!pool) {
      throw new Error('当前设置没有可用字符，请调整字符组或排除字符。');
    }

    return {
      count,
      filteredGroups,
      includeCharacters,
      maxLength,
      minLength,
      pool,
      requiredCharacters,
      unsatisfiedGroups,
    };
  };

  const secureRandomInt = (maximum, cryptoProvider = root.crypto) => {
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 0x100000000) {
      throw new RangeError('随机数范围无效。');
    }
    if (!cryptoProvider?.getRandomValues) {
      throw new Error('当前浏览器不支持安全随机数，无法生成密码。');
    }

    const range = 0x100000000;
    const limit = Math.floor(range / maximum) * maximum;
    const values = new Uint32Array(1);
    let value;
    do {
      cryptoProvider.getRandomValues(values);
      value = values[0];
    } while (value >= limit);

    return value % maximum;
  };

  const randomCharacter = (characters, cryptoProvider) => (
    [...characters][secureRandomInt([...characters].length, cryptoProvider)]
  );

  const shuffle = (characters, cryptoProvider) => {
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const target = secureRandomInt(index + 1, cryptoProvider);
      [characters[index], characters[target]] = [characters[target], characters[index]];
    }
    return characters;
  };

  const generateNormalizedPassword = (options, cryptoProvider) => {
    const lengthRange = options.maxLength - options.minLength + 1;
    const length = options.minLength + secureRandomInt(lengthRange, cryptoProvider);
    const characters = [...options.requiredCharacters];

    options.unsatisfiedGroups.forEach(group => {
      characters.push(randomCharacter(group.characters, cryptoProvider));
    });

    while (characters.length < length) {
      characters.push(randomCharacter(options.pool, cryptoProvider));
    }

    return shuffle(characters, cryptoProvider).join('');
  };

  const generatePassword = (options, cryptoProvider = root.crypto) => (
    generateNormalizedPassword(normalizeOptions(options), cryptoProvider)
  );

  const generatePasswords = (options, cryptoProvider = root.crypto) => {
    const normalized = normalizeOptions(options);
    return Array.from(
      { length: normalized.count },
      () => generateNormalizedPassword(normalized, cryptoProvider),
    );
  };

  return {
    CHARACTER_GROUPS,
    DEFAULT_EXCLUDED,
    generatePassword,
    generatePasswords,
    normalizeOptions,
    secureRandomInt,
  };
});
