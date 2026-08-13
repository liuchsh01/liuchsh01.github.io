((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnnualBonusTaxCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const TAX_BRACKETS = Object.freeze([
    { minimum: 0, maximum: 36000, rate: 0.03, deduction: 0 },
    { minimum: 36000, maximum: 144000, rate: 0.10, deduction: 210 },
    { minimum: 144000, maximum: 300000, rate: 0.20, deduction: 1410 },
    { minimum: 300000, maximum: 420000, rate: 0.25, deduction: 2660 },
    { minimum: 420000, maximum: 660000, rate: 0.30, deduction: 4410 },
    { minimum: 660000, maximum: 960000, rate: 0.35, deduction: 7160 },
    { minimum: 960000, maximum: Number.POSITIVE_INFINITY, rate: 0.45, deduction: 15160 },
  ]);

  const bracketForPreTax = preTaxAmount => TAX_BRACKETS.find(
    bracket => preTaxAmount <= bracket.maximum,
  ) || TAX_BRACKETS.at(-1);

  const calculatePostTax = (preTaxAmount) => {
    const bracket = bracketForPreTax(preTaxAmount);
    return preTaxAmount - (preTaxAmount * bracket.rate - bracket.deduction);
  };

  const calculatePreTaxCandidates = postTaxAmount => TAX_BRACKETS
    .map(bracket => (postTaxAmount - bracket.deduction) / (1 - bracket.rate))
    .filter((candidate, index) => {
      const bracket = TAX_BRACKETS[index];
      const inBracket = candidate > 0
        && candidate >= bracket.minimum
        && candidate <= bracket.maximum;
      return inBracket && Math.abs(calculatePostTax(candidate) - postTaxAmount) < 0.01;
    });

  return { TAX_BRACKETS, calculatePostTax, calculatePreTaxCandidates };
});
