const test = require('node:test');
const assert = require('node:assert/strict');
const {
  aggregateResults,
  buildRequestUrls,
  classifyIp,
  getDisplayFields,
  normalizeProviderResponse,
  validateIp,
} = require('../tools/20260811_ip-info-lookup/ip-core.js');

test('validates strict IPv4 and common IPv6 forms', () => {
  assert.deepEqual(validateIp(' 8.8.8.8 '), { ip: '8.8.8.8', type: 'IPv4' });
  assert.equal(classifyIp('2001:4860:4860::8888'), 'IPv6');
  assert.equal(classifyIp('::ffff:192.0.2.1'), 'IPv6');
  assert.equal(classifyIp('999.1.1.1'), '');
  assert.equal(classifyIp('2001:::1'), '');
  assert.throws(() => validateIp('example.com'), /有效的 IPv4 或 IPv6/);
});

test('builds provider URLs and keeps IPinfo token scoped to IPinfo', () => {
  assert.deepEqual(buildRequestUrls('geojs', '8.8.8.8'), [
    'https://get.geojs.io/v1/ip/geo/8.8.8.8.json',
  ]);
  assert.equal(buildRequestUrls('ripestat', '2001:4860:4860::8888').length, 2);
  assert.deepEqual(buildRequestUrls('ipinfo', '8.8.8.8', 'secret token'), [
    'https://api.ipinfo.io/lite/8.8.8.8?token=secret%20token',
  ]);
  assert.deepEqual(buildRequestUrls('ipinfo', '8.8.8.8'), [
    'https://ipinfo.io/8.8.8.8/json',
  ]);
});

test('normalizes IPWhois, GeoJS and DB-IP responses', () => {
  const ipwhois = normalizeProviderResponse('ipwhois', {
    ip: '8.8.8.8',
    success: true,
    type: 'IPv4',
    country: 'United States',
    country_code: 'US',
    city: 'San Jose',
    latitude: 37.3,
    longitude: -121.8,
    connection: { asn: 15169, org: 'Google LLC' },
    timezone: { id: 'America/Los_Angeles' },
  }, '8.8.8.8');
  const geojs = normalizeProviderResponse('geojs', {
    ip: '8.8.8.8',
    country: 'United States',
    country_code: 'US',
    asn: 15169,
    organization_name: 'Google LLC',
  }, '8.8.8.8');
  const dbip = normalizeProviderResponse('dbip', {
    ipAddress: '8.8.8.8',
    countryName: 'United States',
    countryCode: 'US',
    stateProv: 'California',
    city: 'Mountain View',
  }, '8.8.8.8');

  assert.equal(ipwhois.asn, 'AS15169');
  assert.equal(ipwhois.timezone, 'America/Los_Angeles');
  assert.equal(geojs.organization, 'Google LLC');
  assert.equal(dbip.region, 'California');
  assert.equal(getDisplayFields(dbip).coordinates, '');
});

test('normalizes RIPEstat combined responses', () => {
  const result = normalizeProviderResponse('ripestat', {
    networkInfo: { data: { asns: ['15169'], prefix: '8.8.8.0/24' } },
    prefixOverview: { data: { asns: [{ asn: 15169, holder: 'GOOGLE - Google LLC' }] } },
  }, '8.8.8.8');

  assert.equal(result.asn, 'AS15169');
  assert.equal(result.prefix, '8.8.8.0/24');
  assert.equal(result.organization, 'GOOGLE - Google LLC');
});

test('supports legacy and Lite IPinfo response shapes', () => {
  const legacy = normalizeProviderResponse('ipinfo', {
    ip: '8.8.8.8',
    city: 'Mountain View',
    country: 'US',
    loc: '37.4,-122.1',
    org: 'AS15169 Google LLC',
  }, '8.8.8.8');
  const lite = normalizeProviderResponse('ipinfo', {
    ip: '8.8.8.8',
    country: 'United States',
    country_code: 'US',
    asn: 'AS15169',
    as_name: 'Google LLC',
    as_domain: 'google.com',
  }, '8.8.8.8');

  assert.equal(legacy.countryCode, 'US');
  assert.equal(legacy.asn, 'AS15169');
  assert.equal(legacy.organization, 'Google LLC');
  assert.equal(lite.country, 'United States');
  assert.equal(lite.domain, 'google.com');
});

test('aggregates the majority value and preserves alternatives', () => {
  const results = [
    { providerId: 'a', ip: '8.8.8.8', type: 'IPv4', country: 'United States', countryCode: 'US', city: 'San Jose' },
    { providerId: 'b', ip: '8.8.8.8', type: 'IPv4', country: 'United States', countryCode: 'US', city: 'Mountain View' },
    { providerId: 'c', ip: '8.8.8.8', type: 'IPv4', country: 'United States', countryCode: 'US', city: 'San Jose' },
  ];
  const aggregate = aggregateResults(results);
  const country = aggregate.find(field => field.key === 'countryDisplay');
  const city = aggregate.find(field => field.key === 'city');

  assert.equal(country.value, 'United States (US)');
  assert.equal(country.agreement, 3);
  assert.equal(city.value, 'San Jose');
  assert.equal(city.agreement, 2);
  assert.deepEqual(city.alternatives, [{ value: 'Mountain View', sources: ['b'] }]);
});
