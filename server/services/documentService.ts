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
]);

const ALLOWED_CATEGORIES = new Set<CategoryType>([
  "Ley",
  "Decreto",
  "Resolución SRT",
  "Norma IRAM",
  "Norma ISO",
  "Manual",
  "Procedimiento",
  "Instructivo",
  "Apunte",
  "Formulario",
  "Informe",
  "Otro",
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

  const { filename, fileBase64, mimeType, chunks, tags, title, category, pageCount, summary, author, issuingOrganism } = body;

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
      error: `Tipo MIME no permitido o no soportado (${cleanMime}). El tipo application/octet-stream no está permitido.`,
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
    // PDF Magic bytes: %PDF (0x25 0x50 0x44 0x46)
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
    // DOCX/XLSX ZIP signature: PK (0x50 0x4b 0x03 0x04)
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

  // PageCount validation
  if (pageCount !== undefined) {
    if (typeof pageCount !== "number" || isNaN(pageCount) || !isFinite(pageCount) || pageCount < 1 || !Number.isInteger(pageCount) || pageCount > 10000) {
      return {
        valid: false,
        error: "El campo pageCount debe ser un número entero válido entre 1 y 10000. No se permiten objetos, arrays, NaN o Infinity.",
        code: "INVALID_PAGE_COUNT",
      };
    }
  }

  // Category validation
  if (category !== undefined) {
    if (typeof category !== "string" || !ALLOWED_CATEGORIES.has(category as CategoryType)) {
      return {
        valid: false,
        error: `Categoría inválida (${category}). Las categorías permitidas son Ley, Decreto, Resolución SRT, Norma IRAM, Norma ISO, Manual, Procedimiento, Instructivo, Apunte, Formulario, Informe, Otro`,
        code: "INVALID_CATEGORY",
      };
    }
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
  let metadataCreatedSuccess = false;

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
    // Transactional Rollback: Clean up any partially created Firestore metadata or chunks
    if (metadataCreatedSuccess) {
      try {
        const db = getAdminFirestore();
        const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);
        
        // Delete metadata
        await docRef.delete();
      } catch {
        // Suppress secondary cleanup errors
      }
    }

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

  let storageDeleted = false;

  // 1. Delete original object in Storage first
  try {
    const bucket = getAdminStorageBucket();
    await bucket.file(existingDoc.storagePath).delete();
    storageDeleted = true;
  } catch (e: any) {
    if (isProduction) {
      console.error("[DocumentService] Error al eliminar archivo en Storage en producción:", e.message);
      const infraErr: any = new Error("Error de infraestructura al eliminar objeto en almacenamiento");
      infraErr.code = "INFRASTRUCTURE_ERROR";
      infraErr.status = 503;
      throw infraErr;
    }
    // In dev/test environment, assume delete succeeded if we use fallback stores
    storageDeleted = true;
  }

  // 2. Delete Firestore Metadata & Chunks upon successful Storage deletion
  if (storageDeleted) {
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
        console.error(
          `[CRITICAL INCONSISTENCY] El archivo físico se eliminó de Storage (path: ${existingDoc.storagePath}), pero falló la eliminación de metadata/chunks en Firestore para el documento ${documentId}. Error: ${e.message}`
        );
        const infraErr: any = new Error("Error de infraestructura al eliminar documento de la base de datos (Firestore)");
        infraErr.code = "INFRASTRUCTURE_ERROR";
        infraErr.status = 503;
        throw infraErr;
      }
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
