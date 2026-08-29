import type {
  HygieneMeasurement,
  HygieneInstrument,
  LightingMeasurementData,
} from '../types/safety';
import type { HygieneDocumentRepresentation } from '../types/hygieneDocument';
import { LIGHTING_DOCUMENT_TEMPLATE } from '../config/hygieneDocumentTemplates';

/** Builds an immutable document representation from persisted/evaluated data. */
export function mapLightingMeasurementToDocument(
  measurement: HygieneMeasurement,
  instruments: HygieneInstrument[] = [],
): HygieneDocumentRepresentation {
  const lighting = (measurement.rawData?.lighting ?? {}) as Partial<LightingMeasurementData>;
  const points = lighting.points ?? [];
  const campaign = lighting.campaign ?? {};
  const snapshot = measurement.normativeEvaluationSnapshot;

  const uniformityPasses =
    typeof lighting.minimumLux === 'number' && typeof lighting.uniformityThresholdLux === 'number'
      ? lighting.minimumLux >= lighting.uniformityThresholdLux
      : undefined;

  const snapshotById = new Map((measurement.instrumentSnapshots ?? []).map((instrument) => [instrument.id, instrument]));
  const resolvedInstruments = measurement.instrumentIds.map((id) => snapshotById.get(id)).filter(Boolean);
  const fallbackInstruments = instruments.map((instrument) => ({
    id: instrument.id,
    category: instrument.category,
    instrumentType: instrument.instrumentType,
    brand: instrument.brand,
    model: instrument.model,
    serialNumber: instrument.serialNumber,
    calibrationDate: instrument.calibrationDate,
    calibrationExpiry: instrument.calibrationExpiry,
    certificateUrl: instrument.certificateUrl,
  }));

  const sections = [
    {
      key: 'identification', title: 'Identificación', data: {
        measurementId: measurement.id,
        protocolType: measurement.protocolType,
        measurementDate: measurement.measurementDate,
      }
    },
    {
      key: 'context', title: 'Contexto de la medición', data: {
        companyId: measurement.context.companyId,
        establishmentId: measurement.context.establishmentId,
        sectorId: measurement.context.sectorId,
        positionId: measurement.context.positionId,
        employeeId: measurement.context.employeeId,
        campaign,
        sourceType: lighting.sourceType,
        lightingSystem: lighting.lightingSystem,
        taskDescription: lighting.taskDescription,
      }
    },
    {
      key: 'technical', title: 'Información técnica', data: {
        methodology: campaign.methodology,
        startTime: campaign.startTime,
        endTime: campaign.endTime,
        atmosphericConditions: campaign.atmosphericConditions,
        workplaceConditions: campaign.workplaceConditions,
        planOrSketchUrl: campaign.planOrSketchUrl,
        calibrationCertificateUrl: campaign.calibrationCertificateUrl,
        observations: campaign.observations,
      }
    },
    { key: 'measurement_points', title: 'Puntos de medición', data: { points } },
    {
      key: 'indicators', title: 'Indicadores y cálculos', data: {
        averageLux: lighting.averageLux,
        minimumLux: lighting.minimumLux,
        maximumLux: lighting.maximumLux,
        uniformityMinimumLux: lighting.uniformityMinimumLux,
        uniformityThresholdLux: lighting.uniformityThresholdLux,
        uniformityMinOverAverage: lighting.uniformityMinOverAverage,
        uniformityPasses,
        calculationVersion: lighting.calculationVersion,
        calculatedAt: lighting.calculatedAt,
      }
    },
    {
      key: 'instruments', title: 'Instrumentación', data: {
        instruments: resolvedInstruments.length > 0 ? resolvedInstruments : fallbackInstruments,
        instrumentIds: measurement.instrumentIds,
        snapshotAvailable: resolvedInstruments.length === measurement.instrumentIds.length,
      }
    },
    {
      key: 'normative', title: 'Evaluación normativa', data: snapshot ? {
        normativeProtocolVersionId: snapshot.normativeProtocolVersionId,
        reference: snapshot.reference,
        version: snapshot.version,
        evaluatedAt: snapshot.evaluatedAt,
        selectedCriterionId: snapshot.selectedCriterionId,
        criteriaSnapshot: snapshot.criteriaSnapshot,
      } : { status: 'not_available' }
    },
    {
      key: 'professional_review', title: 'Revisión profesional', data: {
        status: measurement.status,
        notes: measurement.notes,
      }
    },
    {
      key: 'traceability', title: 'Trazabilidad', data: {
        documentSourceMeasurementId: measurement.id,
        instrumentSnapshotAvailable: (measurement.instrumentSnapshots ?? []).length > 0,
        normativeSnapshotAvailable: Boolean(snapshot),
      }
    },
  ];

  return {
    documentId: measurement.id,
    templateKey: LIGHTING_DOCUMENT_TEMPLATE.key,
    templateVersion: LIGHTING_DOCUMENT_TEMPLATE.version,
    generatedAt: new Date().toISOString(),
    sections,
    disclaimer: 'Representación documental generada a partir de los datos persistidos de la medición. No sustituye la revisión profesional cuando corresponda.',
    regulatoryReferenceId: snapshot?.normativeProtocolVersionId,
  };
}
