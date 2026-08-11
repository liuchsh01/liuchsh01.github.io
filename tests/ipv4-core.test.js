const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateSubnet,
  classifyIpv4,
  intToIpv4,
  ipv4ToInt,
  parseCidrInput,
  parseIpv4,
  parsePrefix,
  prefixFromMask,
} = require('../tools/20260811_ipv4-subnet-calculator/ipv4-core.js');

test('IPv4 parsing and integer conversion preserve all octets', () => {
  assert.deepEqual(parseIpv4('192.168.001.010'), [192, 168, 1, 10]);
  assert.equal(ipv4ToInt('0.0.0.0'), 0);
  assert.equal(ipv4ToInt('255.255.255.255'), 0xffffffff);
  assert.equal(intToIpv4(ipv4ToInt('203.0.113.9')), '203.0.113.9');
  assert.throws(() => parseIpv4('192.168.1.256'), /0–255/);
});

test('prefix parser accepts CIDR and contiguous dotted masks', () => {
  assert.equal(parsePrefix('/24'), 24);
  assert.equal(parsePrefix('0'), 0);
  assert.equal(prefixFromMask('255.255.255.0'), 24);
  assert.equal(prefixFromMask('255.255.255.255'), 32);
  assert.throws(() => prefixFromMask('255.0.255.0'), /连续/);
  assert.throws(() => parsePrefix('33'), /0–32/);
});

test('CIDR input supports embedded or separate prefixes and rejects conflicts', () => {
  assert.deepEqual(parseCidrInput('192.168.1.9/24', ''), { address: '192.168.1.9', prefix: 24 });
  assert.deepEqual(parseCidrInput('192.168.1.9', '255.255.255.0'), { address: '192.168.1.9', prefix: 24 });
  assert.throws(() => parseCidrInput('192.168.1.9/24', '25'), /不一致/);
});

test('/24 subnet calculation returns network, broadcast, masks, and host range', () => {
  const result = calculateSubnet('192.168.1.100/24', '24');
  assert.equal(result.cidr, '192.168.1.0/24');
  assert.equal(result.networkAddress, '192.168.1.0');
  assert.equal(result.broadcastAddress, '192.168.1.255');
  assert.equal(result.subnetMask, '255.255.255.0');
  assert.equal(result.wildcardMask, '0.0.0.255');
  assert.equal(result.firstUsable, '192.168.1.1');
  assert.equal(result.lastUsable, '192.168.1.254');
  assert.equal(result.totalAddresses, 256);
  assert.equal(result.usableHosts, 254);
});

test('/0, /31, and /32 boundaries use explicit host-count conventions', () => {
  const all = calculateSubnet('8.8.8.8', '0');
  assert.equal(all.networkAddress, '0.0.0.0');
  assert.equal(all.broadcastAddress, '255.255.255.255');
  assert.equal(all.totalAddresses, 4294967296);

  const pointToPoint = calculateSubnet('10.0.0.1/31', '');
  assert.equal(pointToPoint.firstUsable, '10.0.0.0');
  assert.equal(pointToPoint.lastUsable, '10.0.0.1');
  assert.equal(pointToPoint.usableHosts, 2);

  const host = calculateSubnet('10.0.0.9/32', '');
  assert.equal(host.networkAddress, '10.0.0.9');
  assert.equal(host.usableHosts, 1);
});

test('address classification covers common special-purpose ranges', () => {
  assert.equal(classifyIpv4(ipv4ToInt('10.1.2.3')), '私有地址');
  assert.equal(classifyIpv4(ipv4ToInt('127.0.0.1')), '环回地址');
  assert.equal(classifyIpv4(ipv4ToInt('192.0.2.10')), '文档示例地址');
  assert.equal(classifyIpv4(ipv4ToInt('224.0.0.1')), '组播地址');
  assert.equal(classifyIpv4(ipv4ToInt('8.8.8.8')), '公网单播地址');
});
