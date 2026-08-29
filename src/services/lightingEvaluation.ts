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
    uniformityRatio?: number;
    pointsMeasured: number;
  };
  criteria: LightingCriterionEvaluation[];
  observations: string[];
  requiresProfessionalReview: boolean;
}

function observeCriterion(
  criterion: NormativeCriterion,
  data: LightingMeasurementData,
): LightingCriterionEvaluation {
  const observations: string[] = [];
  observations.push(`Datos disponibles: ${data.points.length} punto(s) de medición.`);
  if (data.averageLux !== undefined) observations.push(`Iluminancia promedio calculada: ${data.averageLux} lux.`);
  if (data.minimumLux !== undefined) observations.push(`Iluminancia mínima calculada: ${data.minimumLux} lux.`);
  if (data.maximumLux !== undefined) observations.push(`Iluminancia máxima calculada: ${data.maximumLux} lux.`);
  if (data.uniformityRatio !== undefined) observations.push(`Relación mínimo/máximo calculada: ${data.uniformityRatio}.`);
  if (criterion.applicability) observations.push(`Aplicabilidad declarada: ${criterion.applicability}.`);
  return { criterionId: criterion.id, code: criterion.code, title: criterion.title, status: 'observed', observations };
}

export function evaluateLightingMeasurement(
  data: LightingMeasurementData,
  snapshot: NormativeEvaluationSnapshot,
): LightingAssistedEvaluation {
  if (!data.points.length) throw new Error('La medición de iluminación no contiene puntos para evaluar.');
  if (!snapshot.criteriaSnapshot.length) {
    return {
      protocolType: 'lighting',
      status: 'pending',
      normativeReference: snapshot.reference,
      normativeVersion: snapshot.version,
      evaluatedAt: new Date().toISOString(),
      summary: { averageLux: data.averageLux, minimumLux: data.minimumLux, maximumLux: data.maximumLux, uniformityRatio: data.uniformityRatio, pointsMeasured: data.points.length },
      criteria: [],
      observations: ['La medición tiene un snapshot normativo, pero no contiene criterios evaluables estructurados.'],
      requiresProfessionalReview: true,
    };
  }

  return {
    protocolType: 'lighting',
    status: 'requires_professional_review',
    normativeReference: snapshot.reference,
    normativeVersion: snapshot.version,
    evaluatedAt: new Date().toISOString(),
    summary: { averageLux: data.averageLux, minimumLux: data.minimumLux, maximumLux: data.maximumLux, uniformityRatio: data.uniformityRatio, pointsMeasured: data.points.length },
    criteria: snapshot.criteriaSnapshot.map((criterion) => observeCriterion(criterion, data)),
    observations: [
      'La evaluación relaciona datos medidos con el snapshot normativo asociado.',
      'No se emite una declaración automática de cumplimiento.',
      'La interpretación y conclusión final requieren revisión profesional.',
    ],
    requiresProfessionalReview: true,
  };
}
