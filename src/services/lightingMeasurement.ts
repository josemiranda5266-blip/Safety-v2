import { CreateLightingMeasurementData, LightingMeasurementData, LightingMeasurementPoint } from '../types/safety';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculates the SRT 84/2012 lighting metrics from the complete set of
 * valid lux readings in the campaign.
 *
 * Uniformity is NOT minimum/maximum. The regulatory relationship is:
 * E mínima >= E media / 2.
 */
export function calculateLightingMeasurement(input: CreateLightingMeasurementData): LightingMeasurementData {
  const points: LightingMeasurementPoint[] = input.points
    .map((point, index) => ({
      ...point,
      id: `lighting-point-${index + 1}`,
      lux: Number(point.lux),
    }))
    .filter((point) => Number.isFinite(point.lux));

  if (points.length === 0) {
    throw new Error('Se requiere al menos un punto de medición válido.');
  }

  const values = points.map((point) => point.lux);
  const averageLux = round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const minimumLux = round(Math.min(...values));
  const maximumLux = round(Math.max(...values));
  const uniformityThresholdLux = round(averageLux / 2);
  const uniformityMinOverAverage = averageLux > 0 ? round(minimumLux / averageLux) : undefined;

  return {
    sourceType: input.sourceType,
    lightingSystem: input.lightingSystem?.trim() || undefined,
    taskDescription: input.taskDescription?.trim() || undefined,
    points,
    averageLux,
    minimumLux,
    maximumLux,
    uniformityMinimumLux: minimumLux,
    uniformityThresholdLux,
    uniformityMinOverAverage,
    calculationVersion: 'lighting-v2-srt84-uniformity',
    calculatedAt: new Date().toISOString(),
  };
}
