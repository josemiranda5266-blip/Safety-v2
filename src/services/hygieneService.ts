import {
  HygieneMeasurement,
  HygieneInstrument,
  CreateHygieneMeasurementInput,
  CreateHygieneInstrumentInput,
  LightingMeasurementData,
} from '../types/safety';
import { HygieneDocumentRepresentation } from '../types/hygieneDocument';
import { auth } from './firebase';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}/api/v2/hygiene${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Hygiene API request failed');
  return payload as T;
}

export const hygieneService = {
  async getMeasurements(companyId?: string): Promise<HygieneMeasurement[]> { const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''; const { measurements } = await request<{ measurements: HygieneMeasurement[] }>(`/measurements${query}`); return measurements; },
  async getMeasurement(id: string): Promise<HygieneMeasurement> { const { measurement } = await request<{ measurement: HygieneMeasurement }>(`/measurements/${encodeURIComponent(id)}`); return measurement; },
  async addMeasurement(input: CreateHygieneMeasurementInput): Promise<HygieneMeasurement> { const { measurement } = await request<{ measurement: HygieneMeasurement }>('/measurements', { method: 'POST', body: JSON.stringify(input) }); return measurement; },
  async saveLightingData(id: string, lighting: LightingMeasurementData): Promise<HygieneMeasurement> { return this.updateMeasurement(id, { rawData: { lighting } }); },
  async updateMeasurement(id: string, updates: Partial<Pick<HygieneMeasurement, 'protocolType' | 'measurementDate' | 'instrumentIds' | 'rawData' | 'notes' | 'status'>>): Promise<HygieneMeasurement> { const { measurement } = await request<{ measurement: HygieneMeasurement }>(`/measurements/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(updates) }); return measurement; },
  async getDocumentRepresentation(documentId: string): Promise<HygieneDocumentRepresentation> { const { representation } = await request<{ representation: HygieneDocumentRepresentation }>(`/generated-documents/${encodeURIComponent(documentId)}/representation`); return representation; },
  async getGeneratedDocuments(id: string): Promise<any[]> { const { documents } = await request<{ documents: any[] }>(`/measurements/${encodeURIComponent(id)}/generated-documents`); return documents; },
  async generateDocument(id: string, templateKey?: string, templateVersion?: string): Promise<any> { const { document } = await request<{ document: any }>(`/measurements/${encodeURIComponent(id)}/generated-documents`, { method: 'POST', body: JSON.stringify({ templateKey, templateVersion }) }); return document; },
  async reviewMeasurement(id: string, decision: 'approved' | 'changes_requested', comments?: string): Promise<HygieneMeasurement> { const { measurement } = await request<{ measurement: HygieneMeasurement }>(`/measurements/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify({ decision, comments }) }); return measurement; },
  async submitForReview(id: string): Promise<HygieneMeasurement> { const { measurement } = await request<{ measurement: HygieneMeasurement }>(`/measurements/${encodeURIComponent(id)}/submit-for-review`, { method: 'POST' }); return measurement; },
  async getInstruments(): Promise<HygieneInstrument[]> { const { instruments } = await request<{ instruments: HygieneInstrument[] }>('/instruments'); return instruments; },
  async getInstrument(id: string): Promise<HygieneInstrument> { const { instrument } = await request<{ instrument: HygieneInstrument }>(`/instruments/${encodeURIComponent(id)}`); return instrument; },
  async addInstrument(input: CreateHygieneInstrumentInput): Promise<HygieneInstrument> { const { instrument } = await request<{ instrument: HygieneInstrument }>('/instruments', { method: 'POST', body: JSON.stringify(input) }); return instrument; },
  async updateInstrument(id: string, updates: Partial<CreateHygieneInstrumentInput>): Promise<HygieneInstrument> { const { instrument } = await request<{ instrument: HygieneInstrument }>(`/instruments/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(updates) }); return instrument; },
};