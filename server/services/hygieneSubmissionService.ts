import { HygieneMeasurementRecord } from "./hygieneService";

export interface MeasurementSubmissionValidation {
  valid: boolean;
  errors: Array<{ code: string; message: string }>;
}

export function validateMeasurementForSubmission(measurement: HygieneMeasurementRecord): MeasurementSubmissionValidation {
  const errors: MeasurementSubmissionValidation["errors"] = [];
  if (!measurement.context?.companyId) errors.push({ code: "COMPANY_REQUIRED", message: "La empresa es obligatoria." });
  if (!measurement.context?.establishmentId) errors.push({ code: "ESTABLISHMENT_REQUIRED", message: "El establecimiento es obligatorio." });
  if (!measurement.instrumentIds?.length) errors.push({ code: "INSTRUMENT_REQUIRED", message: "Debe asociarse al menos un instrumento." });
  if (!measurement.normativeEvaluationSnapshot) errors.push({ code: "NORMATIVE_SNAPSHOT_REQUIRED", message: "Debe asociarse una versión normativa antes de enviar a revisión." });
  if (!measurement.rawData || Object.keys(measurement.rawData).length === 0) errors.push({ code: "MEASUREMENT_DATA_REQUIRED", message: "La medición no contiene datos técnicos." });

  if (measurement.protocolType === "lighting") {
    const points = (measurement.rawData as any)?.points;
    if (!Array.isArray(points) || points.length === 0) errors.push({ code: "LIGHTING_POINTS_REQUIRED", message: "Debe cargarse al menos un punto de medición de iluminación." });
  }

  return { valid: errors.length === 0, errors };
}
