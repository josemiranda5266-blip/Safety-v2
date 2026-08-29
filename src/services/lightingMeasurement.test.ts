import { describe, expect, it } from 'vitest';
import { calculateLightingMeasurement } from './lightingMeasurement';

describe('calculateLightingMeasurement', () => {
  const base = {
    sourceType: 'luxmeter',
    campaign: 'campaign-1',
    points: [
      { name: 'P1', lux: 100 },
      { name: 'P2', lux: 200 },
      { name: 'P3', lux: 300 },
    ],
  } as const;

  it('calculates canonical average, min, max and uniformity', () => {
    const result = calculateLightingMeasurement(base);
    expect(result.averageLux).toBe(200);
    expect(result.minimumLux).toBe(100);
    expect(result.maximumLux).toBe(300);
    expect(result.uniformityMinimumLux).toBe(100);
    expect(result.uniformityThresholdLux).toBe(100);
    expect(result.uniformityMinOverAverage).toBe(0.5);
    expect(result.calculationVersion).toBe('lighting-v2-srt84-uniformity');
  });

  it('rejects negative lux readings', () => {
    expect(() => calculateLightingMeasurement({
      ...base,
      points: [{ name: 'P1', lux: -1 }],
    })).toThrow('Lectura Lux inválida');
  });

  it('rejects non-finite lux readings instead of silently dropping them', () => {
    expect(() => calculateLightingMeasurement({
      ...base,
      points: [{ name: 'P1', lux: Number.NaN }],
    })).toThrow('Lectura Lux inválida');
  });
});
