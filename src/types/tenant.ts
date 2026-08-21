// Temporal consistency: All timestamps are ISO 8601 strings (UTC) in this phase.
// The future persistence layer will convert between Firestore Timestamp <-> ISO string.

export type PlatformUserRole =
  | 'platform_admin'
  | 'consultant_admin'
  | 'professional'
  | 'auditor_read_only';

export type MembershipRole = 'owner' | 'admin' | 'member' | 'auditor';

export type UserPlanTier = 'free' | 'pro' | 'pro_plus' | 'enterprise';

export interface UserProfileV2 {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  professionalLicenseNumber?: string; // Matrícula profesional H&S
  role: PlatformUserRole;
  activeOrgId?: string;
  createdAt: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}

export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string; // CUIT en Argentina
  ownerUid: string;
  plan: UserPlanTier;
  planStatus: 'active' | 'trial' | 'past_due' | 'cancelled';
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  createdAt: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}

export interface Membership {
  id: string;
  orgId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  role: MembershipRole;
  assignedCompanyIds?: string[]; // Si está vacío o undefined, tiene alcance a todas las empresas de la Org
  active: boolean;
  invitedAt: string; // ISO 8601 string
  joinedAt?: string; // ISO 8601 string
}

export interface Company {
  id: string;
  orgId: string;
  legalName: string; // Razón Social
  tradeName?: string; // Nombre Fantasía
  cuit: string;
  ciiuCode?: string; // Código de actividad económica AFIP / SRT
  activityDescription?: string;
  artInsuranceName?: string; // Aseguradora de Riesgos del Trabajo
  artPolicyNumber?: string;
  isLegacyMigrated?: boolean; // Marca para identificar empresas migradas desde V1
  active: boolean;
  createdAt: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}

export interface Establishment {
  id: string;
  companyId: string;
  orgId: string;
  name: string; // Ej: "Planta Industrial Zárate", "Obra Torre Alvear"
  code?: string; // Número de sucursal o establecimiento SRT
  address: string;
  city: string;
  province: string;
  country: string;
  postalCode?: string;
  surfaceM2?: number;
  totalWorkers?: number;
  installedPowerKW?: number;
  isConstructionSite?: boolean;
  isLegacyMigrated?: boolean;
  active: boolean;
  createdAt: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}

export interface Sector {
  id: string;
  establishmentId: string;
  companyId: string;
  orgId: string;
  name: string; // Ej: "Mecanizado", "Depósito de Inflamables", "Oficinas"
  description?: string;
  responsibleName?: string;
  noiseLevelEstimatedDBA?: number;
  requiresSpecificPPE?: boolean;
  createdAt: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}

export interface Position {
  id: string;
  sectorId: string;
  establishmentId: string;
  companyId: string;
  orgId: string;
  title: string; // Ej: "Operador de Autoelevador", "Soldador TIG"
  description?: string;
  standardRequiredPPEIds?: string[]; // IDs de catálogo de EPP requerido por defecto
  requiresAnnualAudiometry?: boolean;
  requiresRespiratoryProtection?: boolean;
  createdAt: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}

export type EmployeeShift = 'morning' | 'afternoon' | 'night' | 'rotating' | 'custom';

export type MedicalFitnessStatus = 'fit' | 'fit_with_restrictions' | 'unfit' | 'pending';

export type MedicalExamType = 'pre_occupational' | 'periodic' | 'post_absence' | 'transfer' | 'exit';

export interface MedicalFitnessRecord {
  status: MedicalFitnessStatus;
  examDate?: string; // ISO 8601 string
  expirationDate?: string; // ISO 8601 string
  examType?: MedicalExamType;
  restrictions?: string[]; // Ej: "Sin trabajo en altura", "Levantamiento máx 15kg", "Uso obligatorio de lentes correctivos"
  issuingDoctorOrClinic?: string;
  certificateNumber?: string;
  notes?: string;
}

export interface EmployeePpeDelivery {
  id: string;
  itemType: string; // Ej: "Calzado de Seguridad Dieléctrico", "Casco Clase B", "Protector Auditivo Copa", "Guantes de Nitrilo", "Arnés de Seguridad Integral"
  brandModel?: string;
  standardOrCertification?: string; // Sello IRAM / Certificado SRT
  deliveryDate: string; // ISO 8601 string
  renewalDate?: string; // ISO 8601 string
  quantity: number;
  receiptSigned: boolean;
  status: 'active' | 'renewed' | 'expired' | 'damaged' | 'returned';
  deliveredBy?: string;
  notes?: string;
}

export interface EmployeeTrainingRecord {
  id: string;
  title: string; // Ej: "Inducción General a la Planta", "Manejo Seguro de Autoelevadores", "Uso y Mantenimiento de EPP"
  topic?: string; // Ergonomía, Químicos, Incendios, etc.
  trainingDate: string; // ISO 8601 string
  durationHours: number;
  instructorName?: string;
  institution?: string;
  scoreOrGrade?: string;
  certificationIssued: boolean;
  status: 'attended' | 'certified' | 'pending_evaluation' | 'absent';
  notes?: string;
}

export interface EmployeeAccidentRecord {
  id: string;
  type: 'accident' | 'incident' | 'unsafe_act' | 'occupational_disease';
  eventDate: string; // ISO 8601 string
  severity: 'first_aid' | 'minor_medical' | 'lost_time' | 'severe' | 'near_miss' | 'fatal';
  description: string;
  locationDetails?: string; // Ej: "Línea 2 Nave A - Sector Mecanizado"
  bodyPartAffected?: string; // Ej: "Mano derecha", "Zona lumbar"
  lostDaysCount?: number;
  daysOffWork?: number;
  artReportNumber?: string; // N° de Denuncia de Siniestro ART
  status: 'reported' | 'under_investigation' | 'closed';
  correctiveActionPlanId?: string;
  investigatorName?: string;
  notes?: string;
}

export interface EmployeeDocumentRecord {
  id: string;
  title: string;
  category: 'medical_fitness' | 'induction' | 'afip_alta' | 'ppe_receipt' | 'training_certificate' | 'license_permit' | 'affidavit' | 'other';
  issueDate?: string; // ISO 8601 string
  expirationDate?: string; // ISO 8601 string
  fileUrl?: string;
  fileName?: string;
  status: 'valid' | 'expired' | 'pending_renewal' | 'archived';
  notes?: string;
}

export interface EmployeeHistoryRecord {
  id: string;
  date: string; // ISO 8601 string
  eventType: 'hire' | 'transfer' | 'promotion' | 'shift_change' | 'sector_change' | 'position_change' | 'status_change' | 'rehire' | 'termination';
  previousPositionId?: string;
  newPositionId?: string;
  previousPositionTitle?: string;
  newPositionTitle?: string;
  previousSectorId?: string;
  newSectorId?: string;
  previousSectorName?: string;
  newSectorName?: string;
  previousShift?: EmployeeShift;
  newShift?: EmployeeShift;
  reason?: string;
  registeredBy?: string;
}

export type TimelineEventType = 
  | 'hire' 
  | 'induction' 
  | 'ppe_delivery' 
  | 'training' 
  | 'inspection' 
  | 'ppe_renewal' 
  | 'accident' 
  | 'incident' 
  | 'medical_exam' 
  | 'transfer' 
  | 'termination' 
  | 'observation';

export interface EmployeeTimelineEvent {
  id: string;
  employeeId: string;
  type: TimelineEventType;
  date: string; // ISO 8601 string
  title: string;
  description?: string;
  badge?: string;
  severity?: 'normal' | 'warning' | 'danger' | 'success';
  authorName?: string;
  relatedEntityId?: string;
  metadata?: Record<string, any>;
}

export interface Employee {
  id: string;
  companyId: string;
  establishmentId: string;
  sectorId?: string;
  positionId?: string;
  orgId: string;
  cuil: string;
  dni?: string;
  firstName: string;
  lastName: string;
  hireDate?: string; // ISO 8601 string
  shift?: EmployeeShift;
  category?: string; // Categoría laboral / CCT (ej: "Oficial Especializado")
  active: boolean;
  terminationDate?: string; // ISO 8601 string (baja lógica)
  terminationReason?: string;
  isContractorStaff?: boolean;
  contractorId?: string;
  associatedRisks?: string[]; // Lista de riesgos: ["Ruido", "Ergonomía", "Altura", "Químico", "Eléctrico", "Mecánico"]
  medicalFitness?: MedicalFitnessRecord;
  ppeDeliveries?: EmployeePpeDelivery[];
  trainings?: EmployeeTrainingRecord[];
  accidents?: EmployeeAccidentRecord[];
  documents?: EmployeeDocumentRecord[];
  history?: EmployeeHistoryRecord[];
  timeline?: EmployeeTimelineEvent[];
  notes?: string; // Observaciones de seguimiento técnico H&S
  createdAt: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}

export interface Contractor {
  id: string;
  companyId: string; // Empresa principal contratante
  orgId: string;
  businessName: string;
  cuit: string;
  activityDescription: string;
  artInsuranceName: string;
  artCertificateExpiryDate: string; // Vencimiento de nómina y cobertura con cláusula de no repetición (ISO 8601)
  lifeInsuranceExpiryDate?: string; // ISO 8601 string
  authorizedWorkerCount?: number;
  complianceStatus: 'compliant' | 'missing_documentation' | 'expired_insurance' | 'blocked';
  notes?: string;
  createdAt: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
}

export interface ActivityProfile {
  id: string;
  companyId: string;
  establishmentId: string;
  orgId: string;
  ciiuCode: string;
  industryCategory: 'industry' | 'construction' | 'agriculture' | 'mining' | 'services' | 'commerce' | 'other';
  hasDangerousMachinery: boolean;
  hasChemicalSubstances: boolean;
  hasNoiseExposure: boolean;
  hasHeightWork: boolean;
  hasConfinedSpaces: boolean;
  hasElectricalHighVoltage: boolean;
  hasFlammablesStorage: boolean;
  hasForklifts: boolean;
  hasBoilersOrPressureVessels: boolean;
  evaluatedAt: string; // ISO 8601 string
  evaluatedByUserId: string;
}
