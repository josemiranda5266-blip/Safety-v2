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

export type OperationCostType = 'CHAT_RAG' | 'DOCUMENT_COMPARISON' | 'OCR' | 'IMAGE_ANALYSIS' | 'INSPECTOR_IA' | 'SUMMARY' | 'CHECKLIST';
export interface CreditTransaction { id: string; userId: string; operationType: OperationCostType; creditsDeducted: number; timestamp: string; success: boolean; details?: string; }
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired' | 'trial';
export interface UserSubscription { id: string; userId: string; plan: UserPlan; status: SubscriptionStatus; startDate: string; nextRenewalDate: string; provider?: 'manual' | 'mercadopago' | 'stripe'; externalSubscriptionId?: string; }
export type CategoryType = 'Ley' | 'Decreto' | 'Resolución SRT' | 'Norma IRAM' | 'Norma ISO' | 'Manual' | 'Procedimiento' | 'Instructivo' | 'Apunte' | 'Formulario' | 'Informe' | 'Otro';
export interface DocVersionInfo { version: number; uploadDate: string; fileSize: number; note?: string; }
export interface DocChunk { id: string; docId: string; docTitle: string; category: CategoryType; pageNumber: number; chapter?: string; section?: string; article?: string; text: string; uploadDate?: string; tags?: string[]; }
export interface DocumentItem { id: string; userId?: string; title: string; category: CategoryType; author: string; issuingOrganism?: string; uploadDate: string; documentDate: string; tags: string[]; content: string; pageCount: number; fileType: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'image'; fileSize: number; chunksCount: number; summary?: string; version: number; status: 'Vigente' | 'Derogado' | 'Reemplazado'; versionHistory?: DocVersionInfo[]; contentHash?: string; processingState?: 'indexed' | 'pending_ocr' | 'error' | 'incomplete'; }
export interface NormativeAlert { id: string; docId: string; docTitle: string; type: 'unindexed' | 'pending_ocr' | 'incomplete_metadata' | 'sync_failed'; message: string; createdAt: string; }
export interface LibraryStats { totalDocs: number; totalPages: number; totalChunks: number; embeddingsGenerated: number; spaceUsedBytes: number; lastSyncTimestamp: string; vigenteDocsCount: number; reemplazadoDocsCount: number; derogadoDocsCount: number; categoryBreakdown: { category: string; count: number }[]; yearBreakdown: { year: string; count: number }[]; queriesCount: number; alerts: NormativeAlert[]; }
export interface Citation { docTitle: string; pageNumber: number | string; category: CategoryType; chapter?: string; section?: string; article?: string; quotedText: string; }
export interface ChatMessage { id: string; sender: 'user' | 'ai'; text: string; timestamp: string; citations?: Citation[]; isFavorite?: boolean; responseTimeMs?: number; fromCache?: boolean; }
export interface ChatSession { id: string; title: string; createdAt: string; messages: ChatMessage[]; }
export interface RAGQueryLog { id: string; question: string; answer: string; documentsUsed: string[]; citations: Citation[]; timestamp: string; responseTimeMs: number; cached: boolean; }
export interface DocComparisonResult { id: string; docTitles: string[]; queryTopic?: string; summaryComparison: string; similarities: string[]; differences: string[]; normativeDetails: { docTitle: string; position: string; requirements: string }[]; date: string; }
export interface FavoriteItem { id: string; userId?: string; type: 'query' | 'response' | 'document' | 'checklist' | 'hazard_analysis' | 'comparison'; title: string; content: string; date: string; metadata?: any; }
export interface SummaryResult { id: string; docId?: string; docTitle: string; date: string; shortSummary: string; technicalSummary: string; keyPoints: string[]; legalObligations: string[]; recommendations: string[]; }
export type InspectionStatus = 'cumple' | 'no_cumple' | 'no_aplica';
export interface ChecklistItem { id: string; aspect: string; normativeRef: string; guidance: string; status?: InspectionStatus; notes?: string; }
export interface ChecklistTemplate { id: string; category: string; title: string; normativeReference: string; items: ChecklistItem[]; }
export interface ChecklistInspection { id: string; templateId: string; title: string; category: string; inspectorName: string; location: string; date: string; items: ChecklistItem[]; overallObservations?: string; }
export interface HazardItem { hazardName: string; severity: 'Bajo' | 'Medio' | 'Alto' | 'Crítico'; description: string; applicableNorm: string; preventiveAction: string; }
export interface HazardAnalysisResult { id: string; date: string; imagePreviewUrl?: string; activityDescription?: string; overallAssessment: string; riskLevel: 'Bajo' | 'Medio' | 'Alto' | 'Crítico'; hazards: HazardItem[]; recommendations: string[]; }
export type HazardCategory = 'EPP' | 'Altura' | 'Escaleras' | 'Eléctrico' | 'Incendio' | 'Orden y Limpieza' | 'Señalización' | 'Salidas de Emergencia' | 'Almacenamiento' | 'Ergonómico' | 'Mecánico' | 'Químico' | 'Biológico' | 'Otro';
export type RiskLevel = 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
export type FindingStatus = 'Pendiente' | 'En proceso' | 'Corregido';
export type VerificationStatus = 'verified' | 'unverified' | 'no_evidence';
export interface NormativeCitationRef { docTitle: string; pageNumber?: number | string; articleOrSection?: string; quotedText?: string; hasLibraryBackup: boolean; verificationStatus?: VerificationStatus; documentId?: string; chunkId?: string; }
export interface VerificationEvidence { id: string; photoUrl: string; date: string; notes: string; }
export interface InspectionFinding { id: string; photoUrl?: string; videoUrl?: string; timestamp: string; location?: { siteName?: string; coords?: { latitude: number; longitude: number } }; hazardCategory: HazardCategory; hazardTitle: string; riskLevel: RiskLevel; description: string; suggestedAction: string; status: FindingStatus; normativeCitation: NormativeCitationRef; verifications?: VerificationEvidence[]; closedDate?: string; closingNotes?: string; capaId?: string; }
export interface ActionPlanItem { id: string; findingId: string; task: string; responsible: string; deadline: string; status: FindingStatus; riskLevel: RiskLevel; }
export interface InspectionReport { id: string; organizationId: string; companyId?: string; establishmentId?: string; sectorId?: string; title: string; companyName: string; siteLocation: string; inspectorName: string; inspectorRegistration?: string; date: string; gpsLocation?: string | null; activityDescription?: string; executiveSummary: string; findings: InspectionFinding[]; appliedNorms: string[]; generalRecommendations: string[]; actionPlan: ActionPlanItem[]; inspectorSignatureUrl?: string; status: 'Borrador' | 'En Proceso' | 'Completada' | 'Cerrada'; createdBy?: string; createdByName?: string; createdAt: string; updatedAt: string; }
export interface InspectorStats { totalInspections: number; openInspections: number; completedInspections: number; totalFindings: number; pendingCritical: number; findingsByCategory: { category: string; count: number }[]; findingsByRisk: { risk: RiskLevel; count: number }[]; avgResolutionTimeDays: number; monthlyTrend: { month: string; inspectionsCount: number; findingsCount: number }[]; }
export interface Norma { id: string; norma: string; type: string; number: string; articleAnexo: string; topic: string; activity: string; risk: string; obligation: string; validity: string; modifications: string; repeal?: string; source: string; evidenceRequired: string; lastVerified: string; isVerified: boolean; }
export type ComplianceStatus = 'CUMPLE' | 'NO CUMPLE' | 'PENDIENTE' | 'NO APLICA' | 'REVISAR';
export interface LegalRequirement { id: string; companyId: string; normaId: string; status: ComplianceStatus; evidenceUrl?: string; lastChecked: string; notes: string; }
export interface AuditLog { id: string; action: string; entityType: 'EPP' | 'Training' | 'Document' | 'Worker' | 'Inspection' | 'IPER' | 'Incident' | 'Emergency' | 'Hygiene' | 'Normative' | 'Navigation'; entityId: string; userId: string; timestamp: string; details: any; }

export type HygieneInstrumentCategory = 'lighting' | 'noise' | 'grounding' | 'thermal_stress' | 'vibration' | 'chemical' | 'gas' | 'air_velocity' | 'electrical' | 'distance' | 'other';
export type HygieneInstrumentStatus = 'active' | 'maintenance' | 'calibration_due' | 'out_of_service' | 'retired';
export type HygieneMeasurementStatus = 'draft' | 'in_progress' | 'pending_review' | 'validated' | 'closed' | 'cancelled' | 'archived';
export interface HygieneInstrument { id: string; category: HygieneInstrumentCategory; instrumentType: string; brand: string; model: string; serialNumber: string; calibrationDate?: string; calibrationExpiry?: string; certificateUrl?: string; status: HygieneInstrumentStatus; notes?: string; active: boolean; createdBy?: string; createdAt?: string; updatedBy?: string; updatedAt?: string; }
export interface HygieneMeasurementContext { companyId: string; establishmentId: string; sectorId?: string; positionId?: string; employeeId?: string; }
export interface HygieneMeasurement { id: string; context: HygieneMeasurementContext; protocolType: string; measurementDate: string; instrumentIds: string[]; rawData?: Record<string, unknown>; normativeEvaluationSnapshot?: NormativeEvaluationSnapshot; notes?: string; status: HygieneMeasurementStatus; active: boolean; createdBy?: string; createdAt?: string; updatedBy?: string; updatedAt?: string; }
export interface CreateHygieneInstrumentInput { category: HygieneInstrumentCategory; instrumentType: string; brand: string; model: string; serialNumber: string; calibrationDate?: string; calibrationExpiry?: string; certificateUrl?: string; status?: HygieneInstrumentStatus; notes?: string; }
export interface CreateHygieneMeasurementInput { context: HygieneMeasurementContext; protocolType: string; measurementDate: string; instrumentIds: string[]; rawData?: Record<string, unknown>; notes?: string; }
export type HygieneProtocolType = 'lighting' | 'noise' | 'grounding' | 'thermal_stress' | 'vibration' | 'chemical';
export type LightingSourceType = 'natural' | 'artificial' | 'mixed';
export type LightingPointType = 'general' | 'work_surface' | 'task_area' | 'other';
export interface LightingMeasurementPoint { id: string; name: string; pointType: LightingPointType; lux: number; locationDescription?: string; observations?: string; }
export interface LightingMeasurementData {
  sourceType: LightingSourceType;
  lightingSystem?: string;
  taskDescription?: string;
  points: LightingMeasurementPoint[];
  averageLux?: number;
  minimumLux?: number;
  maximumLux?: number;
  /** Minimum illuminance used by the SRT uniformity criterion (lux), not a ratio. */
  uniformityMinimumLux?: number;
  /** @deprecated Kept only for backwards compatibility with previously persisted records; interpreted as minimum illuminance in lux, never as minimum/maximum. */
  uniformityRatio?: number;
  /** Derived informational ratio: minimum illuminance / average illuminance. */
  uniformityMinOverAverage?: number;
  /** Derived informational threshold: average illuminance / 2. */
  uniformityThresholdLux?: number;
  calculationVersion: string;
  calculatedAt?: string;
}
export interface CreateLightingMeasurementData { sourceType: LightingSourceType; lightingSystem?: string; taskDescription?: string; points: Array<Omit<LightingMeasurementPoint, 'id'>>; }
export interface HygieneProtocolEvaluation { protocolType: HygieneProtocolType; normativeReference?: string; normativeVersion?: string; sourceDocumentId?: string; evaluatedAt?: string; result?: 'pending' | 'informative' | 'requires_professional_review'; professionalConclusion?: string; }
export type NormativeRecordStatus = 'draft' | 'active' | 'superseded' | 'repealed' | 'archived';
export interface NormativeSource { issuingAuthority: string; documentTitle: string; officialUrl?: string; documentId?: string; publishedAt?: string; retrievedAt?: string; }
export interface NormativeCriterion { id: string; code: string; title: string; description?: string; unit?: string; parameters: Record<string, string | number | boolean>; applicability?: string; }
export interface NormativeProtocolVersion { id: string; protocolType: HygieneProtocolType; reference: string; title: string; version: string; status: NormativeRecordStatus; effectiveFrom?: string; effectiveTo?: string; source: NormativeSource; criteria: NormativeCriterion[]; notes?: string; createdAt: string; updatedAt: string; }
export interface NormativeEvaluationSnapshot { normativeProtocolVersionId: string; reference: string; version: string; evaluatedAt: string; selectedCriterionId?: string; criteriaSnapshot: NormativeCriterion[]; }
export interface Investigation { immediateCauses: string[]; basicCauses: string[]; contributingFactors: string[]; correctiveActions: string[]; investigator: string; date: string; }
export interface Incident { id: string; type: 'Accidente' | 'Incidente' | 'CasiAccidente'; workerId: string; workerName: string; date: string; time: string; location: string; task: string; bodyPart?: string; agent?: string; description: string; witnesses: string[]; photoUrls: string[]; medicalAttention: string; artInvolved: boolean; investigation?: Investigation; status: 'Abierto' | 'En Proceso' | 'Vencido' | 'Cerrado'; }
export interface EmergencyPlan { id: string; companyId: string; planName: string; scenarios: string[]; brigades: string[]; responsibles: string[]; resources: string[]; evacuationRoutes: string[]; assemblyPoints: string[]; drills: EmergencyDrill[]; }
export interface EmergencyDrill { id: string; date: string; scenario: string; participants: string[]; reportUrl?: string; }
