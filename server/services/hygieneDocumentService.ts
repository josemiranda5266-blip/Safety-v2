import { getAdminFirestore } from "../auth/firestoreAdmin";
import * as hygieneService from "./hygieneService";

export type HygieneGeneratedDocumentStatus = "generated" | "superseded" | "archived";

export interface HygieneGeneratedDocument {
  id: string; orgId: string; measurementId: string; protocolType: string;
  templateKey: string; templateVersion: string; status: HygieneGeneratedDocumentStatus;
  generatedBy: string; generatedAt: string;
  measurementSnapshot: {
    id: string; context: hygieneService.HygieneMeasurementRecord["context"];
    protocolType: string; measurementDate: string; instrumentIds: string[];
    rawData?: Record<string, unknown>; notes?: string | null;
    normativeEvaluationSnapshot?: hygieneService.HygieneMeasurementRecord["normativeEvaluationSnapshot"];
    review?: hygieneService.HygieneMeasurementRecord["review"];
    status: hygieneService.HygieneMeasurementStatus; validatedAt?: string;
  };
}

const collection = "hygieneGeneratedDocuments";
const newId = () => `hgd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export async function createGeneratedDocument(input: {
  measurement: hygieneService.HygieneMeasurementRecord; generatedBy: string;
  templateKey: string; templateVersion: string;
}): Promise<HygieneGeneratedDocument> {
  if (input.measurement.status !== "validated") throw new Error("MEASUREMENT_NOT_VALIDATED");
  const now = new Date().toISOString();
  const review = input.measurement.review;
  const document: HygieneGeneratedDocument = {
    id: newId(), orgId: input.measurement.orgId, measurementId: input.measurement.id,
    protocolType: input.measurement.protocolType, templateKey: input.templateKey,
    templateVersion: input.templateVersion, status: "generated",
    generatedBy: input.generatedBy, generatedAt: now,
    measurementSnapshot: {
      id: input.measurement.id, context: { ...input.measurement.context },
      protocolType: input.measurement.protocolType, measurementDate: input.measurement.measurementDate,
      instrumentIds: [...input.measurement.instrumentIds],
      rawData: input.measurement.rawData ? JSON.parse(JSON.stringify(input.measurement.rawData)) : undefined,
      notes: input.measurement.notes ?? null,
      normativeEvaluationSnapshot: input.measurement.normativeEvaluationSnapshot ? JSON.parse(JSON.stringify(input.measurement.normativeEvaluationSnapshot)) : undefined,
      review: review ? { ...review } : undefined,
      status: input.measurement.status,
      validatedAt: review?.reviewedAt,
    },
  };
  await getAdminFirestore().collection(collection).doc(document.id).set(document);
  return document;
}

export async function getGeneratedDocumentById(id: string, orgId: string): Promise<HygieneGeneratedDocument | null> {
  const snapshot = await getAdminFirestore().collection(collection).doc(id).get();
  if (!snapshot.exists) return null;
  const document = { id: snapshot.id, ...snapshot.data() } as HygieneGeneratedDocument;
  return document.orgId === orgId ? document : null;
}

export async function listGeneratedDocuments(orgId: string, measurementId?: string): Promise<HygieneGeneratedDocument[]> {
  let query = getAdminFirestore().collection(collection).where("orgId", "==", orgId);
  if (measurementId) query = query.where("measurementId", "==", measurementId);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HygieneGeneratedDocument));
}

export interface LightingDocumentSection { key: string; title: string; data: Record<string, unknown>; }
export interface LightingDocumentRepresentation {
  documentId: string; templateKey: "lighting_protocol"; templateVersion: string;
  generatedAt: string; sections: LightingDocumentSection[];
  disclaimer: string;
}

export function buildLightingDocumentRepresentation(document: HygieneGeneratedDocument): LightingDocumentRepresentation {
  if (document.protocolType !== "lighting") throw new Error("DOCUMENT_PROTOCOL_NOT_LIGHTING");
  const snapshot = document.measurementSnapshot;
  const context = snapshot.context as unknown as Record<string, unknown>;
  const raw = snapshot.rawData ?? {};
  const lighting = (raw.lighting ?? raw) as Record<string, unknown>;
  const points = Array.isArray(lighting.points) ? lighting.points : [];
  const normative = snapshot.normativeEvaluationSnapshot as unknown as Record<string, unknown> | undefined;
  const review = snapshot.review as unknown as Record<string, unknown> | undefined;
  return {
    documentId: document.id,
    templateKey: "lighting_protocol",
    templateVersion: document.templateVersion,
    generatedAt: document.generatedAt,
    sections: [
      { key: "identification", title: "Identificación documental", data: { measurementId: snapshot.id, protocolType: snapshot.protocolType, measurementDate: snapshot.measurementDate } },
      { key: "context", title: "Empresa y contexto de la medición", data: context },
      { key: "technical", title: "Condiciones de la medición", data: { sourceType: lighting.sourceType, lightingSystem: lighting.lightingSystem, taskDescription: lighting.taskDescription } },
      { key: "measurement_points", title: "Puntos de medición", data: { points } },
      { key: "indicators", title: "Indicadores calculados", data: { averageLux: lighting.averageLux, minimumLux: lighting.minimumLux, maximumLux: lighting.maximumLux, uniformityRatio: lighting.uniformityRatio, calculationVersion: lighting.calculationVersion, calculatedAt: lighting.calculatedAt } },
      { key: "instruments", title: "Instrumentación", data: { instrumentIds: snapshot.instrumentIds } },
      { key: "normative", title: "Referencia normativa y evaluación", data: normative ?? {} },
      { key: "professional_review", title: "Revisión profesional", data: review ?? {} },
      { key: "traceability", title: "Trazabilidad", data: { documentId: document.id, generatedAt: document.generatedAt, generatedBy: document.generatedBy, templateKey: document.templateKey, templateVersion: document.templateVersion } },
    ],
    disclaimer: "Documento generado como apoyo técnico y documental. La interpretación, validación profesional y firma que eventualmente corresponda permanecen bajo responsabilidad del profesional competente.",
  };
}