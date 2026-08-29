import {
  HygieneProtocolType,
  NormativeEvaluationSnapshot,
  NormativeProtocolVersion,
} from '../types/safety';

export function resolveActiveNormativeVersion(
  versions: NormativeProtocolVersion[],
  protocolType: HygieneProtocolType,
  at: string,
): NormativeProtocolVersion | undefined {
  const date = new Date(at).getTime();
  return versions
    .filter((item) => item.protocolType === protocolType && item.status === 'active')
    .filter((item) => !item.effectiveFrom || new Date(item.effectiveFrom).getTime() <= date)
    .filter((item) => !item.effectiveTo || new Date(item.effectiveTo).getTime() >= date)
    .sort((a, b) => new Date(b.effectiveFrom || 0).getTime() - new Date(a.effectiveFrom || 0).getTime())[0];
}

export function createNormativeEvaluationSnapshot(
  version: NormativeProtocolVersion,
  evaluatedAt = new Date().toISOString(),
): NormativeEvaluationSnapshot {
  return {
    normativeProtocolVersionId: version.id,
    reference: version.reference,
    version: version.version,
    evaluatedAt,
    criteriaSnapshot: version.criteria.map((criterion) => ({
      ...criterion,
      parameters: { ...criterion.parameters },
    })),
  };
}
