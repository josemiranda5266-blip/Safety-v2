import { LightingRequirement, resolveLightingRequirement } from '../config/srtLightingRequirements';
import { HygieneMeasurement } from '../types/safety';

export interface LightingRequirementSelection {
  requirement: LightingRequirement;
  selectedBy: 'catalog_match';
  selectedAt: string;
}

export interface LightingRequirementResolutionInput {
  taskDescription?: string;
  localDescription?: string;
  establishmentType?: string;
}

/**
 * Resolves a regulatory lighting requirement without guessing.
 * Ambiguous or unmatched descriptions intentionally return undefined.
 */
export function resolveSrtLightingRequirement(input: LightingRequirementResolutionInput): LightingRequirement | undefined {
  return resolveLightingRequirement(input.taskDescription, input.localDescription, input.establishmentType);
}

/**
 * Freezes the selected regulatory criterion in the measurement snapshot.
 * The current measurement object is not mutated.
 */
export function buildLightingNormativeSnapshot(
  measurement: HygieneMeasurement,
  requirement: LightingRequirement,
  evaluatedAt = new Date().toISOString(),
) {
  return {
    normativeProtocolVersionId: 'srt-84-2012',
    reference: 'Resolución SRT 84/2012 + Decreto 351/79 Anexo IV',
    version: '84/2012',
    evaluatedAt,
    criteriaSnapshot: [
      {
        id: requirement.id,
        code: requirement.id,
        title: requirement.label,
        description: requirement.sourceNote,
        unit: 'lux',
        parameters: {
          requiredLux: requirement.requiredLux,
          maximumLux: requirement.maximumLux ?? false,
          classification: requirement.classification,
          sourceTable: requirement.sourceTable,
          measurementId: measurement.id,
          measurementDate: measurement.measurementDate,
        },
        applicability: requirement.category,
      },
    ],
  } as const;
}
