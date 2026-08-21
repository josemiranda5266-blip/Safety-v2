export type DocumentCategory =
  | 'ART'
  | 'Legajo empresa'
  | 'Trabajadores'
  | 'EPP'
  | 'Capacitaciones'
  | 'Inspecciones'
  | 'Mediciones'
  | 'Procedimientos'
  | 'Informes'
  | 'Emergencias'
  | 'Matriz de riesgos'
  | 'Organismos';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'ART',
  'Legajo empresa',
  'Trabajadores',
  'EPP',
  'Capacitaciones',
  'Inspecciones',
  'Mediciones',
  'Procedimientos',
  'Informes',
  'Emergencias',
  'Matriz de riesgos',
  'Organismos',
];

export type DocumentScope = 'company' | 'establishment' | 'employee' | 'organization';

export type ExpirationAlertLevel =
  | 'expired'      // Vencido (< 0 días)
  | 'critical_7d'  // Crítico (<= 7 días)
  | 'urgent_15d'   // Urgente (<= 15 días)
  | 'warning_30d'  // Atención (<= 30 días)
  | 'notice_90d'   // Alerta temprana (<= 90 días)
  | 'valid'        // Vigente (> 90 días)
  | 'no_expiry';   // Permanente / Sin vencimiento

export type DocumentStatus = 'vigente' | 'por_vencer' | 'vencido' | 'archivado' | 'en_revision';

export interface DocumentVersionRecord {
  version: number;
  filename: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  hash: string;
  uploadedAt: string; // ISO 8601 string
  uploadedByUid?: string;
  uploadedByName?: string;
  issueDate?: string;
  expirationDate?: string;
  changeNotes?: string;
}

export interface ProfessionalDocument {
  id: string;
  orgId: string;
  scope: DocumentScope;
  companyId?: string;
  establishmentId?: string;
  employeeId?: string;
  
  // Relational display names (enriched for fast UI display)
  companyName?: string;
  establishmentName?: string;
  employeeName?: string;
  employeeCuil?: string;

  title: string;
  category: DocumentCategory;
  subCategory?: string;
  documentNumber?: string; // N° de Póliza, Certificado, Protocolo de Medición, etc.
  
  issueDate: string; // ISO 8601 string (Fecha de emisión / inicio de vigencia)
  expirationDate?: string; // ISO 8601 string (Fecha de vencimiento / renovación)
  
  responsibleName: string; // Nombre del profesional / emisor / técnico responsable
  responsibleUid?: string;
  issuingOrganism?: string; // ART, SRT, Municipalidad, IRAM, OPDS, Bomberos, etc.

  status: DocumentStatus;
  
  // File attributes
  filename: string;
  fileSize: number;
  mimeType: string;
  fileType: string; // pdf, docx, xlsx, txt
  storagePath: string;
  hash: string; // SHA-256

  summary?: string;
  tags?: string[];
  notes?: string;

  // Versioning
  version: number;
  versionHistory: DocumentVersionRecord[];

  // Soft delete audit
  isDeleted: boolean;
  deletedAt?: string;
  deletedByUid?: string;
  deletedByName?: string;

  // Audit
  createdAt: string;
  updatedAt: string;
  uploadedByUid?: string;
  uploadedByName?: string;

  // Computed fields (by backend or frontend helper)
  daysUntilExpiration?: number | null;
  expirationAlertLevel?: ExpirationAlertLevel;
}

export interface DocumentFilterOptions {
  scope?: DocumentScope | 'all';
  companyId?: string;
  establishmentId?: string;
  employeeId?: string;
  category?: DocumentCategory | 'all';
  alertLevel?: ExpirationAlertLevel | 'all';
  status?: DocumentStatus | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  includeDeleted?: boolean;
}

export interface DocumentDashboardMetrics {
  totalDocuments: number;
  activeDocuments: number;
  expiredCount: number;
  critical7dCount: number;
  urgent15dCount: number;
  warning30dCount: number;
  notice90dCount: number;
  validCount: number;
  noExpiryCount: number;
  
  byCategory: Record<DocumentCategory, number>;
  byScope: {
    company: number;
    establishment: number;
    employee: number;
    organization: number;
  };
  byCompany: {
    companyId: string;
    companyName: string;
    total: number;
    expired: number;
    expiringSoon: number;
  }[];
}

export interface DocumentCalendarEvent {
  id: string;
  documentId: string;
  title: string;
  date: string; // YYYY-MM-DD
  eventType: 'expiration' | 'issue' | 'renewal';
  category: DocumentCategory;
  scope: DocumentScope;
  companyName?: string;
  establishmentName?: string;
  employeeName?: string;
  alertLevel: ExpirationAlertLevel;
  responsibleName: string;
}
