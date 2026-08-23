import { DocumentItem, DocChunk, FavoriteItem, ChatSession, SummaryResult, ChecklistInspection, HazardAnalysisResult, RAGQueryLog, DocComparisonResult, LibraryStats, NormativeAlert, InspectionReport, InspectionFinding, InspectorStats, UserProfile, UserPlan } from '../types/safety';
import { dbFirestore, ensureAuth, collection, doc, setDoc, deleteDoc, onSnapshot, query, where, OperationType, handleFirestoreError, sanitizeForFirestore } from './firebase';
import { buildApiUrl } from '../utils/apiConfig';

const STORAGE_KEYS = {
  DOCUMENTS: 'safety_ia_documents_v2',
  CHUNKS: 'safety_ia_chunks_v2',
  FAVORITES: 'safety_ia_favorites_v2',
  CHAT_SESSIONS: 'safety_ia_chat_sessions_v2',
  SUMMARIES: 'safety_ia_summaries_v2',
  CHECKLISTS: 'safety_ia_checklists_v2',
  HAZARD_ANALYSES: 'safety_ia_hazard_analyses_v2',
  INSPECTOR_REPORTS: 'safety_ia_inspector_reports_v1',
  RAG_CACHE: 'safety_ia_rag_cache_v1',
  RAG_LOGS: 'safety_ia_rag_logs_v1',
  DOC_COMPARISONS: 'safety_ia_doc_comparisons_v1',
  USER_PROFILE: 'safety_ia_user_profile_v1',
  APP_THEME: 'safety_ia_theme',
};

const memStorage = new Map<string, string>();
const getStorage = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return {
    getItem: (key: string) => memStorage.get(key) || null,
    setItem: (key: string, value: string) => memStorage.set(key, value),
    removeItem: (key: string) => memStorage.delete(key),
    clear: () => memStorage.clear(),
  };
};

// Seed initial legal norms for Argentina and International Safety Standards
const INITIAL_SAFETY_NORMS: Omit<DocumentItem, 'id'>[] = [];

export class LocalSafetyDB {
  private static instance: LocalSafetyDB;

  private constructor() {
    this.initSeedData();
    this.initCloudSync();
  }

  private async initCloudSync() {
    try {
      const user = await ensureAuth();
      if (!user) return;

      // Realtime listener for Documents
      onSnapshot(
        query(collection(dbFirestore, 'documents'), where('userId', '==', user.uid)),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudDocs: DocumentItem[] = [];
            snapshot.forEach((d) => cloudDocs.push(d.data() as DocumentItem));
            if (cloudDocs.length > 0) {
              const local = this.getDocuments();
              const mergedMap = new Map<string, DocumentItem>();
              local.forEach((doc) => mergedMap.set(doc.id, doc));
              cloudDocs.forEach((doc) => mergedMap.set(doc.id, doc));
              const merged = Array.from(mergedMap.values());
              localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(merged));
            }
          }
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'documents')
      );

      // Realtime listener for Favorites
      onSnapshot(
        query(collection(dbFirestore, 'favorites'), where('userId', '==', user.uid)),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudFavs: FavoriteItem[] = [];
            snapshot.forEach((d) => cloudFavs.push(d.data() as FavoriteItem));
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(cloudFavs));
          }
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'favorites')
      );

      // Realtime listener for Chat Sessions
      onSnapshot(
        query(collection(dbFirestore, 'chatSessions'), where('userId', '==', user.uid)),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudChats: ChatSession[] = [];
            snapshot.forEach((d) => cloudChats.push(d.data() as ChatSession));
            localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(cloudChats));
          }
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'chatSessions')
      );

      // Realtime listener for Summaries
      onSnapshot(
        query(collection(dbFirestore, 'summaries'), where('userId', '==', user.uid)),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudSummaries: SummaryResult[] = [];
            snapshot.forEach((d) => cloudSummaries.push(d.data() as SummaryResult));
            localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(cloudSummaries));
          }
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'summaries')
      );

      // Realtime listener for Checklists
      onSnapshot(
        query(collection(dbFirestore, 'checklists'), where('userId', '==', user.uid)),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudChecklists: ChecklistInspection[] = [];
            snapshot.forEach((d) => cloudChecklists.push(d.data() as ChecklistInspection));
            localStorage.setItem(STORAGE_KEYS.CHECKLISTS, JSON.stringify(cloudChecklists));
          }
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'checklists')
      );

      // Legacy Realtime listener for Inspector Reports disabled - multi-tenant inspections are handled via inspectionService
    } catch (e) {
      console.warn('[CloudSync] Firestore initialization note:', e);
    }
  }

  public static getInstance(): LocalSafetyDB {
    if (!LocalSafetyDB.instance) {
      LocalSafetyDB.instance = new LocalSafetyDB();
    }
    return LocalSafetyDB.instance;
  }

  private initSeedData() {
    const existingDocs = this.getDocuments();
    if (existingDocs.length === 0) {
      console.log('[Safety IA] Seeding default legal & technical norms...');
      const seededDocs: DocumentItem[] = [];
      const seededChunks: DocChunk[] = [];

      INITIAL_SAFETY_NORMS.forEach((norm, index) => {
        const docId = `doc_seed_${index + 1}`;
        const newDoc: DocumentItem = {
          ...norm,
          id: docId,
        };
        seededDocs.push(newDoc);

        // Split doc into structured chunks
        const paragraphs = norm.content.split('\n\n');
        paragraphs.forEach((p, pIdx) => {
          if (p.trim().length > 10) {
            seededChunks.push({
              id: `chunk_${docId}_${pIdx + 1}`,
              docId: docId,
              docTitle: norm.title,
              category: norm.category,
              pageNumber: Math.floor(pIdx / 2) + 1,
              text: p.trim(),
            });
          }
        });
      });

      getStorage().setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(seededDocs));
      getStorage().setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(seededChunks));
    }
  }

  // Document Operations
  public getDocuments(): DocumentItem[] {
    try {
      const data = getStorage().getItem(STORAGE_KEYS.DOCUMENTS);
      if (!data) return [];
      const parsed: DocumentItem[] = JSON.parse(data);
      return parsed.map((doc) => ({
        ...doc,
        version: doc.version || 1,
        status: doc.status || 'Vigente',
        versionHistory: doc.versionHistory || [],
        processingState: doc.processingState || 'indexed',
        issuingOrganism: doc.issuingOrganism || doc.author || 'Organismo Oficial',
      }));
    } catch (e) {
      console.error('Error loading documents:', e);
      return [];
    }
  }

  public getDocumentById(id: string): DocumentItem | undefined {
    return this.getDocuments().find((d) => d.id === id);
  }

  public checkDuplicateDocument(title: string, fileSize?: number): DocumentItem | null {
    const docs = this.getDocuments();
    const cleanTitle = title.trim().toLowerCase().replace(/\.[^/.]+$/, "");

    for (const d of docs) {
      const docClean = d.title.trim().toLowerCase().replace(/\.[^/.]+$/, "");
      if (docClean === cleanTitle) {
        return d;
      }
      if (fileSize && d.fileSize && d.fileSize === fileSize && docClean.includes(cleanTitle.slice(0, 10))) {
        return d;
      }
    }
    return null;
  }

  public async addDocument(docItem: DocumentItem, chunks: DocChunk[]): Promise<void> {
    const docs = this.getDocuments();
    const existingChunks = this.getChunks();
    const user = await ensureAuth();

    const formattedDocItem: DocumentItem = {
      ...docItem,
      userId: user.uid,
      version: docItem.version || 1,
      status: docItem.status || 'Vigente',
      versionHistory: docItem.versionHistory || [],
      processingState: docItem.processingState || 'indexed',
      issuingOrganism: docItem.issuingOrganism || docItem.author,
    };

    docs.unshift(formattedDocItem);
    const updatedChunks = [...chunks, ...existingChunks];

    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
    localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(updatedChunks));

    // Cloud Sync
    setDoc(doc(dbFirestore, 'documents', formattedDocItem.id), sanitizeForFirestore(formattedDocItem)).catch((e) =>
      handleFirestoreError(e, OperationType.WRITE, 'documents')
    );
  }

  public updateDocumentVersion(
    existingDocId: string,
    newDocItem: DocumentItem,
    newChunks: DocChunk[],
    mode: 'replace' | 'new_version'
  ): void {
    let docs = this.getDocuments();
    let chunks = this.getChunks().filter((c) => c.docId !== existingDocId);

    const targetIdx = docs.findIndex((d) => d.id === existingDocId);
    if (targetIdx !== -1) {
      const existing = docs[targetIdx];
      if (mode === 'replace') {
        docs[targetIdx] = {
          ...newDocItem,
          id: existing.id,
          version: existing.version,
          versionHistory: existing.versionHistory,
          status: 'Vigente',
          processingState: 'indexed',
        };
      } else {
        // New Version Mode
        const newVerNumber = existing.version + 1;
        const historyEntry = {
          version: existing.version,
          uploadDate: existing.uploadDate,
          fileSize: existing.fileSize,
          note: `Reemplazado por versión ${newVerNumber}`,
        };

        const updatedHistory = [historyEntry, ...(existing.versionHistory || [])];

        docs[targetIdx] = {
          ...newDocItem,
          id: existing.id,
          version: newVerNumber,
          versionHistory: updatedHistory,
          status: 'Vigente',
          processingState: 'indexed',
        };
      }

      const updatedChunks = [...newChunks, ...chunks];

      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
      localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(updatedChunks));

      setDoc(doc(dbFirestore, 'documents', existing.id), docs[targetIdx]).catch((e) =>
        console.warn('Document version update cloud sync note:', e)
      );
    }
  }

  public getLibraryStatistics(): LibraryStats {
    const docs = this.getDocuments();
    const chunks = this.getChunks();
    const logs = this.getRAGLogs();

    const totalDocs = docs.length;
    const totalPages = docs.reduce((acc, d) => acc + (d.pageCount || 1), 0);
    const totalChunks = chunks.length;
    const embeddingsGenerated = totalChunks;
    const spaceUsedBytes = docs.reduce((acc, d) => acc + (d.fileSize || 500000), 0);

    const vigenteDocsCount = docs.filter((d) => d.status === 'Vigente').length;
    const reemplazadoDocsCount = docs.filter((d) => d.status === 'Reemplazado').length;
    const derogadoDocsCount = docs.filter((d) => d.status === 'Derogado').length;

    // Category breakdown
    const categoryMap: { [cat: string]: number } = {};
    docs.forEach((d) => {
      categoryMap[d.category] = (categoryMap[d.category] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count,
    }));

    // Year breakdown
    const yearMap: { [year: string]: number } = {};
    docs.forEach((d) => {
      const year = d.documentDate ? d.documentDate.slice(0, 4) : '2026';
      yearMap[year] = (yearMap[year] || 0) + 1;
    });
    const yearBreakdown = Object.entries(yearMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, count]) => ({ year, count }));

    // Alerts detection
    const alerts: NormativeAlert[] = [];
    docs.forEach((d) => {
      if (d.processingState === 'pending_ocr') {
        alerts.push({
          id: `alert_ocr_${d.id}`,
          docId: d.id,
          docTitle: d.title,
          type: 'pending_ocr',
          message: 'Texto extraído por imagen/OCR. Requiere validación de tabla de contenidos.',
          createdAt: new Date().toISOString(),
        });
      }
      if (!d.summary || d.summary.length < 20) {
        alerts.push({
          id: `alert_meta_${d.id}`,
          docId: d.id,
          docTitle: d.title,
          type: 'incomplete_metadata',
          message: 'Falta generar resumen ejecutivo y etiquetas inteligentes.',
          createdAt: new Date().toISOString(),
        });
      }
    });

    return {
      totalDocs,
      totalPages,
      totalChunks,
      embeddingsGenerated,
      spaceUsedBytes,
      lastSyncTimestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      vigenteDocsCount,
      reemplazadoDocsCount,
      derogadoDocsCount,
      categoryBreakdown,
      yearBreakdown,
      queriesCount: logs.length,
      alerts,
    };
  }

  public exportFullDatabaseBackup(): string {
    const backupData = {
      app: 'Safety IA',
      version: '2.5',
      exportDate: new Date().toISOString(),
      documents: this.getDocuments(),
      chunks: this.getChunks(),
      favorites: this.getFavorites(),
      chatSessions: this.getChatSessions(),
      summaries: this.getSummaries(),
      checklists: this.getChecklists(),
      hazardAnalyses: this.getHazardAnalyses(),
      ragLogs: this.getRAGLogs(),
      docComparisons: this.getDocComparisons(),
    };
    return JSON.stringify(backupData, null, 2);
  }

  public importDatabaseBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.documents || !Array.isArray(data.documents)) {
        return { success: false, message: 'Formato de copia de seguridad no válido.' };
      }

      if (data.documents) localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(data.documents));
      if (data.chunks) localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(data.chunks));
      if (data.favorites) localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(data.favorites));
      if (data.chatSessions) localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(data.chatSessions));
      if (data.summaries) localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(data.summaries));
      if (data.checklists) localStorage.setItem(STORAGE_KEYS.CHECKLISTS, JSON.stringify(data.checklists));
      if (data.hazardAnalyses) localStorage.setItem(STORAGE_KEYS.HAZARD_ANALYSES, JSON.stringify(data.hazardAnalyses));
      if (data.ragLogs) localStorage.setItem(STORAGE_KEYS.RAG_LOGS, JSON.stringify(data.ragLogs));
      if (data.docComparisons) localStorage.setItem(STORAGE_KEYS.DOC_COMPARISONS, JSON.stringify(data.docComparisons));

      return { success: true, message: 'Base documental restaurada con éxito.' };
    } catch (e: any) {
      return { success: false, message: 'Error al importar: ' + e.message };
    }
  }

  public deleteDocument(id: string): void {
    const docs = this.getDocuments().filter((d) => d.id !== id);
    const chunks = this.getChunks().filter((c) => c.docId !== id);

    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
    localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(chunks));

    // Cloud Sync
    deleteDoc(doc(dbFirestore, 'documents', id)).catch((e) =>
      console.warn('Document cloud delete note:', e)
    );
  }

  public getChunks(): DocChunk[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHUNKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading chunks:', e);
      return [];
    }
  }

  // RAG Search Engine across document chunks
  public searchRelevantChunks(query: string, maxResults = 6): DocChunk[] {
    const chunks = this.getChunks();
    if (chunks.length === 0 || !query.trim()) return [];

    const queryTokens = query
      .toLowerCase()
      .replace(/[^\w\s\dáéíóúñ]/gi, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (queryTokens.length === 0) return chunks.slice(0, maxResults);

    const scoredChunks = chunks.map((chunk) => {
      let score = 0;
      const lowerText = chunk.text.toLowerCase();
      const lowerTitle = chunk.docTitle.toLowerCase();

      queryTokens.forEach((token) => {
        // High priority if token appears in title
        if (lowerTitle.includes(token)) score += 5;
        // Priority for text matches
        const matches = (lowerText.match(new RegExp(token, 'gi')) || []).length;
        score += matches * 2;
      });

      return { chunk, score };
    });

    // Sort by score descending
    const filtered = scoredChunks
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.chunk);

    // Fallback if strict token match yielded no results
    if (filtered.length === 0) {
      return chunks.slice(0, maxResults);
    }

    return filtered.slice(0, maxResults);
  }

  // Favorites Operations
  public getFavorites(): FavoriteItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  public async addFavorite(fav: Omit<FavoriteItem, 'id'>): Promise<FavoriteItem> {
    const favorites = this.getFavorites();
    const user = await ensureAuth();
    const newFav: FavoriteItem = {
      ...fav,
      userId: user.uid,
      id: `fav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    favorites.unshift(newFav);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));

    // Cloud Sync
    setDoc(doc(dbFirestore, 'favorites', newFav.id), sanitizeForFirestore(newFav)).catch((e) =>
      handleFirestoreError(e, OperationType.WRITE, 'favorites')
    );

    return newFav;
  }

  public removeFavorite(id: string): void {
    const favorites = this.getFavorites().filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));

    // Cloud Sync
    deleteDoc(doc(dbFirestore, 'favorites', id)).catch((e) =>
      handleFirestoreError(e, OperationType.DELETE, 'favorites')
    );
  }

  public isFavorite(content: string): boolean {
    return this.getFavorites().some((f) => f.content === content);
  }

  // Chat Sessions Operations
  public getChatSessions(): ChatSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  public async saveChatSession(session: ChatSession): Promise<void> {
    const sessions = this.getChatSessions();
    const user = await ensureAuth();
    const formattedSession = { ...session, userId: user.uid };

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = formattedSession;
    } else {
      sessions.unshift(formattedSession);
    }
    localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(sessions));

    // Cloud Sync
    setDoc(doc(dbFirestore, 'chatSessions', session.id), sanitizeForFirestore(formattedSession)).catch((e) =>
      handleFirestoreError(e, OperationType.WRITE, 'chatSessions')
    );
  }

  public deleteChatSession(id: string): void {
    const sessions = this.getChatSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(sessions));

    // Cloud Sync
    deleteDoc(doc(dbFirestore, 'chatSessions', id)).catch((e) =>
      handleFirestoreError(e, OperationType.DELETE, 'chatSessions')
    );
  }

  // Summaries Operations
  public getSummaries(): SummaryResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUMMARIES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  public async saveSummary(summary: SummaryResult): Promise<void> {
    const summaries = this.getSummaries();
    const user = await ensureAuth();
    const formattedSummary = { ...summary, userId: user.uid };

    summaries.unshift(formattedSummary);
    localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(summaries));

    // Cloud Sync
    setDoc(doc(dbFirestore, 'summaries', summary.id), sanitizeForFirestore(formattedSummary)).catch((e) =>
      handleFirestoreError(e, OperationType.WRITE, 'summaries')
    );
  }

  public deleteSummary(id: string): void {
    const summaries = this.getSummaries().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(summaries));

    // Cloud Sync
    deleteDoc(doc(dbFirestore, 'summaries', id)).catch((e) =>
      handleFirestoreError(e, OperationType.DELETE, 'summaries')
    );
  }

  // Checklists Operations
  public getChecklists(): ChecklistInspection[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHECKLISTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  public async saveChecklist(checklist: ChecklistInspection): Promise<void> {
    const checklists = this.getChecklists();
    const user = await ensureAuth();
    const formattedChecklist = { ...checklist, userId: user.uid };

    const idx = checklists.findIndex((c) => c.id === checklist.id);
    if (idx >= 0) {
      checklists[idx] = formattedChecklist;
    } else {
      checklists.unshift(formattedChecklist);
    }
    localStorage.setItem(STORAGE_KEYS.CHECKLISTS, JSON.stringify(checklists));

    // Cloud Sync
    setDoc(doc(dbFirestore, 'checklists', checklist.id), sanitizeForFirestore(formattedChecklist)).catch((e) =>
      handleFirestoreError(e, OperationType.WRITE, 'checklists')
    );
  }

  public deleteChecklist(id: string): void {
    const checklists = this.getChecklists().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CHECKLISTS, JSON.stringify(checklists));

    // Cloud Sync
    deleteDoc(doc(dbFirestore, 'checklists', id)).catch((e) =>
      handleFirestoreError(e, OperationType.DELETE, 'checklists')
    );
  }

  // Hazard Analyses Operations
  public getHazardAnalyses(): HazardAnalysisResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HAZARD_ANALYSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  public async saveHazardAnalysis(analysis: HazardAnalysisResult): Promise<void> {
    const items = this.getHazardAnalyses();
    const user = await ensureAuth();
    const formattedAnalysis = { ...analysis, userId: user.uid };

    items.unshift(formattedAnalysis);
    localStorage.setItem(STORAGE_KEYS.HAZARD_ANALYSES, JSON.stringify(items));

    // Cloud Sync
    setDoc(doc(dbFirestore, 'hazardAnalyses', analysis.id), sanitizeForFirestore(formattedAnalysis)).catch((e) =>
      handleFirestoreError(e, OperationType.WRITE, 'hazardAnalyses')
    );
  }

  // RAG Query Cache Operations
  public getCachedQuery(question: string): RAGQueryLog | null {
    try {
      const normalizedKey = question.trim().toLowerCase();
      const cacheData = localStorage.getItem(STORAGE_KEYS.RAG_CACHE);
      if (!cacheData) return null;
      const cacheMap = JSON.parse(cacheData);
      return cacheMap[normalizedKey] || null;
    } catch (e) {
      return null;
    }
  }

  public setCachedQuery(question: string, log: RAGQueryLog): void {
    try {
      const normalizedKey = question.trim().toLowerCase();
      const cacheData = localStorage.getItem(STORAGE_KEYS.RAG_CACHE);
      const cacheMap = cacheData ? JSON.parse(cacheData) : {};
      cacheMap[normalizedKey] = log;
      localStorage.setItem(STORAGE_KEYS.RAG_CACHE, JSON.stringify(cacheMap));
    } catch (e) {
      console.warn('Cache write note:', e);
    }
  }

  // RAG Query Logs / Smart History Operations
  public getRAGLogs(): RAGQueryLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RAG_LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  public async addRAGLog(log: RAGQueryLog): Promise<void> {
    const logs = this.getRAGLogs();
    const user = await ensureAuth();
    const formattedLog = sanitizeForFirestore({ ...log, userId: user.uid });

    logs.unshift(formattedLog);
    // Keep max 100 history items
    if (logs.length > 100) logs.pop();
    localStorage.setItem(STORAGE_KEYS.RAG_LOGS, JSON.stringify(logs));

    // Cloud Sync
    setDoc(doc(dbFirestore, 'ragLogs', log.id), formattedLog).catch((e) =>
      handleFirestoreError(e, OperationType.WRITE, 'ragLogs')
    );
  }

  // Document Comparisons Operations
  public getDocComparisons(): DocComparisonResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOC_COMPARISONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  public async saveDocComparison(comp: DocComparisonResult): Promise<void> {
    const items = this.getDocComparisons();
    const user = await ensureAuth();
    const formattedComp = sanitizeForFirestore({ ...comp, userId: user.uid });

    items.unshift(formattedComp);
    localStorage.setItem(STORAGE_KEYS.DOC_COMPARISONS, JSON.stringify(items));

    // Cloud Sync
    setDoc(doc(dbFirestore, 'docComparisons', comp.id), formattedComp).catch((e) =>
      handleFirestoreError(e, OperationType.WRITE, 'docComparisons')
    );
  }

  // ----------------------------------------------------
  // INSPECTOR IA - INSPECTOR REPORTS & FINDINGS
  // ----------------------------------------------------

  public getInspectionReports(): InspectionReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INSPECTOR_REPORTS);
      if (data) {
        return JSON.parse(data);
      }
      // Seed default demonstration inspection report if empty
      const defaultReports: InspectionReport[] = [
        {
          id: 'insp-seed-001',
          organizationId: 'org_default',
          title: 'Auditoría Técnica de Campo - Obra Estructura Norte',
          companyName: 'Constructora Austral S.A.',
          siteLocation: 'Obra Av. Libertador 4500, CABA',
          inspectorName: 'Ing. Carlos Mendoza',
          inspectorRegistration: 'Mat. CIPBA 48.912',
          date: '2026-08-01',
          gpsLocation: null,
          executiveSummary: 'Se realizó la inspección visual en el sector de armado de encofrados y tableros eléctricos principales. Se detectó trabajo en altura con arnés desenganchado y línea de vida sin certificar, además de tablero eléctrico temporal sin protección diferencial.',
          appliedNorms: [
            'Decreto 911/1996 (Reglamento de Higiene y Seguridad en la Construcción)',
            'Ley 19.587 de Higiene y Seguridad en el Trabajo',
            'Resolución SRT 295/2003 (Ergonomía)'
          ],
          findings: [
            {
              id: 'find-001',
              timestamp: '2026-08-01T10:15:00.000Z',
              location: { siteName: 'Planta 3 - Sector Fachada' },
              hazardCategory: 'Altura',
              hazardTitle: 'Operario trabajando a +4m sin amarre a cabo de vida',
              riskLevel: 'Crítico',
              description: 'Se observa operario realizando armado de encofrado sobre andamio tubular a 4.20m de altura vistiendo arnés de seguridad pero con los mosquetones sueltos sin fijar a la línea de vida.',
              suggestedAction: 'Detención inmediata de tareas en altura. Colocación obligatoria de doble cabo de vida anticaídas de absorción de impacto y enganche a punto de anclaje certificado.',
              status: 'Pendiente',
              normativeCitation: {
                docTitle: 'DECRETO N° 911/1996 - CONSTRUCCIÓN',
                pageNumber: 8,
                articleOrSection: 'Artículo 54 y Capítulo 4',
                quotedText: 'A partir de 1,50 metros de altura se considera trabajo con riesgo de caída a distinto nivel y es obligatorio el uso de cinturón de seguridad de arnés completo suspendido de punto fijo o cabo de vida independiente.',
                hasLibraryBackup: true,
              },
            },
            {
              id: 'find-002',
              timestamp: '2026-08-01T10:45:00.000Z',
              location: { siteName: 'Tablero Principal de Obra' },
              hazardCategory: 'Eléctrico',
              hazardTitle: 'Tablero provisorio sin interruptor diferencial y con cables expuestos',
              riskLevel: 'Alto',
              description: 'El tablero eléctrico de distribución secundaria carece de disyuntor diferencial de 30mA y posee cables con aislación deteriorada expuestos al paso de personal.',
              suggestedAction: 'Instalar interruptor diferencial tetrapolar de 30mA, acondicionar pasacables aislantes y cerrar con candado la puerta del tablero de obra.',
              status: 'En proceso',
              normativeCitation: {
                docTitle: 'DECRETO N° 351/1979 - REGLAMENTACIÓN LEY 19.587',
                pageNumber: 14,
                articleOrSection: 'Capítulo 12 - Artículos 95 a 98',
                quotedText: 'Todas las instalaciones eléctricas temporarias deberán contar con protección por interruptor diferencial de alta sensibilidad y puesta a tierra efectiva de las masas metálicas.',
                hasLibraryBackup: true,
              },
            },
            {
              id: 'find-003',
              timestamp: '2026-08-01T11:20:00.000Z',
              location: { siteName: 'Pasillo de Circulación Nivel 1' },
              hazardCategory: 'Orden y Limpieza',
              hazardTitle: 'Acopio desordenado de despuntes de madera con clavos',
              riskLevel: 'Medio',
              description: 'Restos de madera de desencofrado clavados invaden la vía de evacuación principal generando riesgo de tropezón y punzadura.',
              suggestedAction: 'Retiro y acopio en volquete con desclavado previo o protección de puntas.',
              status: 'Corregido',
              closedDate: '2026-08-02',
              closingNotes: 'Se realizó limpieza completa del pasillo y acopio seguro en contenedor.',
              normativeCitation: {
                docTitle: 'DECRETO N° 911/1996 - CONSTRUCCIÓN',
                pageNumber: 12,
                articleOrSection: 'Artículo 20',
                quotedText: 'Los pasillos y vías de circulación deben mantenerse limpios, libres de maderas con clavos y de todo elemento que pueda provocar caídas o tropezones.',
                hasLibraryBackup: true,
              },
            },
          ],
          generalRecommendations: [
            'Realizar charla de 5 minutos al inicio de jornada reforzando el uso obligatorio de arnés y protección eléctrica.',
            'Implementar sistema de tarjetas rojas/verdes para habilitación de andamios antes del inicio del turno.',
            'Disponer de volquetes exclusivos para madera en cada nivel de encofrado.'
          ],
          actionPlan: [
            {
              id: 'act-001',
              findingId: 'find-001',
              task: 'Suministrar e instalar línea de vida de acero de 8mm con tensor en fachada',
              responsible: 'Capataz de Estructura - Marcos Gómez',
              deadline: '2026-08-05',
              status: 'Pendiente',
              riskLevel: 'Crítico',
            },
            {
              id: 'act-002',
              findingId: 'find-002',
              task: 'Instalación de disyuntor diferencial de 30mA y prueba con probador de disparo',
              responsible: 'Electricista Matriculado - Juan Perez',
              deadline: '2026-08-04',
              status: 'En proceso',
              riskLevel: 'Alto',
            },
          ],
          status: 'En Proceso',
          createdAt: '2026-08-01T12:00:00.000Z',
          updatedAt: '2026-08-02T15:00:00.000Z',
        },
      ];
      localStorage.setItem(STORAGE_KEYS.INSPECTOR_REPORTS, JSON.stringify(defaultReports));
      return defaultReports;
    } catch (e) {
      return [];
    }
  }

  public async saveInspectionReport(report: InspectionReport): Promise<void> {
    const reports = this.getInspectionReports();
    const user = await ensureAuth();
    const formattedReport = { ...report, userId: user.uid };

    const idx = reports.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      reports[idx] = formattedReport;
    } else {
      reports.unshift(formattedReport);
    }
    localStorage.setItem(STORAGE_KEYS.INSPECTOR_REPORTS, JSON.stringify(reports));

    // Cloud Sync
    setDoc(doc(dbFirestore, 'inspectionReports', report.id), sanitizeForFirestore(formattedReport)).catch((e) =>
      handleFirestoreError(e, OperationType.WRITE, 'inspectionReports')
    );
  }

  public deleteInspectionReport(id: string): void {
    const reports = this.getInspectionReports().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.INSPECTOR_REPORTS, JSON.stringify(reports));

    // Cloud Sync
    deleteDoc(doc(dbFirestore, 'inspector_reports', id)).catch((e) =>
      console.warn('Inspector report cloud delete note:', e)
    );
  }

  public updateFindingStatus(
    reportId: string,
    findingId: string,
    newStatus: 'Pendiente' | 'En proceso' | 'Corregido',
    closingNotes?: string,
    verificationPhoto?: string
  ): void {
    const reports = this.getInspectionReports();
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const finding = report.findings.find((f) => f.id === findingId);
    if (!finding) return;

    finding.status = newStatus;
    if (newStatus === 'Corregido') {
      finding.closedDate = new Date().toISOString().split('T')[0];
      if (closingNotes) finding.closingNotes = closingNotes;
      if (verificationPhoto) {
        finding.verifications = finding.verifications || [];
        finding.verifications.push({
          id: `verif-${Date.now()}`,
          photoUrl: verificationPhoto,
          date: new Date().toISOString(),
          notes: closingNotes || 'Foto de verificación agregada',
        });
      }
    }

    // Update matching action plan item if exists
    const actionItem = report.actionPlan.find((a) => a.findingId === findingId);
    if (actionItem) {
      actionItem.status = newStatus;
    }

    // If all findings are corrected, mark report status as closed/completed
    const allCorrected = report.findings.every((f) => f.status === 'Corregido');
    if (allCorrected) {
      report.status = 'Cerrada';
    } else {
      report.status = 'En Proceso';
    }

    report.updatedAt = new Date().toISOString();
    this.saveInspectionReport(report);
  }

  public getInspectorStats(): InspectorStats {
    const reports = this.getInspectionReports();
    const totalInspections = reports.length;
    const completedInspections = reports.filter((r) => r.status === 'Cerrada' || r.status === 'Completada').length;
    const openInspections = totalInspections - completedInspections;

    let totalFindings = 0;
    let pendingCritical = 0;
    const catCountMap: Record<string, number> = {};
    const riskCountMap: Record<string, number> = { Bajo: 0, Medio: 0, Alto: 0, Crítico: 0 };
    let totalResolutionDays = 0;
    let resolvedCount = 0;

    reports.forEach((r) => {
      r.findings.forEach((f) => {
        totalFindings++;
        catCountMap[f.hazardCategory] = (catCountMap[f.hazardCategory] || 0) + 1;
        riskCountMap[f.riskLevel] = (riskCountMap[f.riskLevel] || 0) + 1;

        if (f.riskLevel === 'Crítico' && f.status !== 'Corregido') {
          pendingCritical++;
        }

        if (f.status === 'Corregido' && f.closedDate && f.timestamp) {
          const start = new Date(f.timestamp).getTime();
          const end = new Date(f.closedDate).getTime();
          const diffDays = Math.max(0.5, (end - start) / (1000 * 60 * 60 * 24));
          totalResolutionDays += diffDays;
          resolvedCount++;
        }
      });
    });

    const findingsByCategory = Object.entries(catCountMap).map(([category, count]) => ({
      category,
      count,
    })).sort((a, b) => b.count - a.count);

    const findingsByRisk = Object.entries(riskCountMap).map(([risk, count]) => ({
      risk: risk as any,
      count,
    }));

    const avgResolutionTimeDays = resolvedCount > 0 ? Number((totalResolutionDays / resolvedCount).toFixed(1)) : 2.5;

    // Monthly trend mock/calculation
    const monthlyMap: Record<string, { inspections: number; findings: number }> = {
      'Mayo 2026': { inspections: 3, findings: 8 },
      'Junio 2026': { inspections: 5, findings: 14 },
      'Julio 2026': { inspections: 7, findings: 19 },
      'Agosto 2026': { inspections: totalInspections, findings: totalFindings },
    };

    const monthlyTrend = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      inspectionsCount: data.inspections,
      findingsCount: data.findings,
    }));

    return {
      totalInspections,
      openInspections,
      completedInspections,
      totalFindings,
      pendingCritical,
      findingsByCategory,
      findingsByRisk,
      avgResolutionTimeDays,
      monthlyTrend,
    };
  }

  // Reset database to initial seed
  public resetToDefaultSeed(): void {
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    localStorage.removeItem(STORAGE_KEYS.CHUNKS);
    this.initSeedData();
  }

  // Clear all user data
  public clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    this.initSeedData();
  }

  /**
   * Helper to construct authenticated headers using Firebase ID Token.
   * x-user-id is retained for context compatibility, but backend strictly verifies the Bearer ID Token.
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const user = await ensureAuth();
      try {
        const token = await user.getIdToken();
        const orgId = getStorage().getItem('safetyia_active_org_id') || 'org_default';
        return {
          'x-user-id': user.uid,
          'x-org-id': orgId,
          'Authorization': `Bearer ${token}`,
        };
      } catch (e) {
        throw new Error('SESSION_INVALID');
      }
    } catch (err: any) {
      if (err.message === 'AUTHENTICATION_REQUIRED') {
        throw new Error('AUTHENTICATION_REQUIRED');
      }
      console.error('getAuthHeaders error:', err);
      throw new Error('SESSION_INVALID');
    }
  }

  // User Profile & Freemium Credits Engine
  public async getUserProfile(): Promise<UserProfile> {
    try {
      const user = await ensureAuth();
      const local = getStorage().getItem(STORAGE_KEYS.USER_PROFILE);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.uid === user.uid) {
          return parsed;
        } else {
          getStorage().removeItem(STORAGE_KEYS.USER_PROFILE);
        }
      }

      // Fetch from backend authority
      const headers = await this.getAuthHeaders();
      const res = await fetch(buildApiUrl('/user/profile'), {
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        const profile: UserProfile = data.profile;
        getStorage().setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
        return profile;
      }

      // Fallback
      const now = new Date();
      const defaultProfile: UserProfile = {
        uid: user.uid,
        email: user.email || 'profesional@safetyia.com',
        displayName: user.displayName || 'Profesional H&S',
        role: 'professional',
        plan: 'free',
        monthlyCredits: 20,
        creditsUsed: 0,
        billingPeriodStart: now.toISOString(),
        billingPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
      };
      getStorage().setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(defaultProfile));
      return defaultProfile;
    } catch (e) {
      console.warn('Error fetching user profile:', e);
      const now = new Date();
      return {
        uid: 'local_user',
        role: 'professional',
        plan: 'free',
        monthlyCredits: 20,
        creditsUsed: 0,
        billingPeriodStart: now.toISOString(),
        billingPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
      };
    }
  }

  public async changeUserPlan(plan: UserPlan): Promise<UserProfile> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(buildApiUrl('/user/change-plan'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ plan }),
    });

    if (!res.ok) {
      throw new Error('No se pudo actualizar el plan de suscripción.');
    }

    const data = await res.json();
    const updated: UserProfile = data.profile;
    getStorage().setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    return updated;
  }

  public async callAiApi<T>(endpoint: string, payload: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const url = buildApiUrl(endpoint);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text().catch(() => '');

      // Log diagnostic info safely (without body secrets like base64 images or tokens)
      const safePreview = rawText
        .slice(0, 300)
        .replace(/("imageBase64":\s*")[^"]+"/g, '$1[REDACTED_BASE64]"');

      console.log(`[callAiApi Diagnostic]`, {
        endpoint,
        status: response.status,
        contentType,
        bodyLength: rawText.length,
        preview: safePreview,
      });

      let data: any = null;
      let isJsonValid = false;

      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
          isJsonValid = true;
        } catch (_e) {
          isJsonValid = false;
        }
      }

      if (response.ok) {
        if (!rawText || rawText.trim().length === 0) {
          throw new Error(`El servidor respondió HTTP ${response.status}, pero el cuerpo está vacío y no contiene JSON válido.`);
        }

        if (isJsonValid && data !== null) {
          return data as T;
        }

        // HTTP 200 / ok but invalid JSON
        const safeBodyPreview = safePreview;
        throw new Error(`El servidor respondió HTTP ${response.status}, pero el cuerpo no contiene JSON válido. [ContentType: ${contentType}] [Preview: ${safeBodyPreview}]`);
      }

      // response.ok === false
      if (isJsonValid && data) {
        if (response.status === 402) {
          const error: any = new Error(data.message || 'Has alcanzado el límite mensual de créditos para tu plan.');
          error.code = 'AI_CREDITS_EXHAUSTED';
          error.details = data;
          throw error;
        }

        if (response.status === 429) {
          const error: any = new Error(data.message || 'Demasiadas operaciones simultáneas. Espera un momento.');
          error.code = 'RATE_LIMIT_EXCEEDED';
          throw error;
        }

        throw new Error(data.message || data.error || `Error en el servidor de IA (HTTP ${response.status}).`);
      }

      // response.ok === false and NOT valid JSON
      if (response.status === 413) {
        throw new Error('La imagen capturada excede el tamaño máximo. Por favor intenta tomar otra fotografía o reduce la resolución.');
      }
      if (response.status === 404) {
        throw new Error('Servicio de IA no disponible temporalmente (Endpoint 404).');
      }
      if (response.status === 403) {
        throw new Error('Acceso denegado a la organización o servicio de IA (HTTP 403).');
      }
      if (response.status === 401) {
        throw new Error('Sesión no autenticada. Por favor recarga la página para iniciar sesión.');
      }

      throw new Error(`El servidor respondió HTTP ${response.status}, pero el cuerpo no contiene JSON válido. [ContentType: ${contentType}] [Preview: ${safePreview}]`);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.error(`[callAiApi] AI_REQUEST_TIMEOUT para ${endpoint}`);
        throw new Error('AI_REQUEST_TIMEOUT');
      }
      throw err;
    }
  }
}

export const db = LocalSafetyDB.getInstance();
