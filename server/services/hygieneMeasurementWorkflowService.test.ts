import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMeasurementById: vi.fn(),
  updateMeasurement: vi.fn(),
  recordMeasurementAuditEvent: vi.fn(),
  getInstrumentById: vi.fn(),
}));

vi.mock('./hygieneService', () => ({
  getMeasurementById: mocks.getMeasurementById,
  updateMeasurement: mocks.updateMeasurement,
  getInstrumentById: mocks.getInstrumentById,
}));

vi.mock('./hygieneAuditService', () => ({
  recordMeasurementAuditEvent: mocks.recordMeasurementAuditEvent,
}));

import { updateMeasurementWithAudit } from './hygieneMeasurementWorkflowService';

describe('updateMeasurementWithAudit - lighting trust boundary', () => {
  const before = {
    id: 'm1',
    orgId: 'org1',
    protocolType: 'lighting',
    status: 'draft',
    active: true,
    instrumentIds: [],
    context: { companyId: 'c1', establishmentId: 'e1' },
    measurementDate: '2026-08-29',
    createdBy: 'user1',
    createdAt: '2026-08-29T00:00:00.000Z',
    updatedBy: 'user1',
    updatedAt: '2026-08-29T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMeasurementById.mockResolvedValue(before);
    mocks.updateMeasurement.mockImplementation(async (_id, _orgId, _actorId, updates) => ({
      ...before,
      ...updates,
      updatedBy: 'actor1',
    }));
  });

  it('recalculates metrics instead of trusting client-provided indicators', async () => {
    const result = await updateMeasurementWithAudit('m1', 'org1', 'actor1', {
      rawData: {
        lighting: {
          sourceType: 'luxmeter',
          campaign: 'campaign-1',
          points: [
            { name: 'P1', lux: 100 },
            { name: 'P2', lux: 200 },
            { name: 'P3', lux: 300 },
          ],
          averageLux: 999999,
          minimumLux: 999999,
          maximumLux: 999999,
          uniformityMinOverAverage: 999,
        },
      },
    });

    const persisted = mocks.updateMeasurement.mock.calls[0][3];
    const lighting = persisted.rawData.lighting;

    expect(lighting.averageLux).toBe(200);
    expect(lighting.minimumLux).toBe(100);
    expect(lighting.maximumLux).toBe(300);
    expect(lighting.uniformityMinOverAverage).toBe(0.5);
    expect(lighting.calculationVersion).toBe('lighting-v2-srt84-uniformity');
    expect(result?.rawData?.lighting).toMatchObject({ averageLux: 200, minimumLux: 100, maximumLux: 300 });
  });

  it('rejects invalid lux before persistence', async () => {
    await expect(updateMeasurementWithAudit('m1', 'org1', 'actor1', {
      rawData: {
        lighting: {
          sourceType: 'luxmeter',
          points: [{ name: 'P1', lux: -10 }],
        },
      },
    })).rejects.toThrow('Lectura Lux inválida');

    expect(mocks.updateMeasurement).not.toHaveBeenCalled();
  });

  it('does not reinterpret rawData for non-lighting protocols', async () => {
    mocks.getMeasurementById.mockResolvedValue({ ...before, protocolType: 'noise' });

    const rawData = { noise: { averageDb: 999 } };
    await updateMeasurementWithAudit('m1', 'org1', 'actor1', { rawData });

    expect(mocks.updateMeasurement).toHaveBeenCalledWith('m1', 'org1', 'actor1', { rawData });
  });
});
