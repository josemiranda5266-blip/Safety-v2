import { describe, it, expect, beforeEach } from "vitest";
import {
  createDocument,
  listDocuments,
  getDocumentById,
  renewDocumentVersion,
  updateDocumentMetadata,
  softDeleteDocument,
  restoreDocument,
  getDocumentDashboardMetrics,
  getDocumentCalendarEvents,
  validateDocumentUpload,
  clearDocumentStoreForTesting,
} from "../services/documentService";
import { calculateExpirationMetrics } from "../../src/utils/expirationEngine";
import { DOCUMENT_CATEGORIES, DocumentCategory } from "../../src/types/documentManagement";

describe("FASE 3 — Gestor Documental Profesional & Motor de Vencimientos", () => {
  const orgA = "org_alpha_safety";
  const orgB = "org_beta_competitor";
  const userA = "usr_lic_martin";
  const companyA1 = "comp_tech_inc";
  const companyA2 = "comp_logistics_sa";

  beforeEach(() => {
    clearDocumentStoreForTesting();
  });

  describe("1. Motor de Vencimientos (90, 30, 15, 7 días y vencido)", () => {
    it("debe clasificar correctamente documento vencido (< 0 días)", () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const metrics = calculateExpirationMetrics(pastDate);

      expect(metrics.alertLevel).toBe("expired");
      expect(metrics.suggestedStatus).toBe("vencido");
      expect(metrics.daysUntilExpiration).toBeLessThan(0);
    });

    it("debe clasificar correctamente alerta crítica ≤ 7 días", () => {
      const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const metrics = calculateExpirationMetrics(in5Days);

      expect(metrics.alertLevel).toBe("critical_7d");
      expect(metrics.suggestedStatus).toBe("por_vencer");
      expect(metrics.daysUntilExpiration).toBeGreaterThanOrEqual(1);
      expect(metrics.daysUntilExpiration).toBeLessThanOrEqual(7);
    });

    it("debe clasificar correctamente alerta urgente ≤ 15 días", () => {
      const in12Days = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const metrics = calculateExpirationMetrics(in12Days);

      expect(metrics.alertLevel).toBe("urgent_15d");
      expect(metrics.suggestedStatus).toBe("por_vencer");
      expect(metrics.daysUntilExpiration).toBeGreaterThan(7);
      expect(metrics.daysUntilExpiration).toBeLessThanOrEqual(15);
    });

    it("debe clasificar correctamente advertencia ≤ 30 días", () => {
      const in25Days = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const metrics = calculateExpirationMetrics(in25Days);

      expect(metrics.alertLevel).toBe("warning_30d");
      expect(metrics.suggestedStatus).toBe("por_vencer");
      expect(metrics.daysUntilExpiration).toBeGreaterThan(15);
      expect(metrics.daysUntilExpiration).toBeLessThanOrEqual(30);
    });

    it("debe clasificar correctamente aviso ≤ 90 días", () => {
      const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const metrics = calculateExpirationMetrics(in60Days);

      expect(metrics.alertLevel).toBe("notice_90d");
      expect(metrics.suggestedStatus).toBe("por_vencer");
      expect(metrics.daysUntilExpiration).toBeGreaterThan(30);
      expect(metrics.daysUntilExpiration).toBeLessThanOrEqual(90);
    });

    it("debe clasificar correctamente documento vigente > 90 días", () => {
      const in180Days = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const metrics = calculateExpirationMetrics(in180Days);

      expect(metrics.alertLevel).toBe("valid");
      expect(metrics.suggestedStatus).toBe("vigente");
      expect(metrics.daysUntilExpiration).toBeGreaterThan(90);
    });

    it("debe clasificar correctamente documento permanente sin fecha de vencimiento", () => {
      const metrics = calculateExpirationMetrics(undefined);

      expect(metrics.alertLevel).toBe("no_expiry");
      expect(metrics.suggestedStatus).toBe("vigente");
      expect(metrics.daysUntilExpiration).toBeNull();
    });
  });

  describe("2. Validación de Categorías Normativas y Seguridad de Archivos", () => {
    it("debe permitir todas las 12 categorías requeridas", () => {
      expect(DOCUMENT_CATEGORIES).toHaveLength(12);
      expect(DOCUMENT_CATEGORIES).toContain("ART");
      expect(DOCUMENT_CATEGORIES).toContain("Legajo empresa");
      expect(DOCUMENT_CATEGORIES).toContain("Trabajadores");
      expect(DOCUMENT_CATEGORIES).toContain("EPP");
      expect(DOCUMENT_CATEGORIES).toContain("Capacitaciones");
      expect(DOCUMENT_CATEGORIES).toContain("Inspecciones");
      expect(DOCUMENT_CATEGORIES).toContain("Mediciones");
      expect(DOCUMENT_CATEGORIES).toContain("Procedimientos");
      expect(DOCUMENT_CATEGORIES).toContain("Informes");
      expect(DOCUMENT_CATEGORIES).toContain("Emergencias");
      expect(DOCUMENT_CATEGORIES).toContain("Matriz de riesgos");
      expect(DOCUMENT_CATEGORIES).toContain("Organismos");
    });

    it("debe rechazar categorías no autorizadas", () => {
      const dummyPdf = Buffer.from("%PDF-1.4 mock content");
      const validation = validateDocumentUpload({
        filename: "test.pdf",
        fileBase64: dummyPdf.toString("base64"),
        mimeType: "application/pdf",
        category: "Marketing Invalido",
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe("INVALID_CATEGORY");
    });

    it("debe validar magic bytes en archivos PDF y DOCX", () => {
      const fakePdf = Buffer.from("NOT_A_REAL_PDF_HEADER");
      const validation = validateDocumentUpload({
        filename: "test.pdf",
        fileBase64: fakePdf.toString("base64"),
        mimeType: "application/pdf",
        category: "ART",
      });

      expect(validation.valid).toBe(false);
      expect(validation.code).toBe("INVALID_MAGIC_BYTES");
    });
  });

  describe("3. Aislamiento Multi-Tenant y Protección BOLA/IDOR", () => {
    it("los documentos de Org A no deben ser visibles ni accesibles por Org B", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 Poliza ART Org A");
      const docA = await createDocument({
        orgId: orgA,
        uid: userA,
        filename: "poliza_art_2026.pdf",
        fileBuffer: pdfBuffer,
        mimeType: "application/pdf",
        title: "Póliza ART Anual 2026",
        category: "ART",
        scope: "company",
        companyId: companyA1,
        expirationDate: "2026-12-31",
      });

      // Tenant A can retrieve its own document
      const retrievedByA = await getDocumentById(orgA, docA.id);
      expect(retrievedByA).not.toBeNull();
      expect(retrievedByA?.id).toBe(docA.id);

      // Tenant B queries its own documents
      const docsOrgB = await listDocuments(orgB);
      expect(docsOrgB).toHaveLength(0);

      // Tenant B attempts to read Tenant A's document by direct ID
      const retrievedByB = await getDocumentById(orgB, docA.id);
      expect(retrievedByB).toBeNull();
    });

    it("debe aislar documentos por alcance de empresa (Consultores con asignación restringida)", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 Documento Empresa 2");
      const docComp2 = await createDocument({
        orgId: orgA,
        uid: userA,
        filename: "estudio_ergonomia.pdf",
        fileBuffer: pdfBuffer,
        mimeType: "application/pdf",
        title: "Estudio Ergonómico Línea 2",
        category: "Mediciones",
        scope: "company",
        companyId: companyA2,
        expirationDate: "2026-11-30",
      });

      // Consultant with access only to companyA1
      const docsForScopedConsultant = await listDocuments(orgA, {}, [companyA1]);
      expect(docsForScopedConsultant.some((d) => d.id === docComp2.id)).toBe(false);

      // Attempt direct read with unauthorized company scope
      await expect(getDocumentById(orgA, docComp2.id, false, [companyA1])).rejects.toThrow(
        /Acceso denegado/
      );
    });
  });

  describe("4. Trazabilidad de Versiones y Renovación", () => {
    it("debe registrar versión inicial v1 y archivar versiones sucesivas al renovar", async () => {
      const pdfV1 = Buffer.from("%PDF-1.4 Version 1 Certificado");
      const doc = await createDocument({
        orgId: orgA,
        uid: userA,
        filename: "certificado_caldera.pdf",
        fileBuffer: pdfV1,
        mimeType: "application/pdf",
        title: "Habilitación de Caldera",
        category: "Inspecciones",
        scope: "company",
        companyId: companyA1,
        expirationDate: "2026-06-30",
      });

      expect(doc.version).toBe(1);
      expect(doc.versionHistory).toHaveLength(1);
      expect(doc.versionHistory[0].version).toBe(1);

      // Renovación a Versión 2 con nuevo archivo y fecha extendida
      const pdfV2 = Buffer.from("%PDF-1.4 Version 2 Certificado Renovado");
      const renewedDoc = await renewDocumentVersion({
        orgId: orgA,
        documentId: doc.id,
        uid: userA,
        filename: "certificado_caldera_2027.pdf",
        fileBuffer: pdfV2,
        mimeType: "application/pdf",
        expirationDate: "2027-06-30",
        changeNotes: "Inspección hidrostática anual aprobada",
      });

      expect(renewedDoc.version).toBe(2);
      expect(renewedDoc.filename).toBe("certificado_caldera_2027.pdf");
      expect(renewedDoc.expirationDate).toBe("2027-06-30");
      expect(renewedDoc.versionHistory).toHaveLength(2);
      expect(renewedDoc.versionHistory[0].version).toBe(1);
      expect(renewedDoc.versionHistory[1].version).toBe(2);
      expect(renewedDoc.versionHistory[1].changeNotes).toBe("Inspección hidrostática anual aprobada");
    });
  });

  describe("5. Eliminación Lógica (Soft Delete) y Auditoría", () => {
    it("debe realizar baja lógica sin destruir el registro físico para trazabilidad legal", async () => {
      const pdf = Buffer.from("%PDF-1.4 Protocolo Puesta a Tierra");
      const doc = await createDocument({
        orgId: orgA,
        uid: userA,
        filename: "pat_2025.pdf",
        fileBuffer: pdf,
        mimeType: "application/pdf",
        title: "Medición PAT Anual 2025",
        category: "Mediciones",
        scope: "company",
        companyId: companyA1,
      });

      // Ejecutar baja lógica
      const softDeleted = await softDeleteDocument(orgA, doc.id, userA, "Lic. Martín");
      expect(softDeleted).toBe(true);

      // No debe aparecer en listados activos
      const activeList = await listDocuments(orgA, { includeDeleted: false });
      expect(activeList.some((d) => d.id === doc.id)).toBe(false);

      // Sí debe aparecer cuando se auditan eliminados
      const auditList = await listDocuments(orgA, { includeDeleted: true });
      const foundDeleted = auditList.find((d) => d.id === doc.id);
      expect(foundDeleted).toBeDefined();
      expect(foundDeleted?.isDeleted).toBe(true);
      expect(foundDeleted?.deletedByUid).toBe(userA);

      // Restaurar documento
      const restored = await restoreDocument(orgA, doc.id);
      expect(restored).toBe(true);

      const activeListAfterRestore = await listDocuments(orgA, { includeDeleted: false });
      expect(activeListAfterRestore.some((d) => d.id === doc.id)).toBe(true);
    });
  });

  describe("6. Dashboard de Métricas y Eventos de Calendario", () => {
    it("debe calcular métricas agrupadas por categoría y estado de vencimiento", async () => {
      const pdf = Buffer.from("%PDF-1.4 Mock");

      // 1. Vencido
      await createDocument({
        orgId: orgA,
        uid: userA,
        filename: "doc1.pdf",
        fileBuffer: pdf,
        mimeType: "application/pdf",
        title: "Doc Vencido",
        category: "ART",
        expirationDate: "2024-01-01",
      });

      // 2. Vigente
      await createDocument({
        orgId: orgA,
        uid: userA,
        filename: "doc2.pdf",
        fileBuffer: pdf,
        mimeType: "application/pdf",
        title: "Doc Vigente",
        category: "Procedimientos",
        expirationDate: "2027-12-31",
      });

      // 3. Permanente
      await createDocument({
        orgId: orgA,
        uid: userA,
        filename: "doc3.pdf",
        fileBuffer: pdf,
        mimeType: "application/pdf",
        title: "Doc Permanente",
        category: "Matriz de riesgos",
      });

      const metrics = await getDocumentDashboardMetrics(orgA);

      expect(metrics.totalDocuments).toBe(3);
      expect(metrics.expiredCount).toBe(1);
      expect(metrics.validCount).toBe(1);
      expect(metrics.noExpiryCount).toBe(1);
      expect(metrics.byCategory["ART"]).toBe(1);
      expect(metrics.byCategory["Procedimientos"]).toBe(1);
      expect(metrics.byCategory["Matriz de riesgos"]).toBe(1);
      expect(metrics.byCategory["EPP"]).toBe(0);
    });

    it("debe generar eventos de calendario para vencimientos y emisiones", async () => {
      const pdf = Buffer.from("%PDF-1.4 Mock");
      await createDocument({
        orgId: orgA,
        uid: userA,
        filename: "capacitacion.pdf",
        fileBuffer: pdf,
        mimeType: "application/pdf",
        title: "Capacitación Evacuación",
        category: "Capacitaciones",
        issueDate: "2026-08-01",
        expirationDate: "2026-08-31",
      });

      const events = await getDocumentCalendarEvents(orgA);
      expect(events.length).toBeGreaterThanOrEqual(2);

      const issueEv = events.find((e) => e.eventType === "issue");
      const expEv = events.find((e) => e.eventType === "expiration");

      expect(issueEv?.date).toBe("2026-08-01");
      expect(expEv?.date).toBe("2026-08-31");
    });
  });
});
