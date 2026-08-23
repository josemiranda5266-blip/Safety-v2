import {
  ProfessionalDocument,
  DocumentFilterOptions,
  DocumentDashboardMetrics,
  DocumentCalendarEvent,
  DocumentCategory,
  DocumentScope,
} from '../types/documentManagement';
import { enrichDocumentWithExpiration } from '../utils/expirationEngine';
import { buildApiUrl } from '../utils/apiConfig';

// In-memory fallback for local prototype testing when offline
const localFallbackDocuments: ProfessionalDocument[] = [];

/**
 * Client service to communicate with the professional document management API endpoints.
 */
export const documentManagementService = {
  /**
   * Fetches list of documents with optional filtering.
   */
  async getDocuments(filters?: DocumentFilterOptions): Promise<ProfessionalDocument[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.scope && filters.scope !== 'all') params.append('scope', filters.scope);
      if (filters?.companyId) params.append('companyId', filters.companyId);
      if (filters?.establishmentId) params.append('establishmentId', filters.establishmentId);
      if (filters?.employeeId) params.append('employeeId', filters.employeeId);
      if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters?.alertLevel && filters.alertLevel !== 'all') params.append('alertLevel', filters.alertLevel);
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.searchQuery) params.append('search', filters.searchQuery);
      if (filters?.includeDeleted) params.append('includeDeleted', 'true');

      const res = await fetch(buildApiUrl(`/v2/documents?${params.toString()}`));
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      return (data.documents || []).map((doc: ProfessionalDocument) => enrichDocumentWithExpiration(doc));
    } catch (err) {
      console.warn('[DocService] Error fetching from backend, using local store:', err);
      let list = localFallbackDocuments.map((d) => enrichDocumentWithExpiration(d));
      if (!filters?.includeDeleted) {
        list = list.filter((d) => !d.isDeleted);
      }
      if (filters?.companyId) {
        list = list.filter((d) => d.companyId === filters.companyId);
      }
      if (filters?.establishmentId) {
        list = list.filter((d) => d.establishmentId === filters.establishmentId);
      }
      if (filters?.employeeId) {
        list = list.filter((d) => d.employeeId === filters.employeeId);
      }
      if (filters?.category && filters.category !== 'all') {
        list = list.filter((d) => d.category === filters.category);
      }
      if (filters?.alertLevel && filters.alertLevel !== 'all') {
        list = list.filter((d) => d.expirationAlertLevel === filters.alertLevel);
      }
      if (filters?.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        list = list.filter((d) => d.title.toLowerCase().includes(q) || d.filename.toLowerCase().includes(q));
      }
      return list;
    }
  },

  /**
   * Fetches consolidated dashboard metrics.
   */
  async getDashboardMetrics(): Promise<DocumentDashboardMetrics> {
    try {
      const res = await fetch(buildApiUrl('/v2/documents/metrics'));
      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }
      const data = await res.json();
      return data.metrics;
    } catch (err) {
      console.warn('[DocService] Using local calculation for metrics:', err);
      const docs = localFallbackDocuments.filter((d) => !d.isDeleted).map((d) => enrichDocumentWithExpiration(d));
      
      const metrics: DocumentDashboardMetrics = {
        totalDocuments: docs.length,
        activeDocuments: docs.length,
        expiredCount: docs.filter((d) => d.expirationAlertLevel === 'expired').length,
        critical7dCount: docs.filter((d) => d.expirationAlertLevel === 'critical_7d').length,
        urgent15dCount: docs.filter((d) => d.expirationAlertLevel === 'urgent_15d').length,
        warning30dCount: docs.filter((d) => d.expirationAlertLevel === 'warning_30d').length,
        notice90dCount: docs.filter((d) => d.expirationAlertLevel === 'notice_90d').length,
        validCount: docs.filter((d) => d.expirationAlertLevel === 'valid').length,
        noExpiryCount: docs.filter((d) => d.expirationAlertLevel === 'no_expiry').length,
        byCategory: {
          'ART': docs.filter((d) => d.category === 'ART').length,
          'Legajo empresa': docs.filter((d) => d.category === 'Legajo empresa').length,
          'Trabajadores': docs.filter((d) => d.category === 'Trabajadores').length,
          'EPP': docs.filter((d) => d.category === 'EPP').length,
          'Capacitaciones': docs.filter((d) => d.category === 'Capacitaciones').length,
          'Inspecciones': docs.filter((d) => d.category === 'Inspecciones').length,
          'Mediciones': docs.filter((d) => d.category === 'Mediciones').length,
          'Procedimientos': docs.filter((d) => d.category === 'Procedimientos').length,
          'Informes': docs.filter((d) => d.category === 'Informes').length,
          'Emergencias': docs.filter((d) => d.category === 'Emergencias').length,
          'Matriz de riesgos': docs.filter((d) => d.category === 'Matriz de riesgos').length,
          'Organismos': docs.filter((d) => d.category === 'Organismos').length,
        },
        byScope: {
          company: docs.filter((d) => d.scope === 'company').length,
          establishment: docs.filter((d) => d.scope === 'establishment').length,
          employee: docs.filter((d) => d.scope === 'employee').length,
          organization: docs.filter((d) => d.scope === 'organization').length,
        },
        byCompany: [],
      };
      return metrics;
    }
  },

  /**
   * Fetches active expiration alerts.
   */
  async getAlerts(): Promise<ProfessionalDocument[]> {
    try {
      const res = await fetch(buildApiUrl('/v2/documents/alerts'));
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      return (data.alerts || []).map((d: ProfessionalDocument) => enrichDocumentWithExpiration(d));
    } catch (err) {
      const docs = localFallbackDocuments.filter((d) => !d.isDeleted).map((d) => enrichDocumentWithExpiration(d));
      return docs.filter((d) => d.expirationAlertLevel && ['expired', 'critical_7d', 'urgent_15d', 'warning_30d', 'notice_90d'].includes(d.expirationAlertLevel));
    }
  },

  /**
   * Fetches calendar events.
   */
  async getCalendarEvents(): Promise<DocumentCalendarEvent[]> {
    try {
      const res = await fetch(buildApiUrl('/v2/documents/calendar'));
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      return data.events || [];
    } catch (err) {
      const docs = localFallbackDocuments.filter((d) => !d.isDeleted).map((d) => enrichDocumentWithExpiration(d));
      const events: DocumentCalendarEvent[] = [];
      for (const d of docs) {
        if (d.expirationDate) {
          events.push({
            id: `cal_exp_${d.id}`,
            documentId: d.id,
            title: `Vto: ${d.title}`,
            date: d.expirationDate.split('T')[0],
            eventType: 'expiration',
            category: d.category,
            scope: d.scope,
            companyName: d.companyName,
            establishmentName: d.establishmentName,
            employeeName: d.employeeName,
            alertLevel: d.expirationAlertLevel || 'valid',
            responsibleName: d.responsibleName,
          });
        }
      }
      return events;
    }
  },

  /**
   * Uploads and indexes a new document.
   */
  async uploadDocument(payload: {
    filename: string;
    fileBase64: string;
    mimeType: string;
    title: string;
    category: DocumentCategory;
    subCategory?: string;
    scope?: DocumentScope;
    companyId?: string;
    establishmentId?: string;
    employeeId?: string;
    documentNumber?: string;
    issueDate?: string;
    expirationDate?: string;
    responsibleName?: string;
    issuingOrganism?: string;
    summary?: string;
    notes?: string;
    tags?: string[];
  }): Promise<ProfessionalDocument> {
    const res = await fetch(buildApiUrl('/v2/documents/upload'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${res.status}: Falló la subida del documento`);
    }

    const data = await res.json();
    const doc = enrichDocumentWithExpiration(data.document);
    localFallbackDocuments.unshift(doc);
    return doc;
  },

  /**
   * Updates metadata for an existing document.
   */
  async updateMetadata(
    documentId: string,
    updates: Partial<Pick<ProfessionalDocument, 'title' | 'category' | 'subCategory' | 'documentNumber' | 'issueDate' | 'expirationDate' | 'responsibleName' | 'issuingOrganism' | 'status' | 'notes' | 'tags' | 'summary'>>
  ): Promise<ProfessionalDocument> {
    const res = await fetch(buildApiUrl(`/v2/documents/${documentId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${res.status}: Falló la actualización`);
    }

    const data = await res.json();
    return enrichDocumentWithExpiration(data.document);
  },

  /**
   * Renews document with a new version.
   */
  async renewVersion(
    documentId: string,
    payload: {
      filename: string;
      fileBase64: string;
      mimeType: string;
      issueDate?: string;
      expirationDate?: string;
      changeNotes?: string;
    }
  ): Promise<ProfessionalDocument> {
    const res = await fetch(buildApiUrl(`/v2/documents/${documentId}/renew`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${res.status}: Falló la renovación de versión`);
    }

    const data = await res.json();
    return enrichDocumentWithExpiration(data.document);
  },

  /**
   * Soft deletes a document (conserved for legal traceability).
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const res = await fetch(buildApiUrl(`/v2/documents/${documentId}`), {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${res.status}: Falló la eliminación`);
    }

    const idx = localFallbackDocuments.findIndex((d) => d.id === documentId);
    if (idx >= 0) {
      localFallbackDocuments[idx].isDeleted = true;
    }

    return true;
  },

  /**
   * Downloads a document file.
   */
  async downloadDocument(documentId: string, filename: string, version?: number): Promise<void> {
    const url = buildApiUrl(`/v2/documents/${documentId}/download${version ? `?version=${version}` : ''}`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error descargando archivo (${res.status})`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  },
};
