export type UserPlan = 'free' | 'pro' | 'pro_plus';
export type UserRole = 'professional' | 'empresa' | 'rrhh' | 'supervisor' | 'trabajador';

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  role: UserRole;
  plan: UserPlan;
  monthlyCredits: number;
  creditsUsed: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  createdAt: string;
  updatedAt?: string;
}

export type OperationCostType =
  | 'CHAT_RAG'
  | 'DOCUMENT_COMPARISON'
  | 'OCR'
  | 'IMAGE_ANALYSIS'
  | 'INSPECTOR_IA'
  | 'SUMMARY'
  | 'CHECKLIST';

export interface CreditTransaction {
  id: string;
  userId: string;
  operationType: OperationCostType;
  creditsDeducted: number;
  timestamp: string;
  success: boolean;
  details?: string;
}

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired' | 'trial';

export interface UserSubscription {
  id: string;
  userId: string;
  plan: UserPlan;
  status: SubscriptionStatus;
  startDate: string;
  nextRenewalDate: string;
  provider?: 'manual' | 'mercadopago' | 'stripe';
  externalSubscriptionId?: string;
}

export type CategoryType = 
  | 'Ley' 
  | 'Decreto' 
  | 'Resolución SRT' 
  | 'Norma IRAM' 
  | 'Norma ISO' 
  | 'Manual' 
  | 'Procedimiento' 
  | 'Instructivo' 
  | 'Apunte' 
  | 'Formulario' 
  | 'Informe' 
  | 'Otro';

export interface DocVersionInfo {
  version: number;
  uploadDate: string;
  fileSize: number;
  note?: string;
}

export interface DocChunk {
  id: string;
  docId: string;
  docTitle: string;
  category: CategoryType;
  pageNumber: number;
  chapter?: string;
  section?: string;
  article?: string;
  text: string;
  uploadDate?: string;
  tags?: string[];
}

export interface DocumentItem {
  id: string;
  userId?: string;
  title: string;
  category: CategoryType;
  author: string;
  issuingOrganism?: string; // SRT, Poder Ejecutivo, IRAM, ISO, etc.
  uploadDate: string; // ISO String
  documentDate: string; // Fecha de la norma/documento
  tags: string[];
  content: string;
  pageCount: number;
  fileType: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'image';
  fileSize: number; // in bytes
  chunksCount: number;
  summary?: string;
  version: number;
  status: 'Vigente' | 'Derogado' | 'Reemplazado';
  versionHistory?: DocVersionInfo[];
  contentHash?: string;
  processingState?: 'indexed' | 'pending_ocr' | 'error' | 'incomplete';
}

export interface NormativeAlert {
  id: string;
  docId: string;
  docTitle: string;
  type: 'unindexed' | 'pending_ocr' | 'incomplete_metadata' | 'sync_failed';
  message: string;
  createdAt: string;
}

export interface LibraryStats {
  totalDocs: number;
  totalPages: number;
  totalChunks: number;
  embeddingsGenerated: number;
  spaceUsedBytes: number;
  lastSyncTimestamp: string;
  vigenteDocsCount: number;
  reemplazadoDocsCount: number;
  derogadoDocsCount: number;
  categoryBreakdown: { category: string; count: number }[];
  yearBreakdown: { year: string; count: number }[];
  queriesCount: number;
  alerts: NormativeAlert[];
}

export interface Citation {
  docTitle: string;
  pageNumber: number | string;
  category: CategoryType;
  chapter?: string;
  section?: string;
  article?: string;
  quotedText: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  citations?: Citation[];
  isFavorite?: boolean;
  responseTimeMs?: number;
  fromCache?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface RAGQueryLog {
  id: string;
  question: string;
  answer: string;
  documentsUsed: string[];
  citations: Citation[];
  timestamp: string;
  responseTimeMs: number;
  cached: boolean;
}

export interface DocComparisonResult {
  id: string;
  docTitles: string[];
  queryTopic?: string;
  summaryComparison: string;
  similarities: string[];
  differences: string[];
  normativeDetails: {
    docTitle: string;
    position: string;
    requirements: string;
  }[];
  date: string;
}

export interface FavoriteItem {
  id: string;
  userId?: string;
  type: 'query' | 'response' | 'document' | 'checklist' | 'hazard_analysis' | 'comparison';
  title: string;
  content: string;
  date: string;
  metadata?: any;
}

export interface SummaryResult {
  id: string;
  docId?: string;
  docTitle: string;
  date: string;
  shortSummary: string;
  technicalSummary: string;
  keyPoints: string[];
  legalObligations: string[];
  recommendations: string[];
}

export type InspectionStatus = 'cumple' | 'no_cumple' | 'no_aplica';

export interface ChecklistItem {
  id: string;
  aspect: string;
  normativeRef: string;
  guidance: string;
  status?: InspectionStatus;
  notes?: string;
}

export interface ChecklistTemplate {
  id: string;
  category: string;
  title: string;
  normativeReference: string;
  items: ChecklistItem[];
}

export interface ChecklistInspection {
  id: string;
  templateId: string;
  title: string;
  category: string;
  inspectorName: string;
  location: string;
  date: string;
  items: ChecklistItem[];
  overallObservations?: string;
}

export interface HazardItem {
  hazardName: string;
  severity: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  description: string;
  applicableNorm: string;
  preventiveAction: string;
}

export interface HazardAnalysisResult {
  id: string;
  date: string;
  imagePreviewUrl?: string;
  activityDescription?: string;
  overallAssessment: string;
  riskLevel: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  hazards: HazardItem[];
  recommendations: string[];
}

// ----------------------------------------------------
// INSPECTOR IA - ANÁLISIS VISUAL Y REPORTES DE CAMPO
// ----------------------------------------------------

export type HazardCategory =
  | 'EPP'
  | 'Altura'
  | 'Escaleras'
  | 'Eléctrico'
  | 'Incendio'
  | 'Orden y Limpieza'
  | 'Señalización'
  | 'Salidas de Emergencia'
  | 'Almacenamiento'
  | 'Ergonómico'
  | 'Mecánico'
  | 'Químico'
  | 'Biológico'
  | 'Otro';

export type RiskLevel = 'Bajo' | 'Medio' | 'Alto' | 'Crítico';

export type FindingStatus = 'Pendiente' | 'En proceso' | 'Corregido';

export type VerificationStatus = 'verified' | 'unverified' | 'no_evidence';

export interface NormativeCitationRef {
  docTitle: string;
  pageNumber?: number | string;
  articleOrSection?: string;
  quotedText?: string;
  hasLibraryBackup: boolean; // false si no existe respaldo documental en la biblioteca
  verificationStatus?: VerificationStatus; // 'verified' | 'unverified' | 'no_evidence'
  documentId?: string;
  chunkId?: string;
}

export interface VerificationEvidence {
  id: string;
  photoUrl: string;
  date: string;
  notes: string;
}

export interface InspectionFinding {
  id: string;
  photoUrl?: string;
  videoUrl?: string;
  timestamp: string;
  location?: {
    siteName?: string;
    coords?: { latitude: number; longitude: number };
  };
  hazardCategory: HazardCategory;
  hazardTitle: string;
  riskLevel: RiskLevel;
  description: string;
  suggestedAction: string;
  status: FindingStatus;
  normativeCitation: NormativeCitationRef;
  verifications?: VerificationEvidence[];
  closedDate?: string;
  closingNotes?: string;
  capaId?: string;
}

export interface ActionPlanItem {
  id: string;
  findingId: string;
  task: string;
  responsible: string;
  deadline: string;
  status: FindingStatus;
  riskLevel: RiskLevel;
}

export interface InspectionReport {
  id: string;
  organizationId: string;
  companyId?: string;
  establishmentId?: string;
  sectorId?: string;
  title: string;
  companyName: string;
  siteLocation: string;
  inspectorName: string;
  inspectorRegistration?: string;
  date: string;
  gpsLocation?: string | null;
  activityDescription?: string;
  executiveSummary: string;
  findings: InspectionFinding[];
  appliedNorms: string[];
  generalRecommendations: string[];
  actionPlan: ActionPlanItem[];
  inspectorSignatureUrl?: string;
  status: 'Borrador' | 'En Proceso' | 'Completada' | 'Cerrada';
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ... existing content ...

export interface InspectorStats {
  totalInspections: number;
  openInspections: number;
  completedInspections: number;
  totalFindings: number;
  pendingCritical: number;
  findingsByCategory: { category: string; count: number }[];
  findingsByRisk: { risk: RiskLevel; count: number }[];
  avgResolutionTimeDays: number;
  monthlyTrend: { month: string; inspectionsCount: number; findingsCount: number }[];
}

// ----------------------------------------------------
// EPP Y CAPACITACIONES
// ----------------------------------------------------

export interface Norma {
  id: string;
  norma: string;
  type: string;
  number: string;
  articleAnexo: string;
  topic: string;
  activity: string;
  risk: string;
  obligation: string;
  validity: string;
  modifications: string;
  repeal?: string;
  source: string;
  evidenceRequired: string;
  lastVerified: string;
  isVerified: boolean;
}

export type ComplianceStatus = 'CUMPLE' | 'NO CUMPLE' | 'PENDIENTE' | 'NO APLICA' | 'REVISAR';

export interface LegalRequirement {
  id: string;
  companyId: string;
  normaId: string;
  status: ComplianceStatus;
  evidenceUrl?: string;
  lastChecked: string;
  notes: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'EPP' | 'Training' | 'Document' | 'Worker' | 'Inspection' | 'IPER' | 'Incident' | 'Emergency' | 'Hygiene' | 'Normative' | 'Navigation';
  entityId: string;
  userId: string;
  timestamp: string;
  details: any;
}

export interface HygieneInstrument {
  id: string;
  brand: string;
  model: string;
  serialNumber: string;
  calibrationDate: string;
  calibrationExpiry: string;
  certificateUrl: string;
}

export interface HygieneMeasurement {
  id: string;
  companyId: string;
  establishmentId: string;
  sectorId: string;
  jobPositionId: string;
  agent: string;
  instrumentId: string;
  date: string;
  value: number;
  unit: string;
  applicableLimit: number;
  result: 'Aceptable' | 'No Aceptable';
  professionalName: string;
  reportUrl?: string;
  certificateUrl?: string;
}

export interface Investigation {
  immediateCauses: string[];
  basicCauses: string[];
  contributingFactors: string[];
  correctiveActions: string[];
  investigator: string;
  date: string;
}

export interface Incident {
  id: string;
  type: 'Accidente' | 'Incidente' | 'CasiAccidente';
  workerId: string;
  workerName: string;
  date: string;
  time: string;
  location: string;
  task: string;
  bodyPart?: string;
  agent?: string;
  description: string;
  witnesses: string[];
  photoUrls: string[];
  medicalAttention: string;
  artInvolved: boolean;
  investigation?: Investigation;
  status: 'Abierto' | 'En Proceso' | 'Vencido' | 'Cerrado';
}

export interface EmergencyPlan {
  id: string;
  companyId: string;
  planName: string;
  scenarios: string[];
  brigades: string[];
  responsibles: string[];
  resources: string[];
  evacuationRoutes: string[];
  assemblyPoints: string[];
  drills: EmergencyDrill[];
}

export interface EmergencyDrill {
  id: string;
  date: string;
  scenario: string;
  participants: string[];
  reportUrl?: string;
}

export interface Inspection {
  id: string;
  companyId: string;
  establishmentId: string;
  sectorId: string;
  date: string;
  type: string;
  status: 'Open' | 'In Progress' | 'Closed';
  findings: Finding[];
}

export interface Finding {
  id: string;
  description: string;
  hazard: string;
  risk: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  photoUrl?: string;
  location: string;
  responsible: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Overdue' | 'Closed';
  evidenceUrl?: string;
}

export interface EPPItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface EPPAssignment {
  id: string;
  workerId: string;
  workerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  date: string;
  status: 'Entregado' | 'En uso' | 'Devuelto' | 'Desgastado';
  renewalDate?: string;
  observations?: string;
  signatureUrl?: string;
}

export interface TrainingActivity {
  id: string;
  programId: string;
  topic: string;
  date: string;
  durationHours: number;
  trainer: string;
  establishmentId: string;
  establishmentName: string;
  attendees: {
    workerId: string;
    workerName: string;
    attended: boolean;
    signatureUrl?: string;
  }[];
}

export type RiskLevelValue = 1 | 2 | 3 | 4 | 5;
export type SeverityValue = 1 | 2 | 3 | 4;

export interface RiskEvaluation {
  probability: RiskLevelValue;
  severity: SeverityValue;
  level: number;
}

export interface ControlMeasures {
  elimination: string[];
  substitution: string[];
  engineering: string[];
  administrative: string[];
  ppe: string[];
}

export interface IPEREntry {
  id: string;
  taskId: string;
  taskName: string;
  hazard: string;
  risk: string;
  initialEvaluation: RiskEvaluation;
  controls: ControlMeasures;
  residualEvaluation: RiskEvaluation;
  approved?: boolean;
}

export interface IPERVersion {
  version: number;
  author: string;
  date: string;
  changes: string;
  entries: IPEREntry[];
}

export interface IPERMatrix {
  id: string;
  companyId: string;
  establishmentId: string;
  sectorId: string;
  versions: IPERVersion[];
  currentVersion: number;
}

