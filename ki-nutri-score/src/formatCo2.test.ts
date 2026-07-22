import { describe, expect, it } from 'vitest';
import { formatCo2, sanitizeCo2Text } from './formatCo2';

describe('formatCo2', () => {
  it('never returns µg', () => {
    expect(formatCo2(0.000064)).not.toMatch(/µg/);
    expect(formatCo2(0)).not.toMatch(/µg/);
  });

  it('shows a floor instead of a misleading zero for tiny values', () => {
    expect(formatCo2(0.000064)).toBe('< 0.01 g');
    expect(formatCo2(0)).toBe('0 g');
  });

  it('uses 3 decimals just below the 0.01 g threshold', () => {
    expect(formatCo2(0.0011)).toBe('0.001 g');
  });

  it('uses 2 decimals in grams from 0.01 g up to 1000 g', () => {
    expect(formatCo2(0.325)).toBe('0.33 g');
    expect(formatCo2(288)).toBe('288.00 g');
  });

  it('switches to kg at 1000 g', () => {
    expect(formatCo2(1500)).toBe('1.50 kg');
  });

  it('switches to t at 1,000,000 g', () => {
    expect(formatCo2(2_500_000)).toBe('2.50 t');
  });
});

describe('sanitizeCo2Text', () => {
  it('rewrites an embedded µg value to the consistent gram format', () => {
    const input = '„Wie spät ist es?" braucht kein großes Modell – der Energieaufwand (288 µg CO₂) steht in keinem sinnvollen Verhältnis.';
    expect(sanitizeCo2Text(input)).toBe(
      '„Wie spät ist es?" braucht kein großes Modell – der Energieaufwand (< 0.01 g CO₂) steht in keinem sinnvollen Verhältnis.',
    );
  });

  it('leaves text without µg untouched', () => {
    const input = 'Der Score von 0.85 spiegelt eine ausgewogene Wahl wider.';
    expect(sanitizeCo2Text(input)).toBe(input);
  });
});
