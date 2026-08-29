import { auth } from './firebase';

export type NormativeRecordStatus = 'draft' | 'active' | 'superseded' | 'repealed' | 'archived';

export interface NormativeCriterionRecord {
  id: string;
  code: string;
  title: string;
  description?: string;
  unit?: string;
  parameters: Record<string, string | number | boolean>;
  applicability?: string;
}

export interface NormativeProtocolVersionRecord {
  id: string;
  protocolType: string;
  reference: string;
  title: string;
  version: string;
  status: NormativeRecordStatus;
  effectiveFrom?: string;
  effectiveTo?: string;
  source: {
    issuingAuthority: string;
    documentTitle: string;
    officialUrl?: string;
    documentId?: string;
    publishedAt?: string;
    retrievedAt?: string;
  };
  criteria: NormativeCriterionRecord[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

async function request<T>(path: string): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  const token = await user.getIdToken();
  const response = await fetch(`/api/v2/hygiene/normative${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Normative catalog request failed');
  return payload as T;
}

export const normativeCatalogService = {
  async listProtocolVersions(protocolType?: string): Promise<NormativeProtocolVersionRecord[]> {
    const query = protocolType ? `?protocolType=${encodeURIComponent(protocolType)}` : '';
    const { normativeProtocolVersions } = await request<{ normativeProtocolVersions: NormativeProtocolVersionRecord[] }>(`/protocols${query}`);
    return normativeProtocolVersions;
  },
  async getProtocolVersion(id: string): Promise<NormativeProtocolVersionRecord> {
    const { normativeProtocolVersion } = await request<{ normativeProtocolVersion: NormativeProtocolVersionRecord }>(`/protocols/${encodeURIComponent(id)}`);
    return normativeProtocolVersion;
  },
};
