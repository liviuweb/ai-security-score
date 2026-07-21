import { describe, expect, it } from 'vitest';
import { calculateScalingImpact } from './scaling';

describe('calculateScalingImpact', () => {
  it('scales energy and emissions with request volume', () => {
    const impact = calculateScalingImpact(1000000, 2000, 0.0036);
    expect(impact.totalEnergyWh).toBeGreaterThan(0);
    expect(impact.totalCo2Gram).toBeGreaterThan(0);
    expect(impact.totalCostEuro).toBeGreaterThan(0);
    expect(impact.carKm).toBeGreaterThan(0);
    // CO₂ = energy × 0.4 g/Wh (default co2PerWhGram)
    expect(impact.totalCo2Gram).toBeCloseTo(impact.totalEnergyWh * 0.4, 5);
  });
});
