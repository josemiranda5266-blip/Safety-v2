export interface HygieneDocumentField { key: string; label: string; format?: 'text' | 'date' | 'number' | 'json'; }
export interface HygieneDocumentSection { key: string; title: string; data: Record<string, unknown>; }
export interface HygieneDocumentTemplate { key: string; version: string; title: string; sectionKeys: string[]; regulatoryReferenceId?: string; }
export interface HygieneDocumentRepresentation { documentId: string; templateKey: string; templateVersion: string; generatedAt: string; sections: HygieneDocumentSection[]; disclaimer: string; regulatoryReferenceId?: string; }
