export type ObligationStatus =
  | 'COMPLIANT'
  | 'PENDING'
  | 'OVERDUE'
  | 'NOT_APPLICABLE'
  | 'UNDER_REVIEW';

export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Info';

export type AlertType =
  | 'document_expiry'
  | 'training_due'
  | 'measurement_due'
  | 'inspection_due'
  | 'corrective_action_overdue'
  | 'worker_missing_training'
  | 'worker_missing_ppe'
  | 'normative_update';

export type RiskLevel = 'Trivial' | 'Tolerable' | 'Moderado' | 'Importante' | 'Intolerable';

export type CorrectiveActionStatus = 'pending' | 'in_progress' | 'completed' | 'verified';

export type AccidentType = 'workplace' | 'in_itinere' | 'occupational_disease' | 'near_miss';

export type NormType = 'Ley' | 'Decreto' | 'Resolucion_SRT' | 'Resolucion_MTEySS' | 'Disposicion' | 'Norma_IRAM' | 'Convenio';

// --- Normativa y Trazabilidad Jurídica ---

export interface OfficialSource {
  id: string;
  name: string; // Ej: "Boletín Oficial de la República Argentina", "InfoLeg", "SRT"
  url: string;
  organization: string; // Ej: "Superintendencia de Riesgos del Trabajo"
  lastCheckedDate: string;
  reliabilityScore: number;
}

export interface Regulation {
  id: string;
  title: string; // Ej: "Reglamento de Higiene y Seguridad en el Trabajo"
  normType: NormType;
  normNumber: string; // Ej: "Decreto 351/1979", "Ley 19.587", "Res. SRT 295/2003"
  year: number;
  jurisdiction: 'Nacional' | 'Provincial' | 'CABA' | 'Internacional';
  issuingAuthority: string; // Ej: "Poder Ejecutivo Nacional", "SRT"
  officialSourceId?: string;
  officialSourceUrl?: string;
  publicationDate?: string;
  status: 'Vigente' | 'Derogada' | 'Modificada_Parcialmente';
  summary?: string;
  activeVersion: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RegulationArticle {
  id: string;
  regulationId: string;
  regulationNormNumber: string; // Ej: "Dec. 351/79"
  chapter?: string; // Ej: "Capítulo 13 - Ruidos y Vibraciones"
  anexo?: string; // Ej: "Anexo V"
  articleNumber: string; // Ej: "Art. 85"
  title?: string;
  fullText: string;
  officialSourceUrl?: string;
  status: 'Vigente' | 'Derogado' | 'Modificado';
  version: string;
}

export interface Requirement {
  id: string;
  regulationId: string;
  regulationArticleId: string;
  legalCitation: string; // Ej: "Ley 19.587 Art. 9 inc b / Dec 351/79 Cap 13"
  title: string;
  description: string;
  category: 'EPP' | 'Capacitacion' | 'Medicion' | 'Documentacion' | 'Instalaciones' | 'Ergonomia' | 'Emergencias' | 'Examenes_Medicos_Administracion';
  applicabilityCondition: {
    industryCategories?: string[]; // Ej: ["industry", "construction"]
    requiresDangerousMachinery?: boolean;
    requiresNoiseExposure?: boolean;
    requiresForklifts?: boolean;
    minWorkers?: number;
    customRuleExpression?: string; // Regla declarativa evaluada por el Compliance Engine
  };
  periodicityDays?: number; // Ej: 365 para mediciones anuales, 180 para capacitaciones semestrales
  evidenceTypeRequired: 'Documento_PDF' | 'Protocolo_Firmado' | 'Planilla_Entrega_EPP' | 'Acta_Capacitacion' | 'Informe_Tecnico';
  version: string;
  createdAt: string;
}

// --- Compliance Engine: Obligación Concreta ---

export interface ComplianceObligation {
  id: string;
  orgId: string;
  companyId: string;
  establishmentId: string;
  requirementId: string;
  legalCitation: string;
  title: string;
  category: string;
  status: ObligationStatus;
  dueDate?: string;
  evidenceIds: string[]; // IDs de Document, InspectionReport, Measurement o PPEAssignment que sustentan el cumplimiento
  responsibleUserId?: string;
  generatedAt: string;
  evaluatedAt: string;
  sourceVersion: string;
  notes?: string;
}

// --- Prevención Operativa y Riesgos ---

export interface RiskAssessment {
  id: string;
  establishmentId: string;
  companyId: string;
  orgId: string;
  sectorId?: string;
  positionId?: string;
  evaluatorUid: string;
  evaluatorName?: string;
  assessmentDate: string;
  methodology: 'Fine' | 'NTP330' | 'Matriz_5x5' | 'INSHT';
  overallRiskLevel: RiskLevel;
  risksCount: number;
  status: 'draft' | 'approved' | 'superseded';
  createdAt: string;
  updatedAt?: string;
}

export interface Risk {
  id: string;
  assessmentId: string;
  establishmentId: string;
  companyId: string;
  orgId: string;
  hazardCategory: string; // Ej: "Mecánico", "Físico - Ruido", "Ergonómico", "Químico"
  riskDescription: string;
  probability: number;
  severity: number;
  riskScore: number;
  riskLevel: RiskLevel;
  applicableRegulationArticleId?: string;
  preventiveMeasuresDescription: string;
  suggestedPPEIds?: string[];
  createdAt: string;
}

export interface PPE {
  id: string;
  orgId: string;
  category: 'Cabeza' | 'Auditiva' | 'Ocular_Facial' | 'Respiratoria' | 'Manos_Brazos' | 'Pies_Piernas' | 'Caidas_Altura' | 'Indumentaria_Proteccion';
  name: string; // Ej: "Casco de seguridad Tipo 1 Clase B", "Protector auditivo de copa"
  standard: string; // Ej: "IRAM 3620", "EN 352-1"
  approvalCode?: string; // Sello IRAM / Certificado SRT Res. 896/99
  brandModel?: string;
  estimatedLifespanDays?: number;
  active: boolean;
  createdAt: string;
}

export interface PPEAssignment {
  id: string;
  employeeId: string;
  employeeCuil: string;
  employeeFullName: string;
  companyId: string;
  establishmentId: string;
  orgId: string;
  ppeId: string;
  ppeName: string;
  deliveryDate: string;
  renewalDueDate?: string;
  reason: 'Ingreso' | 'Renovacion_Periodica' | 'Deterioro' | 'Extravio';
  receiptDocumentUrl?: string; // Formulario Resolución SRT 299/11
  hasSignedReceipt: boolean;
  compliantWithRes299_11: boolean;
  deliveredByUid: string;
  createdAt: string;
}

export interface Training {
  id: string;
  companyId: string;
  establishmentId: string;
  orgId: string;
  topic: string; // Ej: "Uso seguro de extintores y plan de evacuación", "Riesgos en trabajo en altura"
  legalRequirementId?: string; // Enlace a Requirement
  durationMinutes: number;
  date: string;
  instructorName: string;
  instructorLicenseNumber?: string;
  totalAttendees: number;
  hasEvaluation: boolean;
  syllabusSummary?: string;
  createdAt: string;
}

export interface TrainingAttendance {
  id: string;
  trainingId: string;
  employeeId: string;
  companyId: string;
  orgId: string;
  attended: boolean;
  evaluationPassed?: boolean;
  evaluationScore?: number;
  certificateSigned: boolean;
}

export interface Measurement {
  id: string;
  establishmentId: string;
  companyId: string;
  orgId: string;
  protocolType: 'Ruido_Res_85_12' | 'Iluminacion_Res_84_12' | 'Puesta_A_Tierra_Res_900_15' | 'Ergonomia_Res_886_15' | 'Contaminantes_Quimicos' | 'Termico';
  measurementDate: string;
  equipmentModel?: string;
  equipmentCalibrationDate?: string;
  nextDueDate: string;
  measuredPointsCount: number;
  outOfCompliancePointsCount: number;
  protocolFileUrl?: string;
  evaluatorName: string;
  evaluatorLicenseNumber: string;
  status: 'compliant' | 'non_compliant' | 'observations_pending';
  createdAt: string;
}

export interface Inspection {
  id: string;
  establishmentId: string;
  companyId: string;
  orgId: string;
  inspectorUid: string;
  inspectorName: string;
  inspectorRegistration?: string;
  inspectionType: 'InspectorIA_Fotografico' | 'Checklist_General' | 'Auditoria_Reglamentaria' | 'Inspeccion_Sectorial';
  date: string;
  score: number; // 0 - 100
  totalFindings: number;
  criticalFindingsCount: number;
  status: 'draft' | 'completed' | 'reviewed';
  reportPdfUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InspectionFinding {
  id: string;
  inspectionId: string;
  establishmentId: string;
  companyId: string;
  orgId: string;
  category: string;
  description: string;
  riskLevel: RiskLevel;
  photoUrl?: string;
  legalCitation?: string;
  applicableRequirementId?: string;
  correctiveActionId?: string;
  createdAt: string;
}

export interface CorrectiveAction {
  id: string;
  companyId: string;
  establishmentId: string;
  orgId: string;
  sourceType: 'Inspection' | 'Measurement' | 'Accident_Investigation' | 'Compliance_Engine' | 'Direct';
  sourceId?: string;
  findingDescription: string;
  actionRequired: string;
  assignedResponsibleName: string;
  priority: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  deadlineDate: string;
  status: CorrectiveActionStatus;
  completionDate?: string;
  verificationDate?: string;
  verifiedByUid?: string;
  evidenceNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Accident {
  id: string;
  companyId: string;
  establishmentId: string;
  orgId: string;
  employeeId?: string;
  employeeFullName?: string;
  date: string;
  time?: string;
  accidentType: AccidentType;
  description: string;
  bodyPartAffected?: string;
  lostWorkdays: number;
  artNotificationDate?: string;
  artClaimNumber?: string;
  directCausesSummary?: string;
  rootCausesSummary?: string;
  investigationCompleted: boolean;
  correctiveActionIds?: string[];
  createdAt: string;
}

export interface Alert {
  id: string;
  orgId: string;
  companyId: string;
  establishmentId?: string;
  entityType: 'document' | 'training' | 'measurement' | 'inspection' | 'corrective_action' | 'employee_ppe' | 'compliance_obligation' | 'regulation';
  entityId: string;
  severity: AlertSeverity;
  alertType: AlertType;
  title: string;
  message: string;
  dueDate?: string;
  resolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

export interface CalendarTask {
  id: string;
  orgId: string;
  companyId: string;
  establishmentId?: string;
  title: string;
  description?: string;
  date: string;
  taskType: 'Measurement' | 'Training' | 'Inspection' | 'Audit' | 'Action_Deadline' | 'Contractor_Doc_Review';
  relatedEntityId?: string;
  completed: boolean;
  assignedUid?: string;
  createdAt: string;
}
