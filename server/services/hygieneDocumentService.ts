import { getAdminFirestore } from "../auth/firestoreAdmin";
import * as hygieneService from "./hygieneService";
import { LIGHTING_DOCUMENT_TEMPLATE } from "../../src/config/hygieneDocumentTemplates";
import type { HygieneDocumentRepresentation } from "../../src/types/hygieneDocument";

export type HygieneGeneratedDocumentStatus = "generated" | "superseded" | "archived";
export interface HygieneGeneratedDocument { id: string; orgId: string; measurementId: string; protocolType: string; templateKey: string; templateVersion: string; status: HygieneGeneratedDocumentStatus; generatedBy: string; generatedAt: string; measurementSnapshot: { id: string; context: hygieneService.HygieneMeasurementRecord["context"]; protocolType: string; measurementDate: string; instrumentIds: string[]; instrumentSnapshots?: hygieneService.HygieneInstrumentSnapshot[]; rawData?: Record<string, unknown>; notes?: string | null; normativeEvaluationSnapshot?: hygieneService.HygieneMeasurementRecord["normativeEvaluationSnapshot"]; review?: hygieneService.HygieneMeasurementRecord["review"]; status: hygieneService.HygieneMeasurementStatus; validatedAt?: string; }; }
const collection = "hygieneGeneratedDocuments";
const newId = () => `hgd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export async function createGeneratedDocument(input: { measurement: hygieneService.HygieneMeasurementRecord; generatedBy: string; templateKey: string; templateVersion: string; }): Promise<HygieneGeneratedDocument> {
  if (input.measurement.status !== "validated") throw new Error("MEASUREMENT_NOT_VALIDATED");
  if (!input.measurement.normativeEvaluationSnapshot) throw new Error("NORMATIVE_SNAPSHOT_REQUIRED");
  const now = new Date().toISOString();
  let instrumentSnapshots = input.measurement.instrumentSnapshots;
  if (!instrumentSnapshots?.length) {
    const capturedAt = now;
    instrumentSnapshots = [];
    for (const instrumentId of input.measurement.instrumentIds) {
      const instrument = await hygieneService.getInstrumentById(instrumentId, input.measurement.orgId);
      if (!instrument) throw new Error(`INSTRUMENT_NOT_FOUND:${instrumentId}`);
      instrumentSnapshots.push({ id: instrument.id, category: instrument.category, instrumentType: instrument.instrumentType, brand: instrument.brand, model: instrument.model, serialNumber: instrument.serialNumber, calibrationDate: instrument.calibrationDate ?? null, calibrationExpiry: instrument.calibrationExpiry ?? null, certificateUrl: instrument.certificateUrl ?? null, capturedAt });
    }
  }
  const document: HygieneGeneratedDocument = { id: newId(), orgId: input.measurement.orgId, measurementId: input.measurement.id, protocolType: input.measurement.protocolType, templateKey: input.templateKey, templateVersion: input.templateVersion, status: "generated", generatedBy: input.generatedBy, generatedAt: now, measurementSnapshot: { id: input.measurement.id, context: { ...input.measurement.context }, protocolType: input.measurement.protocolType, measurementDate: input.measurement.measurementDate, instrumentIds: [...input.measurement.instrumentIds], instrumentSnapshots: JSON.parse(JSON.stringify(instrumentSnapshots)), rawData: input.measurement.rawData ? JSON.parse(JSON.stringify(input.measurement.rawData)) : undefined, notes: input.measurement.notes ?? null, normativeEvaluationSnapshot: JSON.parse(JSON.stringify(input.measurement.normativeEvaluationSnapshot)), review: input.measurement.review ? { ...input.measurement.review } : undefined, status: input.measurement.status, validatedAt: input.measurement.review?.reviewedAt } };
  await getAdminFirestore().collection(collection).doc(document.id).set(document); return document;
}
export async function getGeneratedDocumentById(id: string, orgId: string): Promise<HygieneGeneratedDocument | null> { const snapshot = await getAdminFirestore().collection(collection).doc(id).get(); if (!snapshot.exists) return null; const document = { id: snapshot.id, ...snapshot.data() } as HygieneGeneratedDocument; return document.orgId === orgId ? document : null; }
export async function listGeneratedDocuments(orgId: string, measurementId?: string): Promise<HygieneGeneratedDocument[]> { let query = getAdminFirestore().collection(collection).where("orgId", "==", orgId); if (measurementId) query = query.where("measurementId", "==", measurementId); const snapshot = await query.get(); return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HygieneGeneratedDocument)); }

export function buildLightingDocumentRepresentation(document: HygieneGeneratedDocument): HygieneDocumentRepresentation {
  if (document.protocolType !== "lighting") throw new Error("DOCUMENT_PROTOCOL_NOT_LIGHTING");
  if (document.templateKey !== LIGHTING_DOCUMENT_TEMPLATE.key || document.templateVersion !== LIGHTING_DOCUMENT_TEMPLATE.version) throw new Error("DOCUMENT_TEMPLATE_NOT_SUPPORTED");
  const snapshot = document.measurementSnapshot;
  const normative = snapshot.normativeEvaluationSnapshot;
  if (!normative) throw new Error("NORMATIVE_SNAPSHOT_REQUIRED");
  const regulatoryReference = normative.reference;
  if (!regulatoryReference) throw new Error("REGULATORY_REFERENCE_SNAPSHOT_REQUIRED");
  const context = snapshot.context as unknown as Record<string, unknown>;
  const raw = snapshot.rawData ?? {};
  const lighting = (raw.lighting ?? raw) as Record<string, unknown>;
  const points = Array.isArray(lighting.points) ? lighting.points : [];
  const review = snapshot.review as unknown as Record<string, unknown> | undefined;
  const sections = [
    { key: "identification", title: "Identificación documental", data: { measurementId: snapshot.id, protocolType: snapshot.protocolType, measurementDate: snapshot.measurementDate } },
    { key: "context", title: "Empresa y contexto de la medición", data: context },
    { key: "technical", title: "Condiciones de la medición", data: { sourceType: lighting.sourceType, lightingSystem: lighting.lightingSystem, taskDescription: lighting.taskDescription, campaign: lighting.campaign } },
    { key: "measurement_points", title: "Puntos de medición", data: { points } },
    { key: "indicators", title: "Indicadores calculados", data: { averageLux: lighting.averageLux, minimumLux: lighting.minimumLux, maximumLux: lighting.maximumLux, uniformityMinimumLux: lighting.uniformityMinimumLux, uniformityThresholdLux: lighting.uniformityThresholdLux, uniformityMinOverAverage: lighting.uniformityMinOverAverage, uniformityPasses: typeof lighting.minimumLux === "number" && typeof lighting.uniformityThresholdLux === "number" ? lighting.minimumLux >= lighting.uniformityThresholdLux : undefined, calculationVersion: lighting.calculationVersion, calculatedAt: lighting.calculatedAt } },
    { key: "instruments", title: "Instrumentación", data: { instruments: snapshot.instrumentSnapshots ?? [], instrumentIds: snapshot.instrumentIds } },
    { key: "normative", title: "Referencia normativa y evaluación", data: { reference: regulatoryReference, evaluation: normative } },
    { key: "professional_review", title: "Revisión profesional", data: review ?? {} },
    { key: "traceability", title: "Trazabilidad", data: { documentId: document.id, generatedAt: document.generatedAt, generatedBy: document.generatedBy, templateKey: document.templateKey, templateVersion: document.templateVersion } },
  ];
  return { documentId: document.id, templateKey: LIGHTING_DOCUMENT_TEMPLATE.key, templateVersion: LIGHTING_DOCUMENT_TEMPLATE.version, generatedAt: document.generatedAt, sections: LIGHTING_DOCUMENT_TEMPLATE.sectionKeys.map((key) => sections.find((section) => section.key === key)!).filter(Boolean), disclaimer: "Documento generado como apoyo técnico y documental. La interpretación, validación profesional y firma que eventualmente corresponda permanecen bajo responsabilidad del profesional competente.", regulatoryReferenceId: normative.normativeProtocolVersionId };
}
