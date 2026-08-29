import { SRT_REGULATORY_CATALOG } from './srtRegulatoryCatalog';

export type LightingCriterionResult = 'compliant' | 'non_compliant' | 'insufficient_data';

export interface LightingCriterionInput {
  measuredLux?: number;
  requiredLux?: number;
  minimumLux?: number;
  averageLux?: number;
}

export interface LightingCriterionEvaluation {
  result: LightingCriterionResult;
  measuredLux?: number;
  requiredLux?: number;
  uniformityRequiredRatio: number;
  uniformityObservedRatio?: number;
  normativeReference: string;
  normativeVersion: string;
  sourceUrl: string;
  rationale: string;
}

const regulation = SRT_REGULATORY_CATALOG['srt-84-2012'];

export const SRT_LIGHTING_CRITERIA = {
  key: 'srt_84_2012_lighting',
  regulationKey: 'srt-84-2012',
  regulationVersion: '84/2012',
  uniformityRequiredRatio: 0.5,
  sourceUrl: regulation?.sourceUrl ?? 'https://www.argentina.gob.ar/normativa/nacional/resolución-84-2012-193616/texto',
} as const;

export function evaluateLightingCriterion(input: LightingCriterionInput): LightingCriterionEvaluation {
  const measured = input.measuredLux;
  const required = input.requiredLux;
  const uniformityObserved = input.minimumLux !== undefined && input.averageLux && input.averageLux > 0
    ? input.minimumLux / input.averageLux
    : undefined;

  if (measured === undefined || required === undefined) {
    return { result: 'insufficient_data', measuredLux: measured, requiredLux: required, uniformityRequiredRatio: SRT_LIGHTING_CRITERIA.uniformityRequiredRatio, uniformityObservedRatio: uniformityObserved, normativeReference: regulation?.reference ?? 'Resolución SRT 84/2012', normativeVersion: SRT_LIGHTING_CRITERIA.regulationVersion, sourceUrl: SRT_LIGHTING_CRITERIA.sourceUrl, rationale: 'No se puede evaluar el nivel de iluminación sin valor medido y valor requerido aplicable.' };
  }

  const illuminanceOk = measured >= required;
  const uniformityOk = uniformityObserved === undefined || uniformityObserved >= SRT_LIGHTING_CRITERIA.uniformityRequiredRatio;
  const compliant = illuminanceOk && uniformityOk;

  return { result: compliant ? 'compliant' : 'non_compliant', measuredLux: measured, requiredLux: required, uniformityRequiredRatio: SRT_LIGHTING_CRITERIA.uniformityRequiredRatio, uniformityObservedRatio: uniformityObserved, normativeReference: regulation?.reference ?? 'Resolución SRT 84/2012', normativeVersion: SRT_LIGHTING_CRITERIA.regulationVersion, sourceUrl: SRT_LIGHTING_CRITERIA.sourceUrl, rationale: compliant ? 'El valor medido alcanza el valor requerido y la uniformidad disponible cumple el criterio aplicable.' : 'El valor medido no alcanza el valor requerido o la uniformidad disponible no cumple el criterio aplicable.' };
}
