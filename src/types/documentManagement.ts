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
  | 'expired'
  | 'critical_7d'
  | 'urgent_15d'
  | 'warning_30d'
  | 'notice_90d'
  | 'valid'
  | 'no_expiry';

export type DocumentStatus = 'vigente' | 'por_vencer' | 'vencido' | 'archivado' | 'en_revision';

export interface DocumentVersionRecord {
  version: number;
  filename: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  hash: string;
  uploadedAt: string;
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
  companyName?: string;
  establishmentName?: string;
  employeeName?: string;
  employeeCuil?: string;
  title: string;
  category: DocumentCategory;
  subCategory?: string;
  documentNumber?: string;
  issueDate: string;
  expirationDate?: string;
  responsibleName: string;
  responsibleUid?: string;
  issuingOrganism?: string;
  status: DocumentStatus;
  filename: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  storagePath: string;
  hash: string;
  summary?: string;
  tags?: string[];
  notes?: string;
  version: number;
  versionHistory: DocumentVersionRecord[];
  isDeleted: boolean;
  deletedAt?: string;
  deletedByUid?: string;
  deletedByName?: string;
  createdAt: string;
  updatedAt: string;
  uploadedByUid?: string;
  uploadedByName?: string;
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
  /** Maximum number of documents to retrieve from Firestore. */
  limit?: number;
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
  date: string;
  eventType: 'expiration' | 'issue' | 'renewal';
  category: DocumentCategory;
  scope: DocumentScope;
  companyName?: string;
  establishmentName?: string;
  employeeName?: string;
  alertLevel: ExpirationAlertLevel;
  responsibleName: string;
}
