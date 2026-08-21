import crypto from "crypto";
import { getAdminFirestore, getAdminStorageBucket } from "../auth/firestoreAdmin";
import { DocChunk, CategoryType } from "../../src/types/safety";

export interface StoredDocumentRecord {
  id: string;
  orgId: string;
  uid: string;
  filename: string;
  title: string;
  category: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  hash: string;
  createdAt: string;
  uploadDate: string;
  documentDate?: string;
  pageCount: number;
  chunksCount: number;
  summary: string;
  author?: string;
  issuingOrganism?: string;
  tags?: string[];
  status: string;
  version: number;
  processingState: string;
}

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
  "application/octet-stream",
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_CHUNKS_COUNT = 1000;
const MAX_CHUNK_TEXT_LENGTH = 10000;
const MAX_TAGS_COUNT = 20;

// In-memory document storage fallback for non-production/test environments ONLY
const memoryDocumentsStore = new Map<string, StoredDocumentRecord>();
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

  const { filename, fileBase64, mimeType, chunks, tags, title, category, summary, author, issuingOrganism } = body;

  if (!filename || typeof filename !== "string" || filename.trim() === "") {
    return { valid: false, error: "El nombre de archivo (filename) es requerido", code: "MISSING_FILENAME" };
  }

  if (!fileBase64 || typeof fileBase64 !== "string" || fileBase64.trim() === "") {
    return { valid: false, error: "El contenido Base64 (fileBase64) es requerido", code: "MISSING_FILE_BASE64" };
  }

  // Base64 format validation
  const cleanBase64 = fileBase64.replace(/\s/g, "");
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(cleanBase64)) {
    return { valid: false, error: "Contenido Base64 con formato inválido", code: "INVALID_BASE64" };
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(cleanBase64, "base64");
  } catch {
    return { valid: false, error: "Error decodificando contenido Base64", code: "INVALID_BASE64" };
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
  const cleanMime = (mimeType || "").toLowerCase().trim();
  if (cleanMime && !ALLOWED_MIME_TYPES.has(cleanMime)) {
    return {
      valid: false,
      error: `Tipo MIME no permitido (${cleanMime})`,
      code: "INVALID_MIME_TYPE",
    };
  }

  // Metadata field length validations
  if (title && typeof title === "string" && title.length > 200) {
    return { valid: false, error: "El título no puede superar 200 caracteres", code: "FIELD_TOO_LONG" };
  }
  if (category && typeof category === "string" && category.length > 50) {
    return { valid: false, error: "La categoría no puede superar 50 caracteres", code: "FIELD_TOO_LONG" };
  }
  if (summary && typeof summary === "string" && summary.length > 1000) {
    return { valid: false, error: "El resumen no puede superar 1000 caracteres", code: "FIELD_TOO_LONG" };
  }
  if (author && typeof author === "string" && author.length > 100) {
    return { valid: false, error: "El autor no puede superar 100 caracteres", code: "FIELD_TOO_LONG" };
  }
  if (issuingOrganism && typeof issuingOrganism === "string" && issuingOrganism.length > 100) {
    return { valid: false, error: "El organismo emisor no puede superar 100 caracteres", code: "FIELD_TOO_LONG" };
  }

  // Tags validation
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      return { valid: false, error: "El campo tags debe ser una lista", code: "INVALID_TAGS" };
    }
    if (tags.length > MAX_TAGS_COUNT) {
      return { valid: false, error: `Se excede el máximo permitido de ${MAX_TAGS_COUNT} tags`, code: "TOO_MANY_TAGS" };
    }
    for (const tag of tags) {
      if (typeof tag !== "string" || tag.length > 50) {
        return { valid: false, error: "Cada tag debe ser un texto de máximo 50 caracteres", code: "INVALID_TAG" };
      }
    }
  }

  // Chunks validation
  if (chunks !== undefined) {
    if (!Array.isArray(chunks)) {
      return { valid: false, error: "El campo chunks debe ser una lista", code: "INVALID_CHUNKS" };
    }
    if (chunks.length > MAX_CHUNKS_COUNT) {
      return { valid: false, error: `Se excede el máximo permitido de ${MAX_CHUNKS_COUNT} chunks`, code: "TOO_MANY_CHUNKS" };
    }
    for (const chunk of chunks) {
      if (!chunk || typeof chunk !== "object") {
        return { valid: false, error: "Chunk con estructura inválida", code: "INVALID_CHUNK" };
      }
      if (chunk.text && typeof chunk.text === "string" && chunk.text.length > MAX_CHUNK_TEXT_LENGTH) {
        return {
          valid: false,
          error: `Un chunk excede el tamaño máximo permitido de ${MAX_CHUNK_TEXT_LENGTH} caracteres`,
          code: "CHUNK_TOO_LARGE",
        };
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
  filename: string;
  fileBuffer: Buffer;
  mimeType: string;
  title?: string;
  category?: string;
  pageCount?: number;
  chunks?: DocChunk[];
  summary?: string;
  author?: string;
  issuingOrganism?: string;
  tags?: string[];
}): Promise<StoredDocumentRecord> {
  const {
    orgId,
    uid,
    filename,
    fileBuffer,
    mimeType,
    title,
    category,
    pageCount = 1,
    chunks = [],
    summary = "",
    author = "Usuario",
    issuingOrganism = "Organismo Oficial",
    tags = [],
  } = params;

  const isProduction = process.env.NODE_ENV === "production";
  const sanitizedFilename = sanitizeFilename(filename);
  const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const storagePath = `organizations/${orgId}/documents/${documentId}/${sanitizedFilename}`;
  const createdAt = new Date().toISOString();

  const cleanTitle = title || sanitizedFilename.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

  const record: StoredDocumentRecord = {
    id: documentId,
    orgId,
    uid,
    filename: sanitizedFilename,
    title: cleanTitle,
    category: category || "Informe",
    fileType: sanitizedFilename.split(".").pop()?.toLowerCase() || "pdf",
    fileSize: fileBuffer.length,
    mimeType,
    storagePath,
    hash,
    createdAt,
    uploadDate: createdAt,
    pageCount,
    chunksCount: chunks.length,
    summary: summary || `${cleanTitle} - Documento subido para auditoría.`,
    author,
    issuingOrganism,
    tags,
    status: "Vigente",
    version: 1,
    processingState: "indexed",
  };

  // Sanitize chunks: MANDATORILY assign orgId and docId server-side
  const sanitizedChunks: (DocChunk & { orgId: string })[] = chunks.map((chunk, idx) => ({
    id: `chunk_${documentId}_${idx + 1}`,
    docId: documentId, // SERVER AUTHORITATIVE OVERRIDE
    orgId: orgId,      // SERVER AUTHORITATIVE OVERRIDE
    text: String(chunk.text || "").substring(0, MAX_CHUNK_TEXT_LENGTH),
    docTitle: String(chunk.docTitle || cleanTitle).substring(0, 200),
    category: ((chunk.category as CategoryType) || (category as CategoryType) || "Informe") as CategoryType,
    pageNumber: typeof chunk.pageNumber === "number" ? chunk.pageNumber : 1,
    chapter: chunk.chapter ? String(chunk.chapter).substring(0, 100) : undefined,
    section: chunk.section ? String(chunk.section).substring(0, 100) : undefined,
    article: chunk.article ? String(chunk.article).substring(0, 100) : undefined,
    tags: Array.isArray(chunk.tags)
      ? chunk.tags.filter((t) => typeof t === "string").slice(0, 10)
      : undefined,
  }));

  let storageUploadSuccess = false;

  // 1. Upload physical file to Storage
  try {
    const bucket = getAdminStorageBucket();
    const file = bucket.file(storagePath);
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: { orgId, documentId, uid },
      },
    });
    storageUploadSuccess = true;
  } catch (storageErr: any) {
    if (isProduction) {
      console.error("[DocumentService] Error crítico al guardar archivo en Storage en producción:", storageErr.message);
      const infraErr: any = new Error("Error de infraestructura en servicio de almacenamiento (Storage)");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  // 2. Persist metadata & chunks to Firestore (with Rollback compensation if Firestore fails)
  try {
    const db = getAdminFirestore();
    const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);
    await docRef.set(record);

    if (sanitizedChunks.length > 0) {
      const batch = db.batch();
      sanitizedChunks.forEach((chunk) => {
        const chunkRef = docRef.collection("chunks").doc(chunk.id);
        batch.set(chunkRef, chunk);
      });
      await batch.commit();
    }
  } catch (firestoreErr: any) {
    // Transactional Rollback: Delete file from Storage if Firestore write failed
    if (storageUploadSuccess) {
      try {
        const bucket = getAdminStorageBucket();
        await bucket.file(storagePath).delete();
      } catch {
        // Suppress secondary cleanup errors
      }
    }

    if (isProduction) {
      console.error("[DocumentService] Error crítico al persistir metadata en Firestore en producción:", firestoreErr.message);
      const infraErr: any = new Error("Error de infraestructura en servicio de base de datos (Firestore)");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }

    // Dev/Test environment fallback
    memoryDocumentsStore.set(`${orgId}:${documentId}`, record);
    memoryChunksStore.set(documentId, sanitizedChunks);
    memoryFilesStore.set(storagePath, fileBuffer);
  }

  if (!storageUploadSuccess && !isProduction) {
    memoryDocumentsStore.set(`${orgId}:${documentId}`, record);
    memoryChunksStore.set(documentId, sanitizedChunks);
    memoryFilesStore.set(storagePath, fileBuffer);
  }

  return record;
}

export async function listDocuments(orgId: string): Promise<StoredDocumentRecord[]> {
  const isProduction = process.env.NODE_ENV === "production";

  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection("organizations").doc(orgId).collection("documents").get();
    return snapshot.docs.map((doc) => doc.data() as StoredDocumentRecord);
  } catch (e: any) {
    if (isProduction) {
      console.error("[DocumentService] Error en listDocuments Firestore en producción:", e.message);
      const infraErr: any = new Error("Error de infraestructura en consulta de documentos");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  const results: StoredDocumentRecord[] = [];
  memoryDocumentsStore.forEach((value, key) => {
    if (key.startsWith(`${orgId}:`)) {
      results.push(value);
    }
  });
  return results;
}

export async function getDocumentById(orgId: string, documentId: string): Promise<StoredDocumentRecord | null> {
  const isProduction = process.env.NODE_ENV === "production";

  try {
    const db = getAdminFirestore();
    const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);
    const snap = await docRef.get();
    if (snap.exists) {
      return snap.data() as StoredDocumentRecord;
    }
    return null;
  } catch (e: any) {
    if (isProduction) {
      console.error("[DocumentService] Error en getDocumentById Firestore en producción:", e.message);
      const infraErr: any = new Error("Error de infraestructura al obtener documento");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  const mem = memoryDocumentsStore.get(`${orgId}:${documentId}`);
  return mem || null;
}

export async function deleteDocument(orgId: string, documentId: string): Promise<boolean> {
  const isProduction = process.env.NODE_ENV === "production";

  const existingDoc = await getDocumentById(orgId, documentId);
  if (!existingDoc) {
    return false;
  }

  // 1. Delete Firestore Metadata & Chunks
  try {
    const db = getAdminFirestore();
    const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);

    // Delete chunks subcollection
    const chunksSnap = await docRef.collection("chunks").get();
    if (!chunksSnap.empty) {
      const batch = db.batch();
      chunksSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    await docRef.delete();
  } catch (e: any) {
    if (isProduction) {
      console.error("[DocumentService] Error al eliminar metadata en Firestore en producción:", e.message);
      const infraErr: any = new Error("Error de infraestructura al eliminar documento");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  // 2. Delete original object in Storage
  try {
    const bucket = getAdminStorageBucket();
    await bucket.file(existingDoc.storagePath).delete();
  } catch (e: any) {
    if (isProduction) {
      console.error("[DocumentService] Error al eliminar archivo en Storage en producción:", e.message);
      const infraErr: any = new Error("Error de infraestructura al eliminar objeto en almacenamiento");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  // Clean memory store in dev/test
  const key = `${orgId}:${documentId}`;
  memoryDocumentsStore.delete(key);
  memoryChunksStore.delete(documentId);
  memoryFilesStore.delete(existingDoc.storagePath);

  return true;
}

export async function getDocumentChunks(orgId: string, documentId: string): Promise<DocChunk[]> {
  const isProduction = process.env.NODE_ENV === "production";

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
      console.error("[DocumentService] Error en getDocumentChunks Firestore en producción:", e.message);
      const infraErr: any = new Error("Error de infraestructura al obtener fragmentos");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  return memoryChunksStore.get(documentId) || [];
}

export async function getDocumentFileBuffer(orgId: string, documentId: string): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
  const isProduction = process.env.NODE_ENV === "production";

  const docRecord = await getDocumentById(orgId, documentId);
  if (!docRecord) {
    return null;
  }

  try {
    const bucket = getAdminStorageBucket();
    const file = bucket.file(docRecord.storagePath);
    const [buffer] = await file.download();
    return {
      buffer,
      mimeType: docRecord.mimeType,
      filename: docRecord.filename,
    };
  } catch (e: any) {
    if (isProduction) {
      console.error("[DocumentService] Error al descargar archivo desde Storage en producción:", e.message);
      const infraErr: any = new Error("Error de infraestructura al descargar archivo");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
  }

  const memBuffer = memoryFilesStore.get(docRecord.storagePath);
  if (memBuffer) {
    return {
      buffer: memBuffer,
      mimeType: docRecord.mimeType,
      filename: docRecord.filename,
    };
  }

  return null;
}

export function clearDocumentStoreForTesting(): void {
  memoryDocumentsStore.clear();
  memoryChunksStore.clear();
  memoryFilesStore.clear();
}
