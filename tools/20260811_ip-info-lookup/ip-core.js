(function attachIpInfoCore(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.IpInfoCore = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const PROVIDERS = [
    {
      id: 'ipwhois',
      name: 'IPWhois',
      docs: 'https://ipwhois.io/documentation',
      note: '无需密钥 · 1,000 次/日（CORS 按域名共享）',
      selected: true,
    },
    {
      id: 'geojs',
      name: 'GeoJS',
      docs: 'https://www.geojs.io/docs/general/',
      note: '无需密钥 · 当前无速率限制',
      selected: true,
    },
    {
      id: 'dbip',
      name: 'DB-IP Free',
      docs: 'https://db-ip.com/api/free',
      note: '无需密钥 · 500 次/日 · 城市级基础数据',
      selected: true,
    },
    {
      id: 'ripestat',
      name: 'RIPEstat',
      docs: 'https://stat.ripe.net/docs/data_api',
      note: '无需密钥 · 补充 ASN、网段和路由信息',
      selected: true,
    },
    {
      id: 'ipapi',
      name: 'ipapi.co',
      docs: 'https://ipapi.co/api/',
      note: '无需密钥 · 最高 1,000 次/日 · 仅测试与开发',
      selected: false,
    },
    {
      id: 'ipinfo',
      name: 'IPinfo',
      docs: 'https://ipinfo.io/developers/lite-api',
      note: 'Token 可选 · Lite 免费无限量；匿名接口按可用性调用',
      selected: false,
    },
  ];

  const FIELD_DEFINITIONS = [
    { key: 'ip', label: 'IP 地址' },
    { key: 'type', label: '地址类型' },
    { key: 'continent', label: '大洲' },
    { key: 'countryDisplay', label: '国家或地区' },
    { key: 'region', label: '省 / 州 / 地区' },
    { key: 'city', label: '城市' },
    { key: 'postal', label: '邮政编码' },
    { key: 'coordinates', label: '经纬度（近似）' },
    { key: 'timezone', label: '时区' },
    { key: 'asn', label: 'ASN' },
    { key: 'organization', label: '组织' },
    { key: 'isp', label: 'ISP' },
    { key: 'domain', label: '关联域名' },
    { key: 'prefix', label: '网络前缀' },
  ];

  const cleanValue = value => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    const text = String(value).trim();
    return /^(unknown|null|undefined|n\/a)$/i.test(text) ? '' : text;
  };

  const normalizeAsn = value => {
    const text = cleanValue(value);
    if (!text) return '';
    const match = text.match(/(?:AS)?(\d+)/i);
    return match ? `AS${match[1]}` : text;
  };

  const isValidIpv4 = value => {
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return false;
    return value.split('.').every(part => Number(part) >= 0 && Number(part) <= 255);
  };

  const isValidIpv6 = value => {
    if (!value.includes(':') || value.includes('%')) return false;
    if ((value.match(/::/g) || []).length > 1) return false;

    let normalized = value;
    if (normalized.includes('.')) {
      const separator = normalized.lastIndexOf(':');
      if (separator < 0) return false;
      const ipv4 = normalized.slice(separator + 1);
      if (!isValidIpv4(ipv4)) return false;
      const octets = ipv4.split('.').map(Number);
      const first = ((octets[0] << 8) | octets[1]).toString(16);
      const second = ((octets[2] << 8) | octets[3]).toString(16);
      normalized = `${normalized.slice(0, separator)}:${first}:${second}`;
    }

    const hasCompression = normalized.includes('::');
    const [leftPart, rightPart = ''] = normalized.split('::');
    const left = leftPart === '' ? [] : leftPart.split(':');
    const right = rightPart === '' ? [] : rightPart.split(':');
    const groups = [...left, ...right];

    if (!groups.every(group => /^[0-9a-f]{1,4}$/i.test(group))) return false;
    return hasCompression ? groups.length < 8 : groups.length === 8;
  };

  const classifyIp = value => {
    const ip = cleanValue(value);
    if (isValidIpv4(ip)) return 'IPv4';
    if (isValidIpv6(ip)) return 'IPv6';
    return '';
  };

  const validateIp = value => {
    const ip = cleanValue(value).replace(/^\[|\]$/g, '');
    const type = classifyIp(ip);
    if (!type) {
      throw new Error('请输入有效的 IPv4 或 IPv6 地址。');
    }
    return { ip, type };
  };

  const buildRequestUrls = (providerId, ip, token = '') => {
    const target = encodeURIComponent(validateIp(ip).ip);

    switch (providerId) {
      case 'ipwhois':
        return [`https://ipwho.is/${target}`];
      case 'geojs':
        return [`https://get.geojs.io/v1/ip/geo/${target}.json`];
      case 'dbip':
        return [`https://api.db-ip.com/v2/free/${target}`];
      case 'ripestat':
        return [
          `https://stat.ripe.net/data/network-info/data.json?resource=${target}`,
          `https://stat.ripe.net/data/prefix-overview/data.json?resource=${target}`,
        ];
      case 'ipapi':
        return [`https://ipapi.co/${target}/json/`];
      case 'ipinfo': {
        const normalizedToken = cleanValue(token);
        return normalizedToken
          ? [`https://api.ipinfo.io/lite/${target}?token=${encodeURIComponent(normalizedToken)}`]
          : [`https://ipinfo.io/${target}/json`];
      }
      default:
        throw new Error(`不支持的数据源：${providerId}`);
    }
  };

  const splitIpinfoOrganization = value => {
    const text = cleanValue(value);
    const match = text.match(/^AS(\d+)\s*(.*)$/i);
    return match
      ? { asn: `AS${match[1]}`, organization: cleanValue(match[2]) }
      : { asn: '', organization: text };
  };

  const createBaseResult = (providerId, targetIp) => ({
    providerId,
    ip: targetIp,
    type: classifyIp(targetIp),
    continent: '',
    country: '',
    countryCode: '',
    region: '',
    city: '',
    postal: '',
    latitude: '',
    longitude: '',
    accuracy: '',
    timezone: '',
    asn: '',
    organization: '',
    isp: '',
    domain: '',
    prefix: '',
  });

  const normalizeProviderResponse = (providerId, raw, targetIp) => {
    const base = createBaseResult(providerId, targetIp);

    if (!raw || typeof raw !== 'object') {
      throw new Error('接口没有返回有效 JSON。');
    }

    if (providerId === 'ipwhois') {
      if (raw.success === false) throw new Error(cleanValue(raw.message) || '查询失败。');
      return {
        ...base,
        ip: cleanValue(raw.ip) || base.ip,
        type: cleanValue(raw.type) || base.type,
        continent: cleanValue(raw.continent),
        country: cleanValue(raw.country),
        countryCode: cleanValue(raw.country_code),
        region: cleanValue(raw.region),
        city: cleanValue(raw.city),
        postal: cleanValue(raw.postal),
        latitude: cleanValue(raw.latitude),
        longitude: cleanValue(raw.longitude),
        timezone: cleanValue(raw.timezone?.id),
        asn: normalizeAsn(raw.connection?.asn),
        organization: cleanValue(raw.connection?.org),
        isp: cleanValue(raw.connection?.isp),
        domain: cleanValue(raw.connection?.domain),
      };
    }

    if (providerId === 'geojs') {
      return {
        ...base,
        ip: cleanValue(raw.ip) || base.ip,
        continent: cleanValue(raw.continent_code),
        country: cleanValue(raw.country),
        countryCode: cleanValue(raw.country_code),
        region: cleanValue(raw.region),
        city: cleanValue(raw.city),
        latitude: cleanValue(raw.latitude),
        longitude: cleanValue(raw.longitude),
        accuracy: cleanValue(raw.accuracy),
        timezone: cleanValue(raw.timezone),
        asn: normalizeAsn(raw.asn),
        organization: cleanValue(raw.organization_name || raw.organization),
      };
    }

    if (providerId === 'dbip') {
      return {
        ...base,
        ip: cleanValue(raw.ipAddress) || base.ip,
        continent: cleanValue(raw.continentName || raw.continentCode),
        country: cleanValue(raw.countryName),
        countryCode: cleanValue(raw.countryCode),
        region: cleanValue(raw.stateProv),
        city: cleanValue(raw.city),
      };
    }

    if (providerId === 'ripestat') {
      const networkInfo = raw.networkInfo?.data || {};
      const prefixOverview = raw.prefixOverview?.data || {};
      const overviewAsn = prefixOverview.asns?.[0];
      return {
        ...base,
        asn: normalizeAsn(overviewAsn?.asn || networkInfo.asns?.[0]),
        organization: cleanValue(overviewAsn?.holder),
        prefix: cleanValue(networkInfo.prefix || prefixOverview.resource),
      };
    }

    if (providerId === 'ipapi') {
      if (raw.error) throw new Error(cleanValue(raw.message || raw.reason) || '查询失败。');
      return {
        ...base,
        ip: cleanValue(raw.ip) || base.ip,
        type: cleanValue(raw.version) ? `IPv${raw.version}` : base.type,
        continent: cleanValue(raw.continent_code),
        country: cleanValue(raw.country_name),
        countryCode: cleanValue(raw.country_code),
        region: cleanValue(raw.region),
        city: cleanValue(raw.city),
        postal: cleanValue(raw.postal),
        latitude: cleanValue(raw.latitude),
        longitude: cleanValue(raw.longitude),
        timezone: cleanValue(raw.timezone),
        asn: normalizeAsn(raw.asn),
        organization: cleanValue(raw.org),
      };
    }

    if (providerId === 'ipinfo') {
      if (raw.error) {
        const errorMessage = typeof raw.error === 'object' ? raw.error.message : raw.error;
        throw new Error(cleanValue(errorMessage) || '查询失败。');
      }
      if (raw.bogon) throw new Error('该地址属于保留或私有地址范围。');
      const loc = cleanValue(raw.loc).split(',');
      const org = splitIpinfoOrganization(raw.org);
      const rawCountry = cleanValue(raw.country_name || raw.country);
      const countryCode = cleanValue(raw.country_code || (rawCountry.length === 2 ? rawCountry : ''));
      return {
        ...base,
        ip: cleanValue(raw.ip) || base.ip,
        continent: cleanValue(raw.continent || raw.continent_code),
        country: cleanValue(raw.country_name || (rawCountry.length === 2 ? '' : rawCountry)),
        countryCode,
        region: cleanValue(raw.region),
        city: cleanValue(raw.city),
        postal: cleanValue(raw.postal),
        latitude: cleanValue(raw.latitude || loc[0]),
        longitude: cleanValue(raw.longitude || loc[1]),
        timezone: cleanValue(raw.timezone),
        asn: normalizeAsn(raw.asn || org.asn),
        organization: cleanValue(raw.as_name || org.organization),
        domain: cleanValue(raw.as_domain),
      };
    }

    throw new Error(`不支持的数据源：${providerId}`);
  };

  const formatCoordinates = result => {
    const latitude = Number(result.latitude);
    const longitude = Number(result.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
    const coordinates = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    return result.accuracy ? `${coordinates}（约 ±${result.accuracy} km）` : coordinates;
  };

  const getDisplayFields = result => ({
    ...result,
    countryDisplay: result.country && result.countryCode
      ? `${result.country} (${result.countryCode})`
      : result.country || result.countryCode,
    coordinates: formatCoordinates(result),
  });

  const aggregateResults = results => FIELD_DEFINITIONS.map(field => {
    const groups = [];

    results.forEach(result => {
      const display = getDisplayFields(result);
      const value = cleanValue(display[field.key]);
      if (!value) return;
      const normalized = value.toLocaleLowerCase('en-US');
      let group = groups.find(item => item.normalized === normalized);

      if (!group) {
        group = { normalized, value, sources: [] };
        groups.push(group);
      }

      group.sources.push(result.providerId);
    });

    groups.sort((a, b) => b.sources.length - a.sources.length);
    const selected = groups[0];
    return {
      key: field.key,
      label: field.label,
      value: selected?.value || '',
      agreement: selected?.sources.length || 0,
      reportedBy: groups.reduce((total, group) => total + group.sources.length, 0),
      sources: selected?.sources || [],
      alternatives: groups.slice(1).map(group => ({
        value: group.value,
        sources: group.sources,
      })),
    };
  }).filter(field => field.value);

  return {
    FIELD_DEFINITIONS,
    PROVIDERS,
    aggregateResults,
    buildRequestUrls,
    classifyIp,
    getDisplayFields,
    isValidIpv4,
    isValidIpv6,
    normalizeProviderResponse,
    validateIp,
  };
});
