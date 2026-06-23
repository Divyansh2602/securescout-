import { calcRiskScore, riskMeta } from '../../apps/web/src/lib/utils';

describe('Risk scoring', () => {
  it('calculates composite risk score correctly', () => {
    expect(calcRiskScore(0, 0, 0)).toBe(0);
    expect(calcRiskScore(1, 0, 0)).toBe(10);
    expect(calcRiskScore(2, 3, 5)).toBe(37);   // 20 + 12 + 5
    expect(calcRiskScore(20, 0, 0)).toBe(100); // capped at 100
  });

  it('caps risk score at 100', () => {
    expect(calcRiskScore(50, 50, 50)).toBe(100);
  });

  it('returns correct risk labels', () => {
    expect(riskMeta(90).label).toBe('CRITICAL RISK');
    expect(riskMeta(60).label).toBe('HIGH RISK');
    expect(riskMeta(40).label).toBe('MEDIUM RISK');
    expect(riskMeta(10).label).toBe('LOW RISK');
  });
});
