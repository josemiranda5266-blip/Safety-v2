import { DocumentItem, DocChunk, FavoriteItem, ChatSession, SummaryResult, ChecklistInspection, HazardAnalysisResult, RAGQueryLog, DocComparisonResult, LibraryStats, NormativeAlert, InspectionReport, InspectionFinding, InspectorStats, UserProfile, UserPlan } from '../types/safety';
import { dbFirestore, ensureAuth, collection, doc, setDoc, deleteDoc, onSnapshot, query, where, OperationType, handleFirestoreError, sanitizeForFirestore } from './firebase';

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

// Seed initial legal norms for Argentina and International Safety Standards
const INITIAL_SAFETY_NORMS: Omit<DocumentItem, 'id'>[] = [
  {
    title: 'Ley 19.587 - Higiene y Seguridad en el Trabajo',
    category: 'Ley',
    author: 'Congreso de la Nación Argentina',
    uploadDate: new Date('2026-01-10').toISOString(),
    documentDate: '1972-04-21',
    tags: ['Ley', 'General', 'Obligaciones', 'EPP', 'Extintores', 'Capacitación'],
    pageCount: 12,
    fileType: 'pdf',
    fileSize: 450000,
    chunksCount: 8,
    version: 1,
    status: 'Vigente',
    issuingOrganism: 'Congreso de la Nación Argentina',
    summary: 'Ley fundamental de Higiene y Seguridad en el Trabajo en la República Argentina. Establece principios generales de prevención, condiciones de higiene, seguridad en establecimientos, equipos de protección personal y obligaciones patronales.',
    content: `LEY DE HIGIENE Y SEGURIDAD EN EL TRABAJO N° 19.587
Capítulo 1 - Principios Generales
Artículo 1° — Las condiciones de higiene y seguridad en el trabajo en todo el territorio de la República Argentina se ajustarán a las normas de la presente ley y de las reglamentaciones que en su consecuencia se dicten.
Artículo 4° — La higiene y seguridad en el trabajo comprende las normas técnicas y medidas sanitarias, precautorias, de tutela o de cualquier otra índole que tengan por objeto:
a) Proteger la vida, preservar y mantener la integridad psicofísica de los trabajadores;
b) Prevenir, reducir, eliminar o aislar los riesgos de los distintos centros o puestos de trabajo;
c) Estimular y desarrollar una actitud positiva respecto de la prevención de los accidentes y enfermedades que puedan derivarse de la actividad laboral.

Capítulo 3 - Reglamentación e Inspección
Artículo 8° — El empleador tiene la obligación de adoptar y poner en práctica las medidas adecuadas de higiene y seguridad para proteger la vida y la integridad de los trabajadores, especialmente en lo relativo a:
a) Edificios, estructuras, locales de trabajo y sus instalaciones;
b) Equipos, máquinas, herramientas y útiles de trabajo;
c) Suministro y mantenimiento de equipos de protección personal (EPP) homologados;
d) Iluminación, ventilación, temperatura, humedad y carga térmica adecuada;
e) Instalaciones eléctricas con disyuntor diferencial, puesta a tierra y protección contra contactos directos e indirectos;
f) Protección contra incendios, señalización, salidas de emergencia y extintores triclase (ABC) con carga y tarjeta de control vigente.

Capítulo 5 - Escaleras, Andamios y Trabajo en Altura
Artículo 14° — Toda escalera fija o portátil debe cumplir con estándares de resistencia estructural, peldaños antideslizantes y apoyo firme. Para escaleras de mano, la inclinación respecto del piso debe guardar una proporción de 1:4 (75 grados de inclinación). Toda escalera fija vertical de más de 6 metros de altura debe contar con jaula de protección hombre y descansos cada 9 metros. Para trabajos a más de 2 metros de altura es obligatorio el uso de arnés de seguridad de cuerpo completo amarrado a línea de vida independiente.

Capítulo 8 - Equipos de Protección Personal (EPP)
Artículo 19° — El empleador debe entregar gratuitamente a los trabajadores los EPP adecuados al riesgo específico de la tarea (casco de seguridad IRAM 3620, calzado con puntera de acero IRAM 3610, protección auditiva para niveles de ruido superiores a 85 dB(A), antiparras o pantalla facial para soldadura y protección respiratoria con filtro según contaminante). Los trabajadores están obligados a utilizar y conservar adecuadamente dichos elementos.`,
  },
  {
    title: 'Decreto 351/79 - Reglamentación General Ley 19.587',
    category: 'Decreto',
    author: 'Poder Ejecutivo Nacional',
    uploadDate: new Date('2026-01-12').toISOString(),
    documentDate: '1979-02-05',
    tags: ['Decreto', 'Iluminación', 'Ruido', 'Incendio', 'Electricidad', 'Ventilación'],
    pageCount: 85,
    fileType: 'pdf',
    fileSize: 1850000,
    chunksCount: 15,
    version: 1,
    status: 'Vigente',
    issuingOrganism: 'Poder Ejecutivo Nacional',
    summary: 'Decreto reglamentario principal de la Ley 19.587. Detalla especificaciones técnicas exactas para iluminación (luxes), niveles sonoros continuos equivalentes (ruido max 85 dBA), protección contra incendios, cálculo de extintores y riesgo eléctrico.',
    content: `DECRETO N° 351/1979 - REGLAMENTACIÓN DE LA LEY 19.587
Capítulo 12 - Protecciones en Máquinas e Instalaciones Eléctricas
Artículo 95° — Las instalaciones y equipos eléctricos deben ser proyectados, ejecutados y mantenidos de manera de prevenir contactos directos e indirectos. Toda instalación debe disponer de disyuntor diferencial de alta sensibilidad (30 mA), interruptores termomagnéticos dimensionados por conductor y puesta a tierra con valor de resistencia no mayor a 10 Ohms comprobado con telurímetro. Tableros eléctricos cerrados, con contrafrente e indicación de peligro eléctrico.

Anexo IV - Acústica Laboral y Niveles de Ruido
Capítulo 13 - El Nivel Sonoro Continuo Equivalente (NSCE) permitido para una jornada laboral de 8 horas diarias es de 85 dB(A). Para niveles superiores se debe reducir el tiempo de exposición según la escala logarítmica:
- 85 dB(A) -> Máximo 8 horas por día.
- 88 dB(A) -> Máximo 4 horas por día.
- 91 dB(A) -> Máximo 2 horas por día.
- 94 dB(A) -> Máximo 1 hora por día.
- Ningún trabajador podrá estar expuesto a ruidos de impacto o pico superiores a 140 dB(C) sin protección auditiva doble (tapón de inserción + copa auricular).

Anexo IV - Iluminación Mínima por Puestos de Trabajo
Capítulo 12 - Los niveles mínimos de iluminación en luxes (lx) requeridos son:
- Pasillos, depósitos y zonas de tránsito: 100 lx.
- Tareas ordinarias (montaje general, oficinas de archivo): 300 lx.
- Tareas moderadamente finas (lectura continua, dibujo, costura, control de calidad): 500 lx.
- Tareas muy finas de alta precisión (reparación de relojería, electrónica fina): 1000 a 1500 lx.
Las fuentes de luz no deben provocar deslumbramiento directo ni reflejos sobre las superficies de trabajo.

Anexo VI - Protección contra Incendios y Extintores
Artículo 160° — Todo establecimiento debe contar con extintores portátiles cuya cantidad se determinará a razón de 1 extintor triclase ABC de 5 kg o 10 kg por cada 200 m² de superficie cubierta o fracción. La distancia máxima a recorrer hasta alcanzar un extintor no superará los 20 metros. Los extintores deben ubicarse a una altura entre 1,20 m y 1,50 m del suelo, señalizados con placa fotoluminiscente y mantener vigentes la prueba hidráulica quinquenal y la recarga anual.`,
  },
  {
    title: 'Decreto 911/96 - Reglamento de Seguridad en la Construcción',
    category: 'Decreto',
    author: 'Poder Ejecutivo Nacional',
    uploadDate: new Date('2026-01-15').toISOString(),
    documentDate: '1996-08-05',
    tags: ['Construcción', 'Trabajo en Altura', 'Andamios', 'Excavaciones', 'Redes de Protección'],
    pageCount: 42,
    fileType: 'pdf',
    fileSize: 1200000,
    chunksCount: 10,
    version: 1,
    status: 'Vigente',
    issuingOrganism: 'Poder Ejecutivo Nacional',
    summary: 'Reglamento de Higiene y Seguridad específico para la industria de la construcción. Regula trabajos en altura, armados de andamios tubulares, excavaciones y submuraciones, arneses anticaídas y protecciones colectivas.',
    content: `DECRETO N° 911/1996 - REGLAMENTO DE HIGIENE Y SEGURIDAD PARA LA INDUSTRIA DE LA CONSTRUCCIÓN
Capítulo 4 - Protecciones Colectivas e Individuales
Artículo 50° — En todo trabajo con riesgo de caída a distinto nivel (altura superior a 1,50 metros respecto del plano inferior) es obligatorio instalar protecciones colectivas como barandas rígidas compuestas por pasamanos a 1,00 m de altura, travesaño intermedio a 0,50 m y zócalo de 0,15 m de altura en todo el contorno libre.
Artículo 54° — Cuando las protecciones colectivas no sean técnicamente viables, el trabajador debe utilizar arnés de seguridad anticaídas tipo paracaidista con cabo de amarre provisto de absorbedor de energía cinemática, amarrado a un punto de anclaje firme estructurado capaz de resistir 22 KN (2.200 kgf) o línea de vida de acero de 8 mm de diámetro.

Capítulo 6 - Andamios Tubulares y Suspendidos
Artículo 72° — Los andamios tubulares deben apoyarse sobre suelas de madera dura de al menos 2" de espesor con placas de base de acero. Deben estar firmemente arriostrados a la estructura del edificio en forma vertical y horizontal cada 6 metros. Las plataformas de trabajo deben tener un ancho mínimo de 0,60 m, estar constituidas por tablones de madera de primera calidad sin nudos ni fisuras o plataformas metálicas antideslizantes trabadas mediante grapas de seguridad. Prohibido usar tablones en voladizo o ladrillos como apoyo.

Capítulo 8 - Excavaciones, Zanjas y Submuraciones
Artículo 130° — Antes de iniciar excavaciones de más de 1,20 metros de profundidad se deben realizar entibaciones o apuntalamientos continuos o discontinuos en función de la cohesión del suelo y nivel freático. El material extraído debe acopiarse a una distancia mínima del borde equivalente a la mitad de la profundidad de la zanja (mínimo 0,60 metros del borde) para evitar derrumbes. Obligatorio verificar ausencia de interferencias de gas, agua y líneas eléctricas subterráneas antes de excavar.`,
  },
  {
    title: 'Resolución SRT 295/2003 - Especificaciones sobre Ergonomía y NIOSH',
    category: 'Resolución SRT',
    author: 'Superintendencia de Riesgos del Trabajo (SRT)',
    uploadDate: new Date('2026-01-20').toISOString(),
    documentDate: '2003-11-10',
    tags: ['Ergonomía', 'Levantamiento de Cargas', 'NIOSH', 'Trastornos Musculoesqueléticos', 'LPM'],
    pageCount: 30,
    fileType: 'pdf',
    fileSize: 980000,
    chunksCount: 8,
    version: 1,
    status: 'Vigente',
    issuingOrganism: 'Superintendencia de Riesgos del Trabajo',
    summary: 'Especificaciones técnicas detalladas sobre ergonomía en el trabajo. Introduce la ecuación de NIOSH para límites de peso recomendado en el levantamiento manual de cargas (LPM max 25 kg en condiciones ideales) y tablas de esfuerzos repetitivos.',
    content: `RESOLUCIÓN SRT N° 295/2003 - ANEXO I: ERGONOMÍA EN PUESTOS DE TRABAJO
1. Levantamiento Manual de Cargas
El límite máximo recomendado de carga para el levantamiento manual por un trabajador en condiciones ideales (carga pegada al cuerpo, altura de nudillos, sin rotación de tronco) es de 25 kg para hombres y 15 kg para mujeres o trabajadores jóvenes.
Para determinar el Límite de Peso Recomendado (LPR) real se aplica la ecuación de NIOSH modificada:
LPR = LC x HM x VM x DM x AM x FM x CM
Donde LC es la Constante de Carga (25 kg), HM es el Factor de Distancia Horizontal, VM el Factor de Altura Vertical, AM el Factor de Asimetría (ángulo de giro), FM el Factor de Frecuencia y CM el Acoplamiento de agarre.

2. Trastornos Musculoesqueléticos y Movimientos Repetitivos
Para tareas que involucren movimientos repetitivos de miembros superiores (manos, muñecas, codos) con una frecuencia superior a 4 segundos por ciclo, el empleador debe realizar la evaluación mediante el método NAM-TLVs (Threshold Limit Values para nivel de actividad manual). Se deben programar pausas activas de 5 minutos por cada hora de trabajo continuo en tareas repetitivas o de alta exigencia física.`,
  },
  {
    title: 'Decreto 1338/96 - Servicios de Medicina y de Higiene y Seguridad',
    category: 'Decreto',
    author: 'Poder Ejecutivo Nacional',
    uploadDate: new Date('2026-01-22').toISOString(),
    documentDate: '1996-11-25',
    tags: ['Servicios de Seguridad', 'Horas Profesional', 'Medicina del Trabajo', 'Categorías de Riesgo'],
    pageCount: 16,
    fileType: 'pdf',
    fileSize: 520000,
    chunksCount: 5,
    version: 1,
    status: 'Vigente',
    issuingOrganism: 'Poder Ejecutivo Nacional',
    summary: 'Establece la obligatoriedad de contar con Servicios de Medicina del Trabajo y Servicios de Higiene y Seguridad en el Trabajo en todos los establecimientos, determinando la asignación de horas-profesional mensuales en función de la cantidad de trabajadores y categoría de riesgo.',
    content: `DECRETO N° 1338/1996 - SERVICIOS DE MEDICINA Y DE HIGIENE Y SEGURIDAD LABORAL
Artículo 3° — Todo establecimiento debe disponer de un Servicio de Higiene y Seguridad en el Trabajo dirigido por un profesional con título universitario de Ingeniero Especialista en Higiene y Seguridad o Licenciado en Higiene y Seguridad Laboral con matrícula habilitante.
Artículo 12° — Las horas-profesional mensuales asignadas al Servicio de Higiene y Seguridad se determinan según el número de trabajadores equivalentes y la Categoría de Riesgo del establecimiento (A: Riesgo Bajo, B: Riesgo Medio, C: Riesgo Alto):
- Establecimientos Categoría C (Riesgo Alto): Requieren presencia asignada desde 5 trabajadores (mínimo 4 horas/mes profesional). Para más de 150 trabajadores de categoría C se exige Servicio Interno Permanente con dedicación exclusiva.
- Excepciones de asignación de horas: Quedan exceptuados de la asignación de horas profesionales los establecimientos agrícolas, comerciales o de servicios de hasta 5 trabajadores que no manipulen sustancias tóxicas ni utilicen maquinaria peligrosa.`,
  }
];

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

      // Realtime listener for Inspector Reports
      onSnapshot(
        query(collection(dbFirestore, 'inspectionReports'), where('userId', '==', user.uid)),
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudReports: InspectionReport[] = [];
            snapshot.forEach((d) => cloudReports.push(d.data() as InspectionReport));
            localStorage.setItem(STORAGE_KEYS.INSPECTOR_REPORTS, JSON.stringify(cloudReports));
          }
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'inspectionReports')
      );
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

      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(seededDocs));
      localStorage.setItem(STORAGE_KEYS.CHUNKS, JSON.stringify(seededChunks));
    }
  }

  // Document Operations
  public getDocuments(): DocumentItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
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
          title: 'Auditoría Técnica de Campo - Obra Estructura Norte',
          companyName: 'Constructora Austral S.A.',
          siteLocation: 'Obra Av. Libertador 4500, CABA',
          inspectorName: 'Ing. Carlos Mendoza',
          inspectorRegistration: 'Mat. CIPBA 48.912',
          date: '2026-08-01',
          gpsLocation: '-34.5781, -58.4263',
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
    const user = await ensureAuth();
    const token = await user.getIdToken();
    return {
      'x-user-id': user.uid,
      'Authorization': `Bearer ${token}`,
    };
  }

  // User Profile & Freemium Credits Engine
  public async getUserProfile(): Promise<UserProfile> {
    try {
      const user = await ensureAuth();
      const local = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.uid === user.uid) {
          return parsed;
        }
      }

      // Fetch from backend authority
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/user/profile', {
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        const profile: UserProfile = data.profile;
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
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
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(defaultProfile));
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
    const res = await fetch('/api/user/change-plan', {
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
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    return updated;
  }

  public async callAiApi<T>(endpoint: string, payload: any): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 402) {
      const errData = await response.json().catch(() => ({}));
      const error: any = new Error(errData.message || 'Has alcanzado el límite mensual de créditos para tu plan.');
      error.code = 'AI_CREDITS_EXHAUSTED';
      error.details = errData;
      throw error;
    }

    if (response.status === 429) {
      const errData = await response.json().catch(() => ({}));
      const error: any = new Error(errData.message || 'Demasiadas operaciones simultáneas. Espera un momento.');
      error.code = 'RATE_LIMIT_EXCEEDED';
      throw error;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `Error en el servidor de IA (HTTP ${response.status}).`);
    }

    return response.json();
  }
}

export const db = LocalSafetyDB.getInstance();
