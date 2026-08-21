import crypto from "crypto";
import { getAdminFirestore, getAdminApp } from "../auth/firestoreAdmin";
import { DocumentItem, DocChunk } from "../../src/types/safety";

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

// In-memory document storage fallback for non-Firestore/test environments
const memoryDocumentsStore = new Map<string, StoredDocumentRecord>();
const memoryChunksStore = new Map<string, DocChunk[]>();

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

  const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const storagePath = `organizations/${orgId}/documents/${documentId}/${filename}`;
  const createdAt = new Date().toISOString();

  const cleanTitle = title || filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

  const record: StoredDocumentRecord = {
    id: documentId,
    orgId,
    uid,
    filename,
    title: cleanTitle,
    category: category || "Informe",
    fileType: filename.split(".").pop()?.toLowerCase() || "pdf",
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

  try {
    const db = getAdminFirestore();
    const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);
    await docRef.set(record);

    // Save chunks if present
    if (chunks.length > 0) {
      const batch = db.batch();
      chunks.forEach((chunk, idx) => {
        const chunkRef = docRef.collection("chunks").doc(chunk.id || `chunk_${documentId}_${idx + 1}`);
        batch.set(chunkRef, { ...chunk, docId: documentId, orgId });
      });
      await batch.commit();
    }
  } catch (e) {
    // Fallback to memory store if Firestore is not active (e.g. unit tests)
    memoryDocumentsStore.set(`${orgId}:${documentId}`, record);
    memoryChunksStore.set(documentId, chunks);
  }

  return record;
}

export async function listDocuments(orgId: string): Promise<StoredDocumentRecord[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection("organizations").doc(orgId).collection("documents").get();
    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => doc.data() as StoredDocumentRecord);
    }
  } catch (e) {
    // Fallback memory query
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
  try {
    const db = getAdminFirestore();
    const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);
    const snap = await docRef.get();
    if (snap.exists) {
      return snap.data() as StoredDocumentRecord;
    }
  } catch (e) {
    // Fallback
  }

  const mem = memoryDocumentsStore.get(`${orgId}:${documentId}`);
  return mem || null;
}

export async function deleteDocument(orgId: string, documentId: string): Promise<boolean> {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection("organizations").doc(orgId).collection("documents").doc(documentId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return false;
    }
    await docRef.delete();
    return true;
  } catch (e) {
    // Fallback
  }

  const key = `${orgId}:${documentId}`;
  if (memoryDocumentsStore.has(key)) {
    memoryDocumentsStore.delete(key);
    memoryChunksStore.delete(documentId);
    return true;
  }

  return false;
}

export async function getDocumentChunks(orgId: string, documentId: string): Promise<DocChunk[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection("organizations").doc(orgId).collection("documents").doc(documentId).collection("chunks").get();
    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => doc.data() as DocChunk);
    }
  } catch (e) {
    // Fallback
  }

  return memoryChunksStore.get(documentId) || [];
}

export function clearDocumentStoreForTesting(): void {
  memoryDocumentsStore.clear();
  memoryChunksStore.clear();
}
