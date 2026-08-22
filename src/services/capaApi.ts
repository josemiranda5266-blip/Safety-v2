import { ensureAuth } from './firebase';
import { CorrectiveAction } from '../../server/services/capaService';

async function getAuthHeaders() {
  const user = await ensureAuth();
  const token = await user.getIdToken();
  const orgId = localStorage.getItem('safetyia_active_org_id') || '';
  return {
    'Authorization': `Bearer ${token}`,
    'X-Organization-Id': orgId,
    'Content-Type': 'application/json',
  };
}

export const capaApi = {
  getCorrectiveActions: async (companyId?: string): Promise<CorrectiveAction[]> => {
    let url = '/api/v2/capa';
    if (companyId) {
      url += `?companyId=${encodeURIComponent(companyId)}`;
    }
    const headers = await getAuthHeaders();
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Error fetching CAPAs');
    const data = await res.json();
    return data.capas;
  },
  
  createCorrectiveAction: async (data: Partial<CorrectiveAction>): Promise<CorrectiveAction> => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/v2/capa', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error creating CAPA');
    const dataResp = await res.json();
    return dataResp.capa;
  },
  
  updateCorrectiveAction: async (id: string, data: Partial<CorrectiveAction>): Promise<CorrectiveAction> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/v2/capa/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error updating CAPA');
    const dataResp = await res.json();
    return dataResp.capa;
  }
};
