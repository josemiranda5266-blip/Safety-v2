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
  if (data.uniformityRatio !== undefined) {
    observations.push(`Uniformidad de iluminancia: E mínima = ${data.uniformityRatio} lux.`);
    if (data.averageLux !== undefined) {
      observations.push(`Criterio de uniformidad de referencia: E mínima ≥ E media / 2 = ${(data.averageLux / 2).toFixed(2)} lux.`);
    }
  }
  if (criterion.applicability) observations.push(`Aplicabilidad declarada: ${criterion.applicability}.`);
  const requiredLux = criterion.parameters.requiredLux;
  if (typeof requiredLux === 'number') observations.push(`Valor requerido según el criterio congelado: ${requiredLux} lux.`);
  return { criterionId: criterion.id, code: criterion.code, title: criterion.title, status: 'observed', observations };
}

export function evaluateLightingMeasurement(
  data: LightingMeasurementData,
  snapshot: NormativeEvaluationSnapshot,
): LightingAssistedEvaluation {
  if (!data.points.length) throw new Error('La medición de iluminación no contiene puntos para evaluar.');
  const criteria = snapshot.selectedCriterionId
    ? snapshot.criteriaSnapshot.filter((criterion) => criterion.id === snapshot.selectedCriterionId)
    : snapshot.criteriaSnapshot;

  if (!criteria.length) {
    return {
      protocolType: 'lighting',
      status: 'pending',
      normativeReference: snapshot.reference,
      normativeVersion: snapshot.version,
      evaluatedAt: new Date().toISOString(),
      summary: { averageLux: data.averageLux, minimumLux: data.minimumLux, maximumLux: data.maximumLux, uniformityRatio: data.uniformityRatio, pointsMeasured: data.points.length },
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
    summary: { averageLux: data.averageLux, minimumLux: data.minimumLux, maximumLux: data.maximumLux, uniformityRatio: data.uniformityRatio, pointsMeasured: data.points.length },
    criteria: criteria.map((criterion) => observeCriterion(criterion, data)),
    observations: [
      'La evaluación relaciona datos medidos con el criterio normativo seleccionado y congelado.',
      'Para uniformidad, el protocolo exige E mínima ≥ E media / 2; la salida debe conservar la magnitud y la comparación, no presentarla como una relación mínimo/máximo.',
      'El valor requerido se obtiene del criterio del snapshot, no de un campo manual de la medición.',
      'No se emite una declaración automática de cumplimiento.',
      'La interpretación y conclusión final requieren revisión profesional.',
    ],
    requiresProfessionalReview: true,
  };
}
