import { Company, Establishment, Sector, Position, Employee, Organization, Membership } from '../types/tenant';
import { ensureAuth } from './firebase';

class TenantApiService {
  private activeOrgId: string | null = null;
  private activeCompanyId: string | null = null;

  constructor() {
    this.activeOrgId = localStorage.getItem('safetyia_active_org_id');
    this.activeCompanyId = localStorage.getItem('safetyia_active_company_id');
  }

  public getActiveOrgId(): string | null {
    return this.activeOrgId;
  }

  public setActiveOrgId(orgId: string | null): void {
    this.activeOrgId = orgId;
    if (orgId) {
      localStorage.setItem('safetyia_active_org_id', orgId);
    } else {
      localStorage.removeItem('safetyia_active_org_id');
    }
  }

  public getActiveCompanyId(): string | null {
    return this.activeCompanyId;
  }

  public setActiveCompanyId(companyId: string | null): void {
    this.activeCompanyId = companyId;
    if (companyId) {
      localStorage.setItem('safetyia_active_company_id', companyId);
    } else {
      localStorage.removeItem('safetyia_active_company_id');
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const user = await ensureAuth();
    const token = await user.getIdToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-user-id': user.uid,
    };
    if (this.activeOrgId) {
      headers['x-org-id'] = this.activeOrgId;
    }
    return headers;
  }

  // --- TENANT CONTEXT ---
  public async getMyTenantContext(): Promise<{
    userId: string;
    userEmail: string;
    userName: string;
    memberships: Membership[];
    organizations: Organization[];
  }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/v2/tenant/my-context', { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener contexto multi-tenant');
    }
    const data = await res.json();
    // If no activeOrgId set, default to first organization
    if (!this.activeOrgId && data.organizations && data.organizations.length > 0) {
      this.setActiveOrgId(data.organizations[0].id);
    }
    return data;
  }

  // --- COMPANIES ---
  public async listCompanies(): Promise<Company[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/v2/companies', { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al listar empresas');
    }
    const data = await res.json();
    return data.companies || [];
  }

  public async getCompany(id: string): Promise<Company> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/companies/${id}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener empresa');
    }
    const data = await res.json();
    return data.company;
  }

  public async createCompany(payload: {
    legalName: string;
    tradeName?: string;
    cuit: string;
    ciiuCode?: string;
    activityDescription?: string;
    artInsuranceName?: string;
    artPolicyNumber?: string;
  }): Promise<Company> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/v2/companies', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al crear empresa');
    }
    const data = await res.json();
    return data.company;
  }

  public async updateCompany(id: string, payload: Partial<Company>): Promise<Company> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/companies/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al actualizar empresa');
    }
    const data = await res.json();
    return data.company;
  }

  public async deleteCompany(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/companies/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al eliminar empresa');
    }
  }

  // --- ESTABLISHMENTS ---
  public async listEstablishments(companyId?: string): Promise<Establishment[]> {
    const headers = await this.getAuthHeaders();
    const url = companyId 
      ? `/api/v2/establishments?companyId=${encodeURIComponent(companyId)}`
      : '/api/v2/establishments';
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al listar establecimientos');
    }
    const data = await res.json();
    return data.establishments || [];
  }

  public async createEstablishment(payload: {
    companyId: string;
    name: string;
    code?: string;
    address: string;
    city: string;
    province: string;
    country?: string;
    postalCode?: string;
    surfaceM2?: number;
    totalWorkers?: number;
    installedPowerKW?: number;
    isConstructionSite?: boolean;
  }): Promise<Establishment> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/v2/establishments', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al crear establecimiento');
    }
    const data = await res.json();
    return data.establishment;
  }

  public async updateEstablishment(id: string, payload: Partial<Establishment>): Promise<Establishment> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/establishments/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al actualizar establecimiento');
    }
    const data = await res.json();
    return data.establishment;
  }

  public async deleteEstablishment(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/establishments/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al eliminar establecimiento');
    }
  }

  // --- SECTORS ---
  public async listSectors(companyId?: string, establishmentId?: string): Promise<Sector[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (establishmentId) params.append('establishmentId', establishmentId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const res = await fetch(`/api/v2/sectors${queryString}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al listar sectores');
    }
    const data = await res.json();
    return data.sectors || [];
  }

  public async createSector(payload: {
    companyId: string;
    establishmentId: string;
    name: string;
    description?: string;
    responsibleName?: string;
    noiseLevelEstimatedDBA?: number;
    requiresSpecificPPE?: boolean;
  }): Promise<Sector> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/v2/sectors', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al crear sector');
    }
    const data = await res.json();
    return data.sector;
  }

  public async updateSector(id: string, payload: Partial<Sector>): Promise<Sector> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/sectors/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al actualizar sector');
    }
    const data = await res.json();
    return data.sector;
  }

  public async deleteSector(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/sectors/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al eliminar sector');
    }
  }

  // --- POSITIONS ---
  public async listPositions(companyId?: string, establishmentId?: string, sectorId?: string): Promise<Position[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (establishmentId) params.append('establishmentId', establishmentId);
    if (sectorId) params.append('sectorId', sectorId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`/api/v2/positions${queryString}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al listar puestos');
    }
    const data = await res.json();
    return data.positions || [];
  }

  public async createPosition(payload: {
    companyId: string;
    establishmentId: string;
    sectorId: string;
    title: string;
    description?: string;
    standardRequiredPPEIds?: string[];
    requiresAnnualAudiometry?: boolean;
    requiresRespiratoryProtection?: boolean;
  }): Promise<Position> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/v2/positions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al crear puesto');
    }
    const data = await res.json();
    return data.position;
  }

  public async updatePosition(id: string, payload: Partial<Position>): Promise<Position> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/positions/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al actualizar puesto');
    }
    const data = await res.json();
    return data.position;
  }

  public async deletePosition(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/positions/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al eliminar puesto');
    }
  }

  // --- EMPLOYEES & DIGITAL LEGAJO ---
  public async listEmployees(companyId?: string, establishmentId?: string, includeInactive: boolean = false): Promise<Employee[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (establishmentId) params.append('establishmentId', establishmentId);
    if (includeInactive) params.append('includeInactive', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`/api/v2/employees${queryString}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al listar empleados');
    }
    const data = await res.json();
    return data.employees || [];
  }

  public async getEmployee(id: string): Promise<Employee> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${id}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener legajo del empleado');
    }
    const data = await res.json();
    return data.employee;
  }

  public async createEmployee(payload: Partial<Employee>): Promise<Employee> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/v2/employees', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al registrar trabajador');
    }
    const data = await res.json();
    return data.employee;
  }

  public async updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al actualizar legajo');
    }
    const data = await res.json();
    return data.employee;
  }

  public async deleteEmployee(id: string, reason?: string, terminationDate?: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${id}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ reason, terminationDate }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al registrar baja del trabajador');
    }
  }

  public async terminateEmployee(id: string, terminationReason: string, terminationDate: string): Promise<Employee> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${id}/terminate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ terminationReason, terminationDate }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al procesar baja del empleado');
    }
    const data = await res.json();
    return data.employee;
  }

  public async addEmployeePpeDelivery(employeeId: string, payload: any): Promise<{ employee: Employee; ppeDelivery: any }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${employeeId}/ppe`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al registrar entrega de EPP');
    }
    return await res.json();
  }

  public async addEmployeeTraining(employeeId: string, payload: any): Promise<{ employee: Employee; training: any }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${employeeId}/trainings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al registrar capacitación');
    }
    return await res.json();
  }

  public async addEmployeeAccident(employeeId: string, payload: any): Promise<{ employee: Employee; accident: any }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${employeeId}/accidents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al registrar siniestro');
    }
    return await res.json();
  }

  public async addEmployeeDocument(employeeId: string, payload: any): Promise<{ employee: Employee; document: any }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${employeeId}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al adjuntar documento al legajo');
    }
    return await res.json();
  }

  public async updateEmployeeMedicalFitness(employeeId: string, payload: any): Promise<Employee> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${employeeId}/medical-fitness`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al actualizar aptitud médica');
    }
    const data = await res.json();
    return data.employee;
  }

  public async transferEmployee(employeeId: string, payload: any): Promise<Employee> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${employeeId}/transfer`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al reasignar puesto/sector');
    }
    const data = await res.json();
    return data.employee;
  }

  public async addEmployeeTimelineEvent(employeeId: string, payload: any): Promise<Employee> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/v2/employees/${employeeId}/timeline`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Error al registrar evento en línea de tiempo');
    }
    const data = await res.json();
    return data.employee;
  }
}

export const tenantApi = new TenantApiService();
