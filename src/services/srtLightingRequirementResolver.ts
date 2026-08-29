import { LightingRequirement, resolveLightingRequirement } from '../config/srtLightingRequirements';
import { HygieneMeasurement, NormativeEvaluationSnapshot } from '../types/safety';

export interface LightingRequirementSelection {
  requirement: LightingRequirement;
  selectedBy: 'catalog_match' | 'professional_selection';
  selectedAt: string;
}

export interface LightingRequirementResolutionInput {
  category?: string;
  task?: string;
  location?: string;
  professionalRequirementId?: string;
}

/** Resolves a regulatory requirement without guessing; ambiguous/unmatched cases remain unresolved. */
export function resolveSrtLightingRequirement(input: LightingRequirementResolutionInput): LightingRequirement | undefined {
  return resolveLightingRequirement(input);
}

/** Freezes the selected requirement in the measurement's normative snapshot. */
export function buildLightingNormativeSnapshot(
  measurement: HygieneMeasurement,
  requirement: LightingRequirement,
  evaluatedAt = new Date().toISOString(),
): NormativeEvaluationSnapshot {
  return {
    normativeProtocolVersionId: 'srt-84-2012',
    reference: 'Resolución SRT 84/2012 + Decreto 351/79 Anexo IV',
    version: '84/2012',
    evaluatedAt,
    criteriaSnapshot: [
      {
        id: requirement.id,
        code: requirement.id,
        title: requirement.locationOrTask,
        description: requirement.notes,
        unit: requirement.unit,
        parameters: {
          requiredLux: requirement.requiredLux,
          maximumLux: requirement.maximumLux ?? false,
          category: requirement.category,
          sourceTable: requirement.source,
          measurementId: measurement.id,
          measurementDate: measurement.measurementDate,
          legalSource: requirement.legalSource,
        },
        applicability: requirement.category,
      },
    ],
  };
}
