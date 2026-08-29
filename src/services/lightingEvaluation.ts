import {
  LightingMeasurementData,
  NormativeEvaluationSnapshot,
  NormativeCriterion,
} from '../types/safety';

export type LightingEvaluationStatus =
  | 'pending'
  | 'informative'
  | 'requires_professional_review';

export interface LightingCriterionEvaluation {
  criterionId: string;
  code: string;
  title: string;
  status: 'not_evaluated' | 'observed';
  observations: string[];
}

export interface LightingAssistedEvaluation {
  protocolType: 'lighting';
  status: LightingEvaluationStatus;
  normativeReference: string;
  normativeVersion: string;
  evaluatedAt: string;
  summary: {
    averageLux?: number;
    minimumLux?: number;
    maximumLux?: number;
    uniformityMinimumLux?: number;
    uniformityThresholdLux?: number;
    uniformityMinOverAverage?: number;
    pointsMeasured: number;
  };
  criteria: LightingCriterionEvaluation[];
  observations: string[];
  requiresProfessionalReview: boolean;
}

function resolveMinimumLux(data: LightingMeasurementData): number | undefined {
  if (data.minimumLux !== undefined) return data.minimumLux;
  if (data.uniformityMinimumLux !== undefined) return data.uniformityMinimumLux;
  // Backwards compatibility only: the legacy field was incorrectly named
  // uniformityRatio, but historical values represented the minimum illuminance.
  if (data.uniformityRatio !== undefined) return data.uniformityRatio;
  return data.points.length ? Math.min(...data.points.map((point) => point.lux)) : undefined;
}

function resolveAverageLux(data: LightingMeasurementData): number | undefined {
  if (data.averageLux !== undefined) return data.averageLux;
  if (!data.points.length) return undefined;
  return data.points.reduce((sum, point) => sum + point.lux, 0) / data.points.length;
}

function observeCriterion(
  criterion: NormativeCriterion,
  data: LightingMeasurementData,
): LightingCriterionEvaluation {
  const observations: string[] = [];
  const averageLux = resolveAverageLux(data);
  const minimumLux = resolveMinimumLux(data);
  const uniformityThresholdLux = averageLux !== undefined ? averageLux / 2 : undefined;
  const uniformityMinOverAverage = minimumLux !== undefined && averageLux !== undefined && averageLux > 0
    ? minimumLux / averageLux
    : undefined;

  observations.push(`Datos disponibles: ${data.points.length} punto(s) de medición.`);
  if (averageLux !== undefined) observations.push(`Iluminancia promedio calculada: ${averageLux} lux.`);
  if (minimumLux !== undefined) observations.push(`Iluminancia mínima: ${minimumLux} lux.`);
  if (data.maximumLux !== undefined) observations.push(`Iluminancia máxima: ${data.maximumLux} lux.`);

  if (minimumLux !== undefined && uniformityThresholdLux !== undefined) {
    observations.push(`Uniformidad de iluminancia: E mínima = ${minimumLux} lux; umbral E media / 2 = ${uniformityThresholdLux.toFixed(2)} lux.`);
    observations.push(`Relación informativa E mínima / E media: ${uniformityMinOverAverage?.toFixed(3)}.`);
  }

  if (criterion.applicability) observations.push(`Aplicabilidad declarada: ${criterion.applicability}.`);
  const requiredLux = criterion.parameters.requiredLux;
  if (typeof requiredLux === 'number') observations.push(`Valor requerido según el criterio congelado: ${requiredLux} lux.`);

  return {
    criterionId: criterion.id,
    code: criterion.code,
    title: criterion.title,
    status: 'observed',
    observations,
  };
}

export function evaluateLightingMeasurement(
  data: LightingMeasurementData,
  snapshot: NormativeEvaluationSnapshot,
): LightingAssistedEvaluation {
  if (!data.points.length) throw new Error('La medición de iluminación no contiene puntos para evaluar.');

  const averageLux = resolveAverageLux(data);
  const minimumLux = resolveMinimumLux(data);
  const uniformityThresholdLux = averageLux !== undefined ? averageLux / 2 : undefined;
  const uniformityMinOverAverage = minimumLux !== undefined && averageLux !== undefined && averageLux > 0
    ? minimumLux / averageLux
    : undefined;

  const criteria = snapshot.selectedCriterionId
    ? snapshot.criteriaSnapshot.filter((criterion) => criterion.id === snapshot.selectedCriterionId)
    : snapshot.criteriaSnapshot;

  const summary = {
    averageLux,
    minimumLux,
    maximumLux: data.maximumLux,
    uniformityMinimumLux: minimumLux,
    uniformityThresholdLux,
    uniformityMinOverAverage,
    pointsMeasured: data.points.length,
  };

  if (!criteria.length) {
    return {
      protocolType: 'lighting',
      status: 'pending',
      normativeReference: snapshot.reference,
      normativeVersion: snapshot.version,
      evaluatedAt: new Date().toISOString(),
      summary,
      criteria: [],
      observations: ['La medición tiene un snapshot normativo, pero no contiene un criterio seleccionado válido.'],
      requiresProfessionalReview: true,
    };
  }

  return {
    protocolType: 'lighting',
    status: 'requires_professional_review',
    normativeReference: snapshot.reference,
    normativeVersion: snapshot.version,
    evaluatedAt: new Date().toISOString(),
    summary,
    criteria: criteria.map((criterion) => observeCriterion(criterion, data)),
    observations: [
      'La evaluación relaciona datos medidos con el criterio normativo seleccionado y congelado.',
      'Para uniformidad se conserva la magnitud E mínima y se compara con E media / 2; la relación E mínima / E media se muestra únicamente como indicador derivado.',
      'El valor requerido se obtiene del criterio del snapshot, no de un campo manual de la medición.',
      'No se emite una declaración automática de cumplimiento.',
      'La interpretación y conclusión final requieren revisión profesional.',
    ],
    requiresProfessionalReview: true,
  };
}
