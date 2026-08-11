((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.Ipv4SubnetCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const MAX_IPV4 = 0xffffffff;

  const parseIpv4 = (value, label = 'IPv4 地址') => {
    const source = String(value ?? '').trim();
    const parts = source.split('.');
    if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part))) {
      throw new Error(`${label}必须由 4 组 0–255 的十进制数字组成。`);
    }
    const octets = parts.map(Number);
    if (octets.some(octet => octet < 0 || octet > 255)) {
      throw new Error(`${label}中的每组数字必须在 0–255 之间。`);
    }
    return octets;
  };

  const ipv4ToInt = value => parseIpv4(value).reduce(
    (result, octet) => (result * 256) + octet,
    0,
  );

  const intToIpv4 = (value) => {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 0 || numeric > MAX_IPV4) {
      throw new Error('IPv4 数值超出有效范围。');
    }
    return [24, 16, 8, 0]
      .map(shift => Math.floor(numeric / (2 ** shift)) % 256)
      .join('.');
  };

  const prefixFromMask = (value) => {
    const octets = parseIpv4(value, '子网掩码');
    const binary = octets.map(octet => octet.toString(2).padStart(8, '0')).join('');
    if (!/^1*0*$/.test(binary)) {
      throw new Error('子网掩码必须由连续的 1 和连续的 0 组成。');
    }
    return binary.indexOf('0') === -1 ? 32 : binary.indexOf('0');
  };

  const parsePrefix = (value) => {
    const source = String(value ?? '').trim();
    if (!source) throw new Error('请输入 CIDR 前缀或子网掩码。');
    if (source.includes('.')) return prefixFromMask(source);

    const normalized = source.startsWith('/') ? source.slice(1) : source;
    if (!/^\d{1,2}$/.test(normalized)) {
      throw new Error('CIDR 前缀必须是 0–32 的整数。');
    }
    const prefix = Number(normalized);
    if (prefix < 0 || prefix > 32) {
      throw new Error('CIDR 前缀必须在 0–32 之间。');
    }
    return prefix;
  };

  const parseCidrInput = (addressValue, prefixValue) => {
    const addressSource = String(addressValue ?? '').trim();
    if (!addressSource) throw new Error('请输入 IPv4 地址。');
    const segments = addressSource.split('/');
    if (segments.length > 2) throw new Error('CIDR 地址格式不正确。');

    const address = parseIpv4(segments[0]).join('.');
    const embeddedPrefix = segments.length === 2 ? parsePrefix(segments[1]) : null;
    const separateSource = String(prefixValue ?? '').trim();
    const separatePrefix = separateSource ? parsePrefix(separateSource) : null;

    if (embeddedPrefix !== null && separatePrefix !== null && embeddedPrefix !== separatePrefix) {
      throw new Error(`地址中的 /${embeddedPrefix} 与单独填写的 /${separatePrefix} 不一致。`);
    }
    const prefix = embeddedPrefix ?? separatePrefix;
    if (prefix === null) throw new Error('请在地址后添加 CIDR 前缀，或单独填写子网掩码。');
    return { address, prefix };
  };

  const isInRange = (numeric, start, prefix) => {
    const blockSize = 2 ** (32 - prefix);
    const startValue = ipv4ToInt(start);
    return numeric >= startValue && numeric < startValue + blockSize;
  };

  const classifyIpv4 = (numeric) => {
    if (isInRange(numeric, '0.0.0.0', 8)) return '本网络地址（保留）';
    if (isInRange(numeric, '10.0.0.0', 8)
      || isInRange(numeric, '172.16.0.0', 12)
      || isInRange(numeric, '192.168.0.0', 16)) return '私有地址';
    if (isInRange(numeric, '100.64.0.0', 10)) return '共享地址空间（运营商级 NAT）';
    if (isInRange(numeric, '127.0.0.0', 8)) return '环回地址';
    if (isInRange(numeric, '169.254.0.0', 16)) return '链路本地地址';
    if (isInRange(numeric, '192.0.2.0', 24)
      || isInRange(numeric, '198.51.100.0', 24)
      || isInRange(numeric, '203.0.113.0', 24)) return '文档示例地址';
    if (isInRange(numeric, '198.18.0.0', 15)) return '网络测试地址';
    if (isInRange(numeric, '224.0.0.0', 4)) return '组播地址';
    if (isInRange(numeric, '240.0.0.0', 4)) return '保留地址';
    return '公网单播地址';
  };

  const formatBinaryIpv4 = value => parseIpv4(value)
    .map(octet => octet.toString(2).padStart(8, '0'))
    .join('.');

  const calculateSubnet = (addressValue, prefixValue) => {
    const { address, prefix } = parseCidrInput(addressValue, prefixValue);
    const addressNumeric = ipv4ToInt(address);
    const totalAddresses = 2 ** (32 - prefix);
    const wildcardNumeric = totalAddresses - 1;
    const maskNumeric = MAX_IPV4 - wildcardNumeric;
    const networkNumeric = Math.floor(addressNumeric / totalAddresses) * totalAddresses;
    const lastNumeric = networkNumeric + totalAddresses - 1;

    let firstUsableNumeric;
    let lastUsableNumeric;
    let usableHosts;
    let hostNote = '';
    if (prefix <= 30) {
      firstUsableNumeric = networkNumeric + 1;
      lastUsableNumeric = lastNumeric - 1;
      usableHosts = totalAddresses - 2;
    } else if (prefix === 31) {
      firstUsableNumeric = networkNumeric;
      lastUsableNumeric = lastNumeric;
      usableHosts = 2;
      hostNote = '/31 按点对点链路计算，两端地址均可使用。';
    } else {
      firstUsableNumeric = networkNumeric;
      lastUsableNumeric = networkNumeric;
      usableHosts = 1;
      hostNote = '/32 只表示一个主机地址。';
    }

    const networkAddress = intToIpv4(networkNumeric);
    const lastAddress = intToIpv4(lastNumeric);
    const subnetMask = intToIpv4(maskNumeric);

    return {
      address,
      addressBinary: formatBinaryIpv4(address),
      addressType: classifyIpv4(addressNumeric),
      broadcastAddress: lastAddress,
      cidr: `${networkAddress}/${prefix}`,
      firstUsable: intToIpv4(firstUsableNumeric),
      hostIndex: addressNumeric - networkNumeric,
      hostNote,
      isBroadcastAddress: prefix <= 30 && addressNumeric === lastNumeric,
      isNetworkAddress: prefix <= 30 && addressNumeric === networkNumeric,
      lastAddress,
      lastUsable: intToIpv4(lastUsableNumeric),
      maskBinary: formatBinaryIpv4(subnetMask),
      networkAddress,
      prefix,
      subnetMask,
      totalAddresses,
      usableHosts,
      wildcardMask: intToIpv4(wildcardNumeric),
    };
  };

  return {
    calculateSubnet,
    classifyIpv4,
    formatBinaryIpv4,
    intToIpv4,
    ipv4ToInt,
    parseCidrInput,
    parseIpv4,
    parsePrefix,
    prefixFromMask,
  };
});
