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

export async function listGeneratedDocuments(orgId: string, measurementId?: string): Promise<HygieneGeneratedDocument[]> {
  let query = getAdminFirestore().collection(collection).where("orgId", "==", orgId);
  if (measurementId) query = query.where("measurementId", "==", measurementId);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HygieneGeneratedDocument));
}