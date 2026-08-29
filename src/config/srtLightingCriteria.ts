import { getSrtReference } from './srtRegulatoryCatalog';

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

const regulation = getSrtReference('lighting');

export const SRT_LIGHTING_CRITERIA = {
  key: 'srt_84_2012_lighting',
  regulationKey: 'srt-84-2012',
  regulationVersion: '84/2012',
  uniformityRequiredRatio: 0.5,
  sourceUrl: regulation?.sourceUrl ?? 'https://www.argentina.gob.ar/srt/prevencion/publicaciones/protocolos/iluminacion',
} as const;

export function evaluateLightingCriterion(input: LightingCriterionInput): LightingCriterionEvaluation {
  const measured = input.measuredLux;
  const required = input.requiredLux;
  const uniformityObserved = input.minimumLux !== undefined && input.averageLux !== undefined && input.averageLux > 0
    ? input.minimumLux / input.averageLux
    : undefined;

  const base = {
    measuredLux: measured,
    requiredLux: required,
    uniformityRequiredRatio: SRT_LIGHTING_CRITERIA.uniformityRequiredRatio,
    uniformityObservedRatio: uniformityObserved,
    normativeReference: regulation ? `Resolución SRT ${regulation.resolution}` : 'Resolución SRT 84/2012',
    normativeVersion: SRT_LIGHTING_CRITERIA.regulationVersion,
    sourceUrl: SRT_LIGHTING_CRITERIA.sourceUrl,
  };

  if (measured === undefined || required === undefined) {
    return { ...base, result: 'insufficient_data', rationale: 'No se puede evaluar el nivel de iluminación sin valor medido y valor requerido aplicable.' };
  }

  const illuminanceOk = measured >= required;
  const uniformityOk = uniformityObserved === undefined || uniformityObserved >= SRT_LIGHTING_CRITERIA.uniformityRequiredRatio;
  const compliant = illuminanceOk && uniformityOk;

  return {
    ...base,
    result: compliant ? 'compliant' : 'non_compliant',
    rationale: compliant
      ? 'El valor medido alcanza el valor requerido y la uniformidad disponible cumple el criterio aplicable.'
      : 'El valor medido no alcanza el valor requerido o la uniformidad disponible no cumple el criterio aplicable.',
  };
}
