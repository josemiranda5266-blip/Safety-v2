import { describe, expect, it } from 'vitest';
import { LIGHTING_DOCUMENT_TEMPLATE } from '../config/hygieneDocumentTemplates';
import { mapLightingMeasurementToDocument } from './lightingDocumentMapper';
import type { HygieneMeasurement, HygieneInstrument } from '../types/safety';

const baseMeasurement = (): HygieneMeasurement => ({
  id: 'hms_test',
  context: { companyId: 'company-1', establishmentId: 'est-1' },
  protocolType: 'lighting',
  measurementDate: '2026-08-29T10:00:00.000Z',
  instrumentIds: ['lux-1'],
  rawData: {
    lighting: {
      sourceType: 'artificial',
      points: [{ id: 'p1', name: 'Punto 1', pointType: 'work_surface', lux: 300 }],
      averageLux: 400,
      minimumLux: 250,
      maximumLux: 600,
      uniformityThresholdLux: 200,
      uniformityMinOverAverage: 0.625,
      calculationVersion: '1.0.0',
    },
  },
  normativeEvaluationSnapshot: {
    normativeProtocolVersionId: 'npv-1',
    reference: 'NORMA-IL-01',
    version: '2026.1',
    evaluatedAt: '2026-08-29T10:05:00.000Z',
    criteriaSnapshot: [],
  },
  instrumentSnapshots: [{
    id: 'lux-1', instrumentType: 'Luxómetro', brand: 'Marca', model: 'Modelo', serialNumber: 'SER-1',
    calibrationDate: '2026-01-01', calibrationExpiry: '2027-01-01', certificateUrl: 'cert://1', capturedAt: '2026-08-29T10:06:00.000Z',
  }],
  status: 'validated',
  active: true,
  createdBy: 'user-1', createdAt: '2026-08-29T10:00:00.000Z', updatedBy: 'user-1', updatedAt: '2026-08-29T10:06:00.000Z',
});

describe('mapLightingMeasurementToDocument', () => {
  it('emits exactly the canonical lighting template sections', () => {
    const representation = mapLightingMeasurementToDocument(baseMeasurement());
    expect(representation.templateKey).toBe(LIGHTING_DOCUMENT_TEMPLATE.key);
    expect(representation.templateVersion).toBe(LIGHTING_DOCUMENT_TEMPLATE.version);
    expect(representation.sections.map((section) => section.key)).toEqual(LIGHTING_DOCUMENT_TEMPLATE.sectionKeys);
  });

  it('preserves normative and instrument snapshots and calculates uniformity result', () => {
    const representation = mapLightingMeasurementToDocument(baseMeasurement());
    const normative = representation.sections.find((section) => section.key === 'normative')!;
    const indicators = representation.sections.find((section) => section.key === 'indicators')!;
    const instruments = representation.sections.find((section) => section.key === 'instruments')!;
    expect(normative.data.reference).toBe('NORMA-IL-01');
    expect(normative.data.normativeProtocolVersionId).toBe('npv-1');
    expect(indicators.data.uniformityPasses).toBe(true);
    expect((instruments.data.instruments as unknown[]).length).toBe(1);
    expect((instruments.data.instruments as Array<Record<string, unknown>>)[0].serialNumber).toBe('SER-1');
  });

  it('uses persisted instrument snapshots instead of live instrument data when available', () => {
    const liveInstrument: HygieneInstrument = {
      id: 'lux-1', category: 'lighting', instrumentType: 'Luxómetro', brand: 'LIVE', model: 'LIVE', serialNumber: 'LIVE',
      status: 'active', active: true,
    };
    const representation = mapLightingMeasurementToDocument(baseMeasurement(), [liveInstrument]);
    const instruments = representation.sections.find((section) => section.key === 'instruments')!;
    const instrument = (instruments.data.instruments as Array<Record<string, unknown>>)[0];
    expect(instrument.brand).toBe('Marca');
    expect(instrument.serialNumber).toBe('SER-1');
  });
});
