import type {
  HygieneMeasurement,
  HygieneInstrument,
  LightingMeasurementData,
} from '../types/safety';
import type { HygieneDocumentRepresentation } from '../types/hygieneDocument';

/**
 * Builds the immutable document representation for an illumination measurement.
 * The mapper only transports persisted/evaluated data; it does not re-evaluate
 * normative criteria or recalculate lighting metrics.
 */
export function mapLightingMeasurementToDocument(
  measurement: HygieneMeasurement,
  instruments: HygieneInstrument[] = [],
): HygieneDocumentRepresentation {
  const lighting = (measurement.rawData?.lighting ?? {}) as Partial<LightingMeasurementData>;
  const points = lighting.points ?? [];
  const campaign = lighting.campaign ?? {};
  const snapshot = measurement.normativeEvaluationSnapshot;

  const sections = [
    {
      key: 'identification',
      title: 'Identificación',
      data: {
        measurementId: measurement.id,
        protocolType: measurement.protocolType,
        measurementDate: measurement.measurementDate,
        companyId: measurement.context.companyId,
        establishmentId: measurement.context.establishmentId,
        sectorId: measurement.context.sectorId,
        positionId: measurement.context.positionId,
        employeeId: measurement.context.employeeId,
      },
    },
    {
      key: 'campaign',
      title: 'Campaña de medición',
      data: {
        ...campaign,
        sourceType: lighting.sourceType,
        lightingSystem: lighting.lightingSystem,
        taskDescription: lighting.taskDescription,
      },
    },
    {
      key: 'instrumentation',
      title: 'Instrumentación',
      data: {
        instruments: instruments.map((instrument) => ({
          id: instrument.id,
          category: instrument.category,
          instrumentType: instrument.instrumentType,
          brand: instrument.brand,
          model: instrument.model,
          serialNumber: instrument.serialNumber,
          calibrationDate: instrument.calibrationDate,
          calibrationExpiry: instrument.calibrationExpiry,
          certificateUrl: instrument.certificateUrl,
        })),
        instrumentIds: measurement.instrumentIds,
      },
    },
    {
      key: 'measurement_points',
      title: 'Puntos de medición',
      data: { points },
    },
    {
      key: 'calculations',
      title: 'Cálculos de iluminación',
      data: {
        averageLux: lighting.averageLux,
        minimumLux: lighting.minimumLux,
        maximumLux: lighting.maximumLux,
        uniformityMinimumLux: lighting.uniformityMinimumLux,
        uniformityThresholdLux: lighting.uniformityThresholdLux,
        uniformityMinOverAverage: lighting.uniformityMinOverAverage,
        calculationVersion: lighting.calculationVersion,
        calculatedAt: lighting.calculatedAt,
      },
    },
    {
      key: 'normative_evaluation',
      title: 'Evaluación normativa',
      data: snapshot
        ? {
            normativeProtocolVersionId: snapshot.normativeProtocolVersionId,
            reference: snapshot.reference,
            version: snapshot.version,
            evaluatedAt: snapshot.evaluatedAt,
            selectedCriterionId: snapshot.selectedCriterionId,
            criteriaSnapshot: snapshot.criteriaSnapshot,
          }
        : { status: 'not_available' },
    },
    {
      key: 'notes',
      title: 'Notas',
      data: { notes: measurement.notes },
    },
  ];

  return {
    documentId: measurement.id,
    templateKey: 'lighting_protocol',
    templateVersion: '1.0',
    generatedAt: new Date().toISOString(),
    sections,
    disclaimer: 'Representación documental generada a partir de los datos persistidos de la medición. No sustituye la revisión profesional cuando corresponda.',
    regulatoryReferenceId: snapshot?.normativeProtocolVersionId,
  };
}
