const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculatePostTax,
  calculatePreTaxCandidates,
} = require('../tools/20250127_annual-bonus-tax/tax-core.js');

test('pre-tax calculation follows the annual bonus tax brackets', () => {
  assert.equal(calculatePostTax(36000), 34920);
  assert.equal(calculatePostTax(100000), 90210);
});

test('post-tax inversion returns every valid bracket candidate', () => {
  const postTax = calculatePostTax(36001);
  const candidates = calculatePreTaxCandidates(postTax);

  assert.equal(candidates.length, 2);
  assert.ok(Math.abs(candidates[0] - 33619.48453608248) < 0.000001);
  assert.ok(Math.abs(candidates[1] - 36001) < 0.000001);
  assert.ok(candidates.every(candidate => Math.abs(calculatePostTax(candidate) - postTax) < 0.01));
});

test('ordinary post-tax values retain a single inverse', () => {
  const candidates = calculatePreTaxCandidates(100000);
  assert.equal(candidates.length, 1);
  assert.ok(Math.abs(candidates[0] - 110877.77777777778) < 0.000001);
});
