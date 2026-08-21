import crypto from "crypto";
import { getAdminFirestore, getAdminStorageBucket } from "../auth/firestoreAdmin";
import { DocChunk } from "../../src/types/safety";
import {
  DocumentCategory,
  DOCUMENT_CATEGORIES,
  DocumentScope,
  ProfessionalDocument,
  DocumentVersionRecord,
  DocumentDashboardMetrics,
  DocumentCalendarEvent,
  DocumentFilterOptions,
} from "../../src/types/documentManagement";
import { calculateExpirationMetrics, enrichDocumentWithExpiration } from "../../src/utils/expirationEngine";
import { getCompanyById } from "./companyService";
import { getEstablishmentById } from "./establishmentService";
import { getEmployeeById } from "./employeeService";

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
  sanitizedFilename?: string;
  fileBuffer?: Buffer;
}

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx", ".txt"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const ALLOWED_CATEGORIES = new Set<DocumentCategory>(DOCUMENT_CATEGORIES);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_CHUNKS_COUNT = 1000;
const MAX_CHUNK_TEXT_LENGTH = 10000;
const MAX_TAGS_COUNT = 20;

// In-memory document storage fallback for non-production/test environments ONLY
const memoryDocumentsStore = new Map<string, ProfessionalDocument>();
const memoryChunksStore = new Map<string, DocChunk[]>();
const memoryFilesStore = new Map<string, Buffer>();

/**
 * Sanitizes raw filenames to prevent path traversal, control characters, and directory injection.
 */
export function sanitizeFilename(rawFilename: string): string {
  if (!rawFilename || typeof rawFilename !== "string") {
    return "document.pdf";
  }

  // Strip all directory path components (both forward and backward slashes)
  let clean = rawFilename.replace(/.*[\/\\]/, "");

  // Strip leading dots to prevent hidden files or traversal attempts
  clean = clean.replace(/^\.+/, "");

  // Replace invalid / non-alphanumeric chars (except dot, underscore, dash) with underscore
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (!clean || clean.trim() === "") {
    return "document.pdf";
  }

  return clean;
}

/**
 * Comprehensive server-side validation for document upload requests.
 */
export function validateDocumentUpload(body: any): UploadValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Payload de solicitud inválido", code: "INVALID_PAYLOAD" };
  }

  const { filename, fileBase64, mimeType, chunks, tags, title, category, pageCount, summary, responsibleName, issuingOrganism, scope } = body;

  if (!filename || typeof filename !== "string" || filename.trim() === "") {
    return { valid: false, error: "El nombre de archivo (filename) es requerido", code: "MISSING_FILENAME" };
  }

  if (!fileBase64 || typeof fileBase64 !== "string" || fileBase64.trim() === "") {
    return { valid: false, error: "El contenido Base64 (fileBase64) es requerido", code: "MISSING_FILE_BASE64" };
  }

  // Base64 validation: size before decoding
  const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_SIZE_BYTES * 4 / 3) + 4;
  if (fileBase64.length > MAX_BASE64_LENGTH) {
    return { valid: false, error: "El tamaño del contenido Base64 supera el límite de 15MB", code: "FILE_TOO_LARGE" };
  }

  // Base64 format and characters validation (no internal spaces, strict format and padding)
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Regex.test(fileBase64)) {
    return { valid: false, error: "Contenido Base64 con formato o caracteres inválidos (debe tener padding correcto y sin espacios)", code: "INVALID_BASE64" };
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(fileBase64, "base64");
  } catch {
    return { valid: false, error: "Error decodificando contenido Base64", code: "INVALID_BASE64" };
  }

  // Check reversible encoding
  if (fileBuffer.toString("base64") !== fileBase64) {
    return { valid: false, error: "La decodificación Base64 no es perfectamente reversible", code: "INVALID_BASE64" };
  }

  // File size validation
  if (fileBuffer.length === 0) {
    return { valid: false, error: "El archivo cargado está vacío", code: "FILE_EMPTY" };
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "El archivo excede el tamaño máximo permitido de 15MB", code: "FILE_TOO_LARGE" };
  }

  // Filename sanitization & Extension validation
  const sanitizedFilename = sanitizeFilename(filename);
  const extMatch = sanitizedFilename.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase() : "";

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Extensión de archivo no permitida (${ext}). Tipos soportados: .pdf, .docx, .xlsx, .txt`,
      code: "INVALID_FILE_TYPE",
    };
  }

  // MIME type validation
  if (!mimeType || typeof mimeType !== "string" || mimeType.trim() === "") {
    return { valid: false, error: "El tipo MIME (mimeType) es requerido y no puede ser inferido", code: "MISSING_MIME_TYPE" };
  }

  const cleanMime = mimeType.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
    return {
      valid: false,
      error: `Tipo MIME no permitido o no soportado (${cleanMime}).`,
      code: "INVALID_MIME_TYPE",
    };
  }

  // Extension and MIME must match strictly
  let mimeMatchesExtension = false;
  if (ext === ".pdf" && cleanMime === "application/pdf") {
    mimeMatchesExtension = true;
  } else if (ext === ".docx" && cleanMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    mimeMatchesExtension = true;
  } else if (ext === ".xlsx" && cleanMime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    mimeMatchesExtension = true;
  } else if (ext === ".txt" && cleanMime === "text/plain") {
    mimeMatchesExtension = true;
  }

  if (!mimeMatchesExtension) {
    return {
      valid: false,
      error: `La extensión del archivo (${ext}) y el tipo MIME (${cleanMime}) no coinciden`,
      code: "MIME_EXTENSION_MISMATCH",
    };
  }

  // Magic Bytes Validation
  if (ext === ".pdf") {
    if (fileBuffer.length < 4 ||
        fileBuffer[0] !== 0x25 ||
        fileBuffer[1] !== 0x50 ||
        fileBuffer[2] !== 0x44 ||
        fileBuffer[3] !== 0x46) {
      return {
        valid: false,
        error: "El archivo PDF no tiene la firma de bytes mágicos correcta (%PDF)",
        code: "INVALID_MAGIC_BYTES",
      };
    }
  } else if (ext === ".docx" || ext === ".xlsx") {
    if (fileBuffer.length < 4 ||
        fileBuffer[0] !== 0x50 ||
        fileBuffer[1] !== 0x4b ||
        fileBuffer[2] !== 0x03 ||
        fileBuffer[3] !== 0x04) {
      return {
        valid: false,
        error: "El archivo no tiene la firma ZIP correcta para documentos DOCX/XLSX (PK)",
        code: "INVALID_MAGIC_BYTES",
      };
    }
  }

  // Category validation
  if (category !== undefined) {
    if (typeof category !== "string" || !ALLOWED_CATEGORIES.has(category as DocumentCategory)) {
      return {
        valid: false,
        error: `Categoría inválida (${category}). Las categorías requeridas son: ${DOCUMENT_CATEGORIES.join(", ")}`,
        code: "INVALID_CATEGORY",
      };
    }
  }

  // Scope validation
  if (scope !== undefined) {
    const validScopes: DocumentScope[] = ['company', 'establishment', 'employee', 'organization'];
    if (!validScopes.includes(scope)) {
      return {
        valid: false,
        error: `Alcance (scope) inválido. Debe ser: company, establishment, employee u organization`,
        code: "INVALID_SCOPE",
      };
    }
  }

  // Metadata field length validations
  if (title && typeof title === "string" && title.length > 200) {
    return { valid: false, error: "El título no puede superar 200 caracteres", code: "FIELD_TOO_LONG" };
  }
  if (summary && typeof summary === "string" && summary.length > 1000) {
    return { valid: false, error: "El resumen no puede superar 1000 caracteres", code: "FIELD_TOO_LONG" };
  }
  if (responsibleName && typeof responsibleName === "string" && responsibleName.length > 100) {
    return { valid: false, error: "El responsable no puede superar 100 caracteres", code: "FIELD_TOO_LONG" };
  }
  if (issuingOrganism && typeof issuingOrganism === "string" && issuingOrganism.length > 100) {
    return { valid: false, error: "El organismo emisor no puede superar 100 caracteres", code: "FIELD_TOO_LONG" };
  }

  // PageCount validation
  if (pageCount !== undefined) {
    if (typeof pageCount !== "number" || !Number.isInteger(pageCount) || pageCount <= 0) {
      return { valid: false, error: "pageCount debe ser un número entero mayor a cero", code: "INVALID_PAGE_COUNT" };
    }
  }

  // Chunks validation
  if (chunks !== undefined) {
    if (!Array.isArray(chunks)) {
      return { valid: false, error: "chunks debe ser un array", code: "INVALID_CHUNKS" };
    }
    if (chunks.length > MAX_CHUNKS_COUNT) {
      return { valid: false, error: `Excede el máximo de ${MAX_CHUNKS_COUNT} chunks`, code: "TOO_MANY_CHUNKS" };
    }
    for (const chunk of chunks) {
      if (chunk.text && typeof chunk.text === "string" && chunk.text.length > MAX_CHUNK_TEXT_LENGTH) {
        return { valid: false, error: `El texto del chunk excede el máximo de ${MAX_CHUNK_TEXT_LENGTH} caracteres`, code: "CHUNK_TOO_LARGE" };
      }
    }
  }

  return {
    valid: true,
    sanitizedFilename,
    fileBuffer,
  };
}

export async function createDocument(params: {
  orgId: string;
  uid: string;
  userName?: string;
  filename: string;
  fileBuffer: Buffer;
  mimeType: string;
  title?: string;
  category: DocumentCategory;
  subCategory?: string;
  scope?: DocumentScope;
  companyId?: string;
  establishmentId?: string;
  employeeId?: string;
  documentNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  responsibleName?: string;
  issuingOrganism?: string;
  summary?: string;
  notes?: string;
  tags?: string[];
  chunks?: DocChunk[];
}): Promise<ProfessionalDocument> {
  const {
    orgId,
    uid,
    userName = "Profesional H&S",
    filename,
    fileBuffer,
    mimeType,
    title,
    category,
    subCategory,
    scope = "company",
    companyId,
    establishmentId,
    employeeId,
    documentNumber,
    issueDate = new Date().toISOString().split("T")[0],
    expirationDate,
    responsibleName = userName,
    issuingOrganism = "Organismo / ART",
    summary = "",
    notes = "",
    tags = [],
    chunks = [],
  } = params;

  const isProduction = process.env.NODE_ENV === "production";
  const sanitizedFilename = sanitizeFilename(filename);
  const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const storagePath = `organizations/${orgId}/documents/${documentId}/${sanitizedFilename}`;
  const nowIso = new Date().toISOString();

  const cleanTitle = title || sanitizedFilename.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

  // Fetch relational display names if IDs are provided
  let companyName: string | undefined;
  let establishmentName: string | undefined;
  let employeeName: string | undefined;
  let employeeCuil: string | undefined;

  if (companyId) {
    const comp = await getCompanyById(orgId, companyId);
    if (comp) companyName = comp.legalName || comp.tradeName;
  }

  if (establishmentId) {
    const est = await getEstablishmentById(orgId, establishmentId);
    if (est) {
      establishmentName = est.name;
      if (!companyId && est.companyId) {
        const comp = await getCompanyById(orgId, est.companyId);
        if (comp) companyName = comp.legalName;
      }
    }
  }

  if (employeeId) {
    const emp = await getEmployeeById(orgId, employeeId);
    if (emp) {
      employeeName = `${emp.lastName}, ${emp.firstName}`;
      employeeCuil = emp.cuil;
      if (!companyId && emp.companyId) {
        const comp = await getCompanyById(orgId, emp.companyId);
        if (comp) companyName = comp.legalName;
      }
      if (!establishmentId && emp.establishmentId) {
        const est = await getEstablishmentById(orgId, emp.establishmentId);
        if (est) establishmentName = est.name;
      }
    }
  }

  // Calculate expiration metrics
  const expirationMetrics = calculateExpirationMetrics(expirationDate);

  const initialVersion: DocumentVersionRecord = {
    version: 1,
    filename: sanitizedFilename,
    fileSize: fileBuffer.length,
    mimeType,
    storagePath,
    hash,
    uploadedAt: nowIso,
    uploadedByUid: uid,
    uploadedByName: userName,
    issueDate,
    expirationDate,
    changeNotes: "Versión inicial",
  };

  const record: ProfessionalDocument = {
    id: documentId,
    orgId,
    scope,
    companyId,
    establishmentId,
    employeeId,
    companyName,
    establishmentName,
    employeeName,
    employeeCuil,
    title: cleanTitle,
    category,
    subCategory,
    documentNumber,
    issueDate,
    expirationDate,
    responsibleName,
    responsibleUid: uid,
    issuingOrganism,
    status: expirationMetrics.suggestedStatus,
    filename: sanitizedFilename,
    fileSize: fileBuffer.length,
    mimeType,
    fileType: sanitizedFilename.split(".").pop()?.toLowerCase() || "pdf",
    storagePath,
    hash,
    summary: summary || `${cleanTitle} - ${category}`,
    tags,
    notes,
    version: 1,
    versionHistory: [initialVersion],
    isDeleted: false,
    createdAt: nowIso,
    updatedAt: nowIso,
    uploadedByUid: uid,
    uploadedByName: userName,
    daysUntilExpiration: expirationMetrics.daysUntilExpiration,
    expirationAlertLevel: expirationMetrics.alertLevel,
  };

  // Sanitize chunks: MANDATORILY assign orgId and docId server-side
  const sanitizedChunks: (DocChunk & { orgId: string })[] = chunks.map((chunk, idx) => ({
    id: `chunk_${documentId}_${idx + 1}`,
    docId: documentId,
    orgId: orgId,
    text: String(chunk.text || "").substring(0, MAX_CHUNK_TEXT_LENGTH),
    docTitle: String(chunk.docTitle || cleanTitle).substring(0, 200),
    category: (chunk.category || category) as any,
    pageNumber: typeof chunk.pageNumber === "number" ? chunk.pageNumber : 1,
    chapter: chunk.chapter ? String(chunk.chapter).substring(0, 100) : undefined,
    section: chunk.section ? String(chunk.section).substring(0, 100) : undefined,
    article: chunk.article ? String(chunk.article).substring(0, 100) : undefined,
    tags: Array.isArray(chunk.tags)
      ? chunk.tags.filter((t) => typeof t === "string").slice(0, 10)
      : undefined,
  }));

  let storageUploadSuccess = false;
  let metadataCreatedSuccess = false;

  // 1. Upload file to Storage
  try {
    const bucket = getAdminStorageBucket();
    const file = bucket.file(storagePath);
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: { orgId, documentId, uid, version: "1" },
      },
    });
    storageUploadSuccess = true;
  } catch (storageErr: any) {
    if (isProduction) {
      console.error("[DocumentService] Error en Storage en producción:", storageErr.message);
      const infraErr: any = new Error("Error de infraestructura en servicio de almacenamiento");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  // 2. Persist metadata to Firestore
  try {
    const db = getAdminFirestore();
    const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);
    
    await docRef.set(record);
    metadataCreatedSuccess = true;

    if (sanitizedChunks.length > 0) {
      const batch = db.batch();
      sanitizedChunks.forEach((chunk) => {
        const chunkRef = docRef.collection("chunks").doc(chunk.id);
        batch.set(chunkRef, chunk);
      });
      await batch.commit();
    }
  } catch (firestoreErr: any) {
    if (metadataCreatedSuccess) {
      try {
        const db = getAdminFirestore();
        await db.collection("organizations").doc(orgId).collection("documents").doc(documentId).delete();
      } catch {}
    }

    if (storageUploadSuccess) {
      try {
        const bucket = getAdminStorageBucket();
        await bucket.file(storagePath).delete();
      } catch {}
    }

    if (isProduction) {
      console.error("[DocumentService] Error en Firestore en producción:", firestoreErr.message);
      const infraErr: any = new Error("Error de infraestructura en base de datos");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }

    // Dev/Test fallback
    memoryDocumentsStore.set(`${orgId}:${documentId}`, record);
    memoryChunksStore.set(documentId, sanitizedChunks);
    memoryFilesStore.set(storagePath, fileBuffer);
  }

  if (!storageUploadSuccess && !isProduction) {
    memoryDocumentsStore.set(`${orgId}:${documentId}`, record);
    memoryChunksStore.set(documentId, sanitizedChunks);
    memoryFilesStore.set(storagePath, fileBuffer);
  }

  return enrichDocumentWithExpiration(record);
}

export async function renewDocumentVersion(params: {
  orgId: string;
  documentId: string;
  uid: string;
  userName?: string;
  filename: string;
  fileBuffer: Buffer;
  mimeType: string;
  issueDate?: string;
  expirationDate?: string;
  changeNotes?: string;
  assignedCompanyIds?: string[];
}): Promise<ProfessionalDocument> {
  const {
    orgId,
    documentId,
    uid,
    userName = "Profesional H&S",
    filename,
    fileBuffer,
    mimeType,
    issueDate,
    expirationDate,
    changeNotes = "Renovación periódica",
    assignedCompanyIds,
  } = params;

  const existingDoc = await getDocumentById(orgId, documentId, true, assignedCompanyIds);
  if (!existingDoc) {
    const notFoundErr: any = new Error("Documento no encontrado");
    notFoundErr.status = 404;
    notFoundErr.code = "DOCUMENT_NOT_FOUND";
    throw notFoundErr;
  }

  const nextVersion = (existingDoc.version || 1) + 1;
  const sanitizedFilename = sanitizeFilename(filename);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const storagePath = `organizations/${orgId}/documents/${documentId}/v${nextVersion}_${sanitizedFilename}`;
  const nowIso = new Date().toISOString();

  // Upload new version to Storage
  try {
    const bucket = getAdminStorageBucket();
    const file = bucket.file(storagePath);
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: { orgId, documentId, uid, version: String(nextVersion) },
      },
    });
  } catch (e: any) {
    if (process.env.NODE_ENV === "production") {
      const infraErr: any = new Error("Error de almacenamiento al renovar archivo");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  const newVersionRecord: DocumentVersionRecord = {
    version: nextVersion,
    filename: sanitizedFilename,
    fileSize: fileBuffer.length,
    mimeType,
    storagePath,
    hash,
    uploadedAt: nowIso,
    uploadedByUid: uid,
    uploadedByName: userName,
    issueDate: issueDate || existingDoc.issueDate,
    expirationDate: expirationDate || existingDoc.expirationDate,
    changeNotes,
  };

  const updatedHistory = [...(existingDoc.versionHistory || []), newVersionRecord];
  const finalIssueDate = issueDate || existingDoc.issueDate;
  const finalExpirationDate = expirationDate !== undefined ? expirationDate : existingDoc.expirationDate;

  const expirationMetrics = calculateExpirationMetrics(finalExpirationDate);

  const updatedDoc: ProfessionalDocument = {
    ...existingDoc,
    version: nextVersion,
    filename: sanitizedFilename,
    fileSize: fileBuffer.length,
    mimeType,
    fileType: sanitizedFilename.split(".").pop()?.toLowerCase() || "pdf",
    storagePath,
    hash,
    issueDate: finalIssueDate,
    expirationDate: finalExpirationDate,
    status: expirationMetrics.suggestedStatus,
    versionHistory: updatedHistory,
    updatedAt: nowIso,
    daysUntilExpiration: expirationMetrics.daysUntilExpiration,
    expirationAlertLevel: expirationMetrics.alertLevel,
  };

  try {
    const db = getAdminFirestore();
    await db
      .collection("organizations")
      .doc(orgId)
      .collection("documents")
      .doc(documentId)
      .set(updatedDoc, { merge: true });
  } catch (e: any) {
    if (process.env.NODE_ENV === "production") {
      const infraErr: any = new Error("Error en base de datos al renovar documento");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  memoryDocumentsStore.set(`${orgId}:${documentId}`, updatedDoc);
  memoryFilesStore.set(storagePath, fileBuffer);

  return enrichDocumentWithExpiration(updatedDoc);
}

export async function updateDocumentMetadata(
  orgId: string,
  documentId: string,
  updates: Partial<Pick<ProfessionalDocument, 'title' | 'category' | 'subCategory' | 'documentNumber' | 'issueDate' | 'expirationDate' | 'responsibleName' | 'issuingOrganism' | 'status' | 'notes' | 'tags' | 'summary'>>,
  assignedCompanyIds?: string[]
): Promise<ProfessionalDocument> {
  const existingDoc = await getDocumentById(orgId, documentId, true, assignedCompanyIds);
  if (!existingDoc) {
    const notFoundErr: any = new Error("Documento no encontrado");
    notFoundErr.status = 404;
    notFoundErr.code = "DOCUMENT_NOT_FOUND";
    throw notFoundErr;
  }

  const nowIso = new Date().toISOString();
  const merged: ProfessionalDocument = {
    ...existingDoc,
    ...updates,
    updatedAt: nowIso,
  };

  // Recalculate expiration if expirationDate changed
  const expMetrics = calculateExpirationMetrics(merged.expirationDate);
  merged.daysUntilExpiration = expMetrics.daysUntilExpiration;
  merged.expirationAlertLevel = expMetrics.alertLevel;
  if (!updates.status) {
    merged.status = expMetrics.suggestedStatus;
  }

  try {
    const db = getAdminFirestore();
    await db
      .collection("organizations")
      .doc(orgId)
      .collection("documents")
      .doc(documentId)
      .set(merged, { merge: true });
  } catch (e: any) {
    if (process.env.NODE_ENV === "production") {
      const infraErr: any = new Error("Error en base de datos al actualizar documento");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  memoryDocumentsStore.set(`${orgId}:${documentId}`, merged);
  return enrichDocumentWithExpiration(merged);
}

export async function listDocuments(
  orgId: string,
  options: DocumentFilterOptions = {},
  assignedCompanyIds?: string[]
): Promise<ProfessionalDocument[]> {
  const isProduction = process.env.NODE_ENV === "production";
  let docs: ProfessionalDocument[] = [];

  try {
    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db.collection("organizations").doc(orgId).collection("documents");

    if (!options.includeDeleted) {
      query = query.where("isDeleted", "==", false);
    }

    const snapshot = await query.get();
    docs = snapshot.docs.map((d) => d.data() as ProfessionalDocument);
  } catch (e: any) {
    if (isProduction) {
      const infraErr: any = new Error("Error al consultar documentos");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }

    memoryDocumentsStore.forEach((value, key) => {
      if (key.startsWith(`${orgId}:`)) {
        if (options.includeDeleted || !value.isDeleted) {
          docs.push(value);
        }
      }
    });
  }

  // Apply Expiration Engine enrichment to all docs
  let enriched = docs.map((doc) => enrichDocumentWithExpiration(doc));

  // Scoped consultant filtering (BOLA / IDOR protection)
  if (assignedCompanyIds !== undefined) {
    if (assignedCompanyIds.length === 0) {
      return [];
    }
    const allowed = new Set(assignedCompanyIds);
    enriched = enriched.filter((d) => {
      // If doc is company-specific, companyId must be in allowed list
      if (d.companyId) {
        return allowed.has(d.companyId);
      }
      // If org-wide without specific company, restricted users shouldn't see it
      return false;
    });
  }

  // Filter by options
  if (options.scope && options.scope !== 'all') {
    enriched = enriched.filter((d) => d.scope === options.scope);
  }

  if (options.companyId) {
    enriched = enriched.filter((d) => d.companyId === options.companyId);
  }

  if (options.establishmentId) {
    enriched = enriched.filter((d) => d.establishmentId === options.establishmentId);
  }

  if (options.employeeId) {
    enriched = enriched.filter((d) => d.employeeId === options.employeeId);
  }

  if (options.category && options.category !== 'all') {
    enriched = enriched.filter((d) => d.category === options.category);
  }

  if (options.status && options.status !== 'all') {
    enriched = enriched.filter((d) => d.status === options.status);
  }

  if (options.alertLevel && options.alertLevel !== 'all') {
    enriched = enriched.filter((d) => d.expirationAlertLevel === options.alertLevel);
  }

  if (options.searchQuery && options.searchQuery.trim() !== '') {
    const q = options.searchQuery.toLowerCase().trim();
    enriched = enriched.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.filename.toLowerCase().includes(q) ||
      (d.documentNumber && d.documentNumber.toLowerCase().includes(q)) ||
      (d.responsibleName && d.responsibleName.toLowerCase().includes(q)) ||
      (d.issuingOrganism && d.issuingOrganism.toLowerCase().includes(q)) ||
      (d.employeeName && d.employeeName.toLowerCase().includes(q)) ||
      (d.companyName && d.companyName.toLowerCase().includes(q)) ||
      (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  // Sort by expiration urgency (expired & critical first, then creation date desc)
  enriched.sort((a, b) => {
    if (a.daysUntilExpiration !== null && a.daysUntilExpiration !== undefined &&
        b.daysUntilExpiration !== null && b.daysUntilExpiration !== undefined) {
      return a.daysUntilExpiration - b.daysUntilExpiration;
    }
    if (a.daysUntilExpiration !== null && a.daysUntilExpiration !== undefined) return -1;
    if (b.daysUntilExpiration !== null && b.daysUntilExpiration !== undefined) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return enriched;
}

export async function getDocumentById(
  orgId: string,
  documentId: string,
  includeDeleted = false,
  assignedCompanyIds?: string[]
): Promise<ProfessionalDocument | null> {
  const isProduction = process.env.NODE_ENV === "production";
  let docRecord: ProfessionalDocument | null = null;

  try {
    const db = getAdminFirestore();
    const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);
    const snap = await docRef.get();
    if (snap.exists) {
      docRecord = snap.data() as ProfessionalDocument; 
    }
  } catch (e: any) {
    if (isProduction) {
      const infraErr: any = new Error("Error de infraestructura al obtener documento");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  if (!docRecord) {
    const mem = memoryDocumentsStore.get(`${orgId}:${documentId}`);
    if (mem) docRecord = mem;
  }

  if (!docRecord) return null;

  if (!includeDeleted && docRecord.isDeleted) {
    return null;
  }

  // Scoped consultant check (BOLA)
  if (assignedCompanyIds !== undefined) {
    if (assignedCompanyIds.length === 0) {
      const accessErr: any = new Error("Acceso denegado: no tiene empresas asignadas");
      accessErr.status = 403;
      accessErr.code = "FORBIDDEN_NO_COMPANIES";
      throw accessErr;
    }
    if (docRecord.companyId && !assignedCompanyIds.includes(docRecord.companyId)) {
      const accessErr: any = new Error("Acceso denegado: documento fuera del alcance de empresa asignada");
      accessErr.status = 403;
      accessErr.code = "FORBIDDEN_COMPANY_SCOPE";
      throw accessErr;
    }
    if (!docRecord.companyId) {
      // If doc has no companyId but user is restricted to specific companies, they shouldn't access org-wide docs.
      const accessErr: any = new Error("Acceso denegado: documento org-wide no accesible por consultor restringido");
      accessErr.status = 403;
      accessErr.code = "FORBIDDEN_COMPANY_SCOPE";
      throw accessErr;
    }
  }

  return enrichDocumentWithExpiration(docRecord);
}

/**
 * Soft-delete (Eliminación lógica) for legal preservation & audit compliance.
 */
export async function softDeleteDocument(
  orgId: string,
  documentId: string,
  uid: string,
  userName = "Profesional H&S",
  assignedCompanyIds?: string[]
): Promise<boolean> {
  const existingDoc = await getDocumentById(orgId, documentId, false, assignedCompanyIds);
  if (!existingDoc) {
    return false;
  }

  const nowIso = new Date().toISOString();
  const updatedDoc: ProfessionalDocument = {
    ...existingDoc,
    isDeleted: true,
    deletedAt: nowIso,
    deletedByUid: uid,
    deletedByName: userName,
    updatedAt: nowIso,
  };

  try {
    const db = getAdminFirestore();
    await db
      .collection("organizations")
      .doc(orgId)
      .collection("documents")
      .doc(documentId)
      .set(updatedDoc, { merge: true });
  } catch (e: any) {
    if (process.env.NODE_ENV === "production") {
      const infraErr: any = new Error("Error en base de datos al realizar baja lógica");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  memoryDocumentsStore.set(`${orgId}:${documentId}`, updatedDoc);
  return true;
}

export async function restoreDocument(
  orgId: string,
  documentId: string,
  assignedCompanyIds?: string[]
): Promise<boolean> {
  const existingDoc = await getDocumentById(orgId, documentId, true, assignedCompanyIds);
  if (!existingDoc) {
    return false;
  }

  const nowIso = new Date().toISOString();
  const updatedDoc: ProfessionalDocument = {
    ...existingDoc,
    isDeleted: false,
    deletedAt: undefined,
    deletedByUid: undefined,
    deletedByName: undefined,
    updatedAt: nowIso,
  };

  try {
    const db = getAdminFirestore();
    await db
      .collection("organizations")
      .doc(orgId)
      .collection("documents")
      .doc(documentId)
      .set(updatedDoc, { merge: true });
  } catch (e: any) {
    if (process.env.NODE_ENV === "production") {
      const infraErr: any = new Error("Error al restaurar documento");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  memoryDocumentsStore.set(`${orgId}:${documentId}`, updatedDoc);
  return true;
}

/**
 * Hard delete (permanent removal) if strictly necessary.
 */
export async function hardDeleteDocument(
  orgId: string,
  documentId: string,
  assignedCompanyIds?: string[]
): Promise<boolean> {
  const existingDoc = await getDocumentById(orgId, documentId, true, assignedCompanyIds);
  if (!existingDoc) {
    return false;
  }

  try {
    const bucket = getAdminStorageBucket();
    await bucket.file(existingDoc.storagePath).delete();
  } catch (e: any) {}

  try {
    const db = getAdminFirestore();
    const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);
    const chunksSnap = await docRef.collection("chunks").get();
    if (!chunksSnap.empty) {
      const batch = db.batch();
      chunksSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    await docRef.delete();
  } catch (e: any) {}

  const key = `${orgId}:${documentId}`;
  memoryDocumentsStore.delete(key);
  memoryChunksStore.delete(documentId);
  memoryFilesStore.delete(existingDoc.storagePath);

  return true;
}

/**
 * Aggregates complete dashboard metrics and expiration breakdown.
 */
export async function getDocumentDashboardMetrics(
  orgId: string,
  assignedCompanyIds?: string[]
): Promise<DocumentDashboardMetrics> {
  const docs = await listDocuments(orgId, { includeDeleted: false }, assignedCompanyIds);

  const initialByCategory: Record<DocumentCategory, number> = {
    'ART': 0,
    'Legajo empresa': 0,
    'Trabajadores': 0,
    'EPP': 0,
    'Capacitaciones': 0,
    'Inspecciones': 0,
    'Mediciones': 0,
    'Procedimientos': 0,
    'Informes': 0,
    'Emergencias': 0,
    'Matriz de riesgos': 0,
    'Organismos': 0,
  };

  const metrics: DocumentDashboardMetrics = {
    totalDocuments: docs.length,
    activeDocuments: docs.length,
    expiredCount: 0,
    critical7dCount: 0,
    urgent15dCount: 0,
    warning30dCount: 0,
    notice90dCount: 0,
    validCount: 0,
    noExpiryCount: 0,
    byCategory: initialByCategory,
    byScope: {
      company: 0,
      establishment: 0,
      employee: 0,
      organization: 0,
    },
    byCompany: [],
  };

  const companyMap = new Map<string, { companyId: string; companyName: string; total: number; expired: number; expiringSoon: number }>();

  for (const doc of docs) {
    // Categories
    if (metrics.byCategory[doc.category] !== undefined) {
      metrics.byCategory[doc.category]++;
    }

    // Scopes
    if (doc.scope && metrics.byScope[doc.scope] !== undefined) {
      metrics.byScope[doc.scope]++;
    }

    // Expiration brackets
    switch (doc.expirationAlertLevel) {
      case 'expired':
        metrics.expiredCount++;
        break;
      case 'critical_7d':
        metrics.critical7dCount++;
        break;
      case 'urgent_15d':
        metrics.urgent15dCount++;
        break;
      case 'warning_30d':
        metrics.warning30dCount++;
        break;
      case 'notice_90d':
        metrics.notice90dCount++;
        break;
      case 'valid':
        metrics.validCount++;
        break;
      case 'no_expiry':
      default:
        metrics.noExpiryCount++;
        break;
    }

    // By company
    if (doc.companyId) {
      let cEntry = companyMap.get(doc.companyId);
      if (!cEntry) {
        cEntry = {
          companyId: doc.companyId,
          companyName: doc.companyName || "Empresa",
          total: 0,
          expired: 0,
          expiringSoon: 0,
        };
        companyMap.set(doc.companyId, cEntry);
      }
      cEntry.total++;
      if (doc.expirationAlertLevel === 'expired') {
        cEntry.expired++;
      } else if (
        doc.expirationAlertLevel === 'critical_7d' ||
        doc.expirationAlertLevel === 'urgent_15d' ||
        doc.expirationAlertLevel === 'warning_30d'
      ) {
        cEntry.expiringSoon++;
      }
    }
  }

  metrics.byCompany = Array.from(companyMap.values());
  return metrics;
}

/**
 * Generates calendar events for document expirations, issuances, and renewals.
 */
export async function getDocumentCalendarEvents(
  orgId: string,
  assignedCompanyIds?: string[]
): Promise<DocumentCalendarEvent[]> {
  const docs = await listDocuments(orgId, { includeDeleted: false }, assignedCompanyIds);
  const events: DocumentCalendarEvent[] = [];

  for (const doc of docs) {
    // Expiration event
    if (doc.expirationDate) {
      events.push({
        id: `cal_exp_${doc.id}`,
        documentId: doc.id,
        title: `Vto: ${doc.title}`,
        date: doc.expirationDate.split("T")[0],
        eventType: 'expiration',
        category: doc.category,
        scope: doc.scope,
        companyName: doc.companyName,
        establishmentName: doc.establishmentName,
        employeeName: doc.employeeName,
        alertLevel: doc.expirationAlertLevel || 'valid',
        responsibleName: doc.responsibleName,
      });
    }

    // Issue event
    if (doc.issueDate) {
      events.push({
        id: `cal_iss_${doc.id}`,
        documentId: doc.id,
        title: `Emisión: ${doc.title}`,
        date: doc.issueDate.split("T")[0],
        eventType: 'issue',
        category: doc.category,
        scope: doc.scope,
        companyName: doc.companyName,
        establishmentName: doc.establishmentName,
        employeeName: doc.employeeName,
        alertLevel: 'no_expiry',
        responsibleName: doc.responsibleName,
      });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

export async function getDocumentChunks(
  orgId: string,
  documentId: string,
  assignedCompanyIds?: string[]
): Promise<DocChunk[]> {
  const isProduction = process.env.NODE_ENV === "production";

  // Enforce company isolation before returning chunks
  const existingDoc = await getDocumentById(orgId, documentId, true, assignedCompanyIds);
  if (!existingDoc) {
    return []; // Return empty chunks if the document is not accessible or doesn't exist
  }

  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection("organizations")
      .doc(orgId)
      .collection("documents")
      .doc(documentId)
      .collection("chunks")
      .get();
    return snapshot.docs.map((doc) => doc.data() as DocChunk);
  } catch (e: any) {
    if (isProduction) {
      const infraErr: any = new Error("Error al obtener fragmentos");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  return memoryChunksStore.get(documentId) || [];
}

export async function getDocumentFileBuffer(
  orgId: string,
  documentId: string,
  versionNumber?: number,
  assignedCompanyIds?: string[]
): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
  const isProduction = process.env.NODE_ENV === "production";

  const docRecord = await getDocumentById(orgId, documentId, true, assignedCompanyIds);
  if (!docRecord) {
    return null;
  }

  let targetStoragePath = docRecord.storagePath;
  let targetMimeType = docRecord.mimeType;
  let targetFilename = docRecord.filename;

  // Specific version download
  if (versionNumber && versionNumber !== docRecord.version && docRecord.versionHistory) {
    const histVer = docRecord.versionHistory.find((v) => v.version === versionNumber);
    if (histVer) {
      targetStoragePath = histVer.storagePath;
      targetMimeType = histVer.mimeType;
      targetFilename = histVer.filename;
    }
  }

  try {
    const bucket = getAdminStorageBucket();
    const file = bucket.file(targetStoragePath);
    const [buffer] = await file.download();
    return {
      buffer,
      mimeType: targetMimeType,
      filename: targetFilename,
    };
  } catch (e: any) {
    if (isProduction) {
      const infraErr: any = new Error("Error de infraestructura al descargar archivo");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  const memBuffer = memoryFilesStore.get(targetStoragePath);
  if (memBuffer) {
    return {
      buffer: memBuffer,
      mimeType: targetMimeType,
      filename: targetFilename,
    };
  }

  return null;
}

export function clearDocumentStoreForTesting(): void {
  memoryDocumentsStore.clear();
  memoryChunksStore.clear();
  memoryFilesStore.clear();
}
