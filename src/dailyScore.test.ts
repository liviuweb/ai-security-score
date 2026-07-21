import { describe, expect, it } from 'vitest';
import { CO2_BUDGET_G, aggregateDay, burdenToLetter } from './dailyScore';
import type { UsageEvent } from './usageTypes';

function makeEvent(overrides: Partial<UsageEvent>): UsageEvent {
  return {
    id: 'test-id',
    timestamp: Date.now(),
    source: 'chatgpt',
    taskType: 'fakten',
    modelSize: 'mittel',
    tokens: 0,
    co2Gram: 0,
    costEuro: 0,
    effortWh: 0,
    appropriateness: 1,
    ...overrides,
  };
}

describe('aggregateDay', () => {
  it('handles an empty day cleanly', () => {
    const result = aggregateDay([]);
    expect(result.totalTokens).toBe(0);
    expect(result.avgEfficiency).toBe(1);
    expect(result.volumeLoad).toBe(0);
    expect(result.dailyBurden).toBe(0);
    expect(result.letter).toBe('A');
  });

  it('still carries a baseline burden on an efficient high-volume day', () => {
    const result = aggregateDay([
      makeEvent({ tokens: 50_000, co2Gram: CO2_BUDGET_G, appropriateness: 1 }),
    ]);
    expect(result.volumeLoad).toBe(1);
    expect(result.avgEfficiency).toBe(1);
    expect(result.dailyBurden).toBeCloseTo(0.4);
    expect(result.letter).toBe('C');
  });

  it('stays low-burden on an inefficient but low-volume day', () => {
    const result = aggregateDay([
      makeEvent({ tokens: 200, co2Gram: 0.5, appropriateness: 0 }),
    ]);
    expect(result.volumeLoad).toBeCloseTo(0.1);
    expect(result.avgEfficiency).toBe(0);
    expect(result.dailyBurden).toBeCloseTo(0.1);
    expect(result.letter).toBe('A');
  });

  it('scores worst when volume and inefficiency are both high', () => {
    const result = aggregateDay([
      makeEvent({ tokens: 50_000, co2Gram: CO2_BUDGET_G, appropriateness: 0 }),
    ]);
    expect(result.dailyBurden).toBeCloseTo(1);
    expect(result.letter).toBe('E');
  });
});

describe('burdenToLetter', () => {
  it('maps the threshold boundaries correctly', () => {
    expect(burdenToLetter(0.18)).toBe('A');
    expect(burdenToLetter(0.19)).toBe('B');
    expect(burdenToLetter(0.32)).toBe('B');
    expect(burdenToLetter(0.33)).toBe('C');
    expect(burdenToLetter(0.5)).toBe('C');
    expect(burdenToLetter(0.51)).toBe('D');
    expect(burdenToLetter(0.7)).toBe('D');
    expect(burdenToLetter(0.71)).toBe('E');
  });
});
