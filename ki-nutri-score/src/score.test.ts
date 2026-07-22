import { describe, expect, it } from 'vitest';
import { calculateScore, formatCo2Value } from './score';
import { scenarios } from './scenarios';

describe('calculateScore', () => {
  it('flags trivial questions with a large model as poor fit', () => {
    const result = calculateScore(scenarios[0], 'gross');
    expect(result.letter).toBe('E');
    expect(result.co2Gram).toBeGreaterThan(0);
  });

  it('gives a better grade for complex tasks with a large model', () => {
    const result = calculateScore(scenarios[3], 'gross');
    expect(result.letter).toBe('A');
    expect(result.benefitIndex).toBeGreaterThan(0.7);
  });

  it('includes a cost estimate in euros', () => {
    const result = calculateScore(scenarios[0], 'gross');
    expect(result.costEuro).toBe(0.012);
  });

  it('formats CO₂ values with dynamic precision', () => {
    expect(formatCo2Value(0.004)).toBe('0.004 g');
    expect(formatCo2Value(0.12)).toBe('0.120 g');
    expect(formatCo2Value(1.2)).toBe('1.2 g');
    expect(formatCo2Value(1500)).toBe('1.50 kg');
  });
});
