import { getSrtReference } from './srtRegulatoryCatalog';

export type LightingCriterionResult = 'compliant' | 'non_compliant' | 'insufficient_data';

export interface LightingCriterionInput {
  measuredLux?: number;
  requiredLux?: number;
  minimumLux?: number;
  averageLux?: number;
  measurementDate?: string;
  evaluationDate?: string;
}

export interface LightingCriterionEvaluation {
  result: LightingCriterionResult;
  measuredLux?: number;
  requiredLux?: number;
  uniformityRequiredRatio: number;
  uniformityObservedRatio?: number;
  validityMonths: number;
  validityExpiresAt?: string;
  isExpired?: boolean;
  normativeReference: string;
  normativeVersion: string;
  sourceUrl: string;
  rationale: string;
}

const regulation = getSrtReference('lighting');

export const SRT_LIGHTING_CRITERIA = {
  key: 'srt_84_2012_lighting',
  regulationKey: 'srt-84-2012',
  regulationVersion: '84/2012',
  uniformityRequiredRatio: 0.5,
  validityMonths: 12,
  sourceUrl: regulation?.sourceUrl ?? 'https://www.argentina.gob.ar/srt/prevencion/publicaciones/protocolos/iluminacion',
} as const;

function addMonths(dateIso: string, months: number): string | undefined {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return undefined;
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result.toISOString();
}

export function evaluateLightingCriterion(input: LightingCriterionInput): LightingCriterionEvaluation {
  const measured = input.measuredLux;
  const required = input.requiredLux;
  const uniformityObserved = input.minimumLux !== undefined && input.averageLux !== undefined && input.averageLux > 0
    ? input.minimumLux / input.averageLux
    : undefined;
  const validityExpiresAt = input.measurementDate
    ? addMonths(input.measurementDate, SRT_LIGHTING_CRITERIA.validityMonths)
    : undefined;
  const evaluationDate = input.evaluationDate ? new Date(input.evaluationDate) : new Date();
  const expiryDate = validityExpiresAt ? new Date(validityExpiresAt) : undefined;
  const isExpired = expiryDate ? evaluationDate.getTime() >= expiryDate.getTime() : undefined;

  const base = {
    measuredLux: measured,
    requiredLux: required,
    uniformityRequiredRatio: SRT_LIGHTING_CRITERIA.uniformityRequiredRatio,
    uniformityObservedRatio: uniformityObserved,
    validityMonths: SRT_LIGHTING_CRITERIA.validityMonths,
    validityExpiresAt,
    isExpired,
    normativeReference: regulation ? `Resolución SRT ${regulation.resolution}` : 'Resolución SRT 84/2012',
    normativeVersion: SRT_LIGHTING_CRITERIA.regulationVersion,
    sourceUrl: SRT_LIGHTING_CRITERIA.sourceUrl,
  };

  if (measured === undefined || required === undefined || uniformityObserved === undefined) {
    return { ...base, result: 'insufficient_data', rationale: 'No se puede completar la evaluación sin valor medido, valor requerido aplicable y datos suficientes para calcular la uniformidad mínima/media.' };
  }

  const illuminanceOk = measured >= required;
  const uniformityOk = uniformityObserved >= SRT_LIGHTING_CRITERIA.uniformityRequiredRatio;
  const compliant = illuminanceOk && uniformityOk;

  return {
    ...base,
    result: compliant ? 'compliant' : 'non_compliant',
    rationale: compliant
      ? 'El valor medido alcanza el valor requerido y la relación entre iluminancia mínima y media cumple el criterio aplicable.'
      : 'El valor medido no alcanza el valor requerido o la relación entre iluminancia mínima y media no cumple el criterio aplicable.',
  };
}
