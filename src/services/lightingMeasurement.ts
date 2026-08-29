import { CreateLightingMeasurementData, LightingMeasurementData, LightingMeasurementPoint } from '../types/safety';

function round(value: number): number { return Math.round(value * 100) / 100; }

export function calculateLightingMeasurement(input: CreateLightingMeasurementData): LightingMeasurementData {
  const values = input.points.map((point) => Number(point.lux)).filter((value) => Number.isFinite(value));
  if (values.length === 0) throw new Error('Se requiere al menos un punto de medición válido.');

  const averageLux = round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const minimumLux = round(Math.min(...values));
  const maximumLux = round(Math.max(...values));
  const uniformityRatio = maximumLux > 0 ? round(minimumLux / maximumLux) : undefined;

  const points: LightingMeasurementPoint[] = input.points.map((point, index) => ({
    ...point,
    id: `lighting-point-${index + 1}`,
    lux: Number(point.lux),
  }));

  return {
    sourceType: input.sourceType,
    lightingSystem: input.lightingSystem?.trim() || undefined,
    taskDescription: input.taskDescription?.trim() || undefined,
    points,
    averageLux,
    minimumLux,
    maximumLux,
    uniformityRatio,
    calculationVersion: 'lighting-v1',
    calculatedAt: new Date().toISOString(),
  };
}
