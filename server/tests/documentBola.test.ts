import { describe, it, expect, beforeEach } from "vitest";
import {
  createDocument,
  listDocuments,
  getDocumentById,
  renewDocumentVersion,
  updateDocumentMetadata,
  softDeleteDocument,
  restoreDocument,
  hardDeleteDocument,
  getDocumentChunks,
  getDocumentFileBuffer,
  clearDocumentStoreForTesting,
} from "../services/documentService";
import { setAdminFirestoreForTesting, setAdminStorageBucketForTesting } from "../auth/firestoreAdmin";
import { createMockFirestore } from "./mockFirestore";

class MockStorageBucket {
  files = new Map<string, string | Buffer>();
  file(path: string) {
    const self = this;
    return {
      exists: async () => [self.files.has(path)],
      save: async (data: Buffer | string) => { self.files.set(path, data); },
      delete: async () => { self.files.delete(path); },
      download: async () => { return [self.files.get(path)]; }
    };
  }
}

let mockDb: any;
let mockBucket: MockStorageBucket;

describe("FASE 13.1 - CIERRE FORENSE DE BOLA/IDOR EN DOCUMENTOS", () => {
  beforeEach(() => {
    mockDb = createMockFirestore();
    mockBucket = new MockStorageBucket();
    clearDocumentStoreForTesting();
    setAdminFirestoreForTesting(mockDb as any);
    setAdminStorageBucketForTesting(mockBucket as any);
  });

  const uploadTestDoc = async (orgId: string, companyId: string) => {
    return await createDocument({
      orgId,
      uid: "user_owner",
      filename: "test.pdf",
      fileBuffer: Buffer.from("test"),
      mimeType: "application/pdf",
      title: "Test Doc",
      category: "Informes",
      scope: "company",
      companyId,
    });
  };

  it("TEST: GET chunks cross-company (BOLA)", async () => {
    const doc = await uploadTestDoc("org_alpha", "comp_A");
    
    await expect(getDocumentChunks("org_alpha", doc.id, ["comp_B"])).rejects.toThrow(/Acceso denegado/);
  });

  it("TEST: PUT metadata cross-company (BOLA)", async () => {
    const doc = await uploadTestDoc("org_alpha", "comp_A");
    
    await expect(
      updateDocumentMetadata("org_alpha", doc.id, { title: "Hacked" }, ["comp_B"])
    ).rejects.toThrow(/Acceso denegado/);
  });

  it("TEST: renew cross-company (BOLA)", async () => {
    const doc = await uploadTestDoc("org_alpha", "comp_A");
    
    await expect(
      renewDocumentVersion({
        orgId: "org_alpha",
        documentId: doc.id,
        uid: "user_hacker",
        filename: "renew.pdf",
        fileBuffer: Buffer.from("hacked"),
        mimeType: "application/pdf",
        assignedCompanyIds: ["comp_B"]
      })
    ).rejects.toThrow(/Acceso denegado/);
  });

  it("TEST: restore cross-company (BOLA)", async () => {
    const doc = await uploadTestDoc("org_alpha", "comp_A");
    await softDeleteDocument("org_alpha", doc.id, "user_owner", "Owner", undefined);
    
    await expect(
      restoreDocument("org_alpha", doc.id, ["comp_B"])
    ).rejects.toThrow(/Acceso denegado/);
  });

  it("TEST: hard delete cross-company (BOLA)", async () => {
    const doc = await uploadTestDoc("org_alpha", "comp_A");
    
    await expect(
      hardDeleteDocument("org_alpha", doc.id, ["comp_B"])
    ).rejects.toThrow(/Acceso denegado/);
  });

  it("TEST: download cross-company (BOLA)", async () => {
    const doc = await uploadTestDoc("org_alpha", "comp_A");
    
    await expect(
      getDocumentFileBuffer("org_alpha", doc.id, undefined, ["comp_B"])
    ).rejects.toThrow(/Acceso denegado/); // actually returns null? Let's see what getDocumentById throws
  });

  it("TEST: empty assignedCompanyIds (DENY ALL)", async () => {
    const doc = await uploadTestDoc("org_alpha", "comp_A");
    
    await expect(
      getDocumentById("org_alpha", doc.id, true, [])
    ).rejects.toThrow(/no tiene empresas asignadas/);
  });

  it("TEST: undefined assignedCompanyIds (GLOBAL ALLOW)", async () => {
    const doc = await uploadTestDoc("org_alpha", "comp_A");
    
    const fetched = await getDocumentById("org_alpha", doc.id, true, undefined);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(doc.id);
  });

  it("TEST: partial company assignment (ALLOW MATCHING ONLY)", async () => {
    const docA = await uploadTestDoc("org_alpha", "comp_A");
    const docB = await uploadTestDoc("org_alpha", "comp_B");
    const docC = await uploadTestDoc("org_alpha", "comp_C");

    const list = await listDocuments("org_alpha", {}, ["comp_A", "comp_B"]);
    const ids = list.map(d => d.id);
    expect(ids).toContain(docA.id);
    expect(ids).toContain(docB.id);
    expect(ids).not.toContain(docC.id);
  });
});
