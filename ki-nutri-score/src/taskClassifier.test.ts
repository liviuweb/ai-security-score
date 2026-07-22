import { describe, expect, it } from 'vitest';
import { classifyPrompt } from './taskClassifier';

describe('classifyPrompt', () => {
  it('detects code tasks from programming keywords', () => {
    const result = classifyPrompt('Bitte refaktoriere diese Funktion und schreibe Tests dazu.');
    expect(result.type).toBe('code');
    expect(result.reason.join(' ')).toContain('refaktoriere');
  });

  it('detects analytical tasks from data keywords', () => {
    const result = classifyPrompt('Analysiere diesen Datensatz und erkläre die Muster.');
    expect(result.type).toBe('analyse');
    expect(result.reason).toEqual(expect.arrayContaining([expect.stringContaining('analysiere')]));
  });

  it('detects trivial tasks from simple questions', () => {
    const result = classifyPrompt('Wie spät ist es gerade?');
    expect(result.type).toBe('trivial');
  });
});
