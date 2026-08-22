import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Company, Establishment, Sector, Position, Employee, Organization, Membership } from '../types/tenant';
import { UserRole } from '../types/safety';
import { tenantApi } from '../services/tenantApi';

interface TenantContextType {
  organizations: Organization[];
  memberships: Membership[];
  activeOrg: Organization | null;
  activeOrgId: string | null;
  setActiveOrgId: (orgId: string) => void;
  companies: Company[];
  activeCompany: Company | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (companyId: string | null) => void;
  establishments: Establishment[];
  sectors: Sector[];
  positions: Position[];
  employees: Employee[];
  userRole: UserRole;
  loading: boolean;
  canAccess: (tab: string) => boolean;
  error: string | null;
  refreshTenantData: () => Promise<void>;
  createCompany: (payload: any) => Promise<Company>;
  updateCompany: (id: string, payload: any) => Promise<Company>;
  deleteCompany: (id: string) => Promise<void>;
  createEstablishment: (payload: any) => Promise<Establishment>;
  updateEstablishment: (id: string, payload: any) => Promise<Establishment>;
  deleteEstablishment: (id: string) => Promise<void>;
  createSector: (payload: any) => Promise<Sector>;
  updateSector: (id: string, payload: any) => Promise<Sector>;
  deleteSector: (id: string) => Promise<void>;
  createPosition: (payload: any) => Promise<Position>;
  updatePosition: (id: string, payload: any) => Promise<Position>;
  deletePosition: (id: string) => Promise<void>;
  // Employee Legajo Methods
  fetchEmployees: (companyId?: string, establishmentId?: string, includeInactive?: boolean) => Promise<Employee[]>;
  createEmployee: (payload: any) => Promise<Employee>;
  bulkCreateEmployees: (payload: { companyId: string; establishmentId: string; employees: Partial<Employee>[] }) => Promise<{ message: string; createdCount: number; errorCount: number; created: Employee[]; errors: any[] }>;
  updateEmployee: (id: string, payload: any) => Promise<Employee>;
  deleteEmployee: (id: string, reason?: string, terminationDate?: string) => Promise<void>;
  terminateEmployee: (id: string, reason: string, date: string) => Promise<Employee>;
  addPpeDelivery: (employeeId: string, payload: any) => Promise<{ employee: Employee; ppeDelivery: any }>;
  addTraining: (employeeId: string, payload: any) => Promise<{ employee: Employee; training: any }>;
  addAccident: (employeeId: string, payload: any) => Promise<{ employee: Employee; accident: any }>;
  addDocument: (employeeId: string, payload: any) => Promise<{ employee: Employee; document: any }>;
  updateMedicalFitness: (employeeId: string, payload: any) => Promise<Employee>;
  transferEmployee: (employeeId: string, payload: any) => Promise<Employee>;
  addTimelineEvent: (employeeId: string, payload: any) => Promise<Employee>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(tenantApi.getActiveOrgId());
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(tenantApi.getActiveCompanyId());
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('professional');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setActiveOrgId = (orgId: string) => {
    tenantApi.setActiveOrgId(orgId);
    setActiveOrgIdState(orgId);
    setActiveCompanyIdState(null);
    tenantApi.setActiveCompanyId(null);
  };

  const setActiveCompanyId = (companyId: string | null) => {
    tenantApi.setActiveCompanyId(companyId);
    setActiveCompanyIdState(companyId);
  };

  const refreshTenantData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch user context & authorized organizations
      const context = await tenantApi.getMyTenantContext();
      setOrganizations(context.organizations || []);
      setMemberships(context.memberships || []);

      const currentOrgId = tenantApi.getActiveOrgId();
      if (!currentOrgId && context.organizations && context.organizations.length > 0) {
        tenantApi.setActiveOrgId(context.organizations[0].id);
        setActiveOrgIdState(context.organizations[0].id);
      }

      // 2. Fetch Companies
      const fetchedCompanies = await tenantApi.listCompanies();
      setCompanies(fetchedCompanies);

      // Validate activeCompanyId
      const currentCompId = tenantApi.getActiveCompanyId();
      if (currentCompId && !fetchedCompanies.some((c) => c.id === currentCompId)) {
        tenantApi.setActiveCompanyId(null);
        setActiveCompanyIdState(null);
      }

      // 3. Fetch Establishments, Sectors, Positions, Employees
      const [fetchedEsts, fetchedSecs, fetchedPoss, fetchedEmps] = await Promise.all([
        tenantApi.listEstablishments(),
        tenantApi.listSectors(),
        tenantApi.listPositions(),
        tenantApi.listEmployees(undefined, undefined, true),
      ]);

      setEstablishments(fetchedEsts);
      setSectors(fetchedSecs);
      setPositions(fetchedPoss);
      setEmployees(fetchedEmps);
    } catch (err: any) {
      console.error('Error loading tenant context:', err);
      setError(err.message || 'Error al conectar con la estructura organizacional');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTenantData();
  }, [activeOrgId]);

  const activeOrg = organizations.find((o) => o.id === activeOrgId) || (organizations.length > 0 ? organizations[0] : null);
  const activeCompany = companies.find((c) => c.id === activeCompanyId) || null;

  // CRUD Helpers
  const handleCreateCompany = async (payload: any) => {
    const created = await tenantApi.createCompany(payload);
    await refreshTenantData();
    setActiveCompanyId(created.id);
    return created;
  };

  const handleUpdateCompany = async (id: string, payload: any) => {
    const updated = await tenantApi.updateCompany(id, payload);
    await refreshTenantData();
    return updated;
  };

  const handleDeleteCompany = async (id: string) => {
    await tenantApi.deleteCompany(id);
    if (activeCompanyId === id) {
      setActiveCompanyId(null);
    }
    await refreshTenantData();
  };

  const handleCreateEstablishment = async (payload: any) => {
    const created = await tenantApi.createEstablishment(payload);
    await refreshTenantData();
    return created;
  };

  const handleUpdateEstablishment = async (id: string, payload: any) => {
    const updated = await tenantApi.updateEstablishment(id, payload);
    await refreshTenantData();
    return updated;
  };

  const handleDeleteEstablishment = async (id: string) => {
    await tenantApi.deleteEstablishment(id);
    await refreshTenantData();
  };

  const handleCreateSector = async (payload: any) => {
    const created = await tenantApi.createSector(payload);
    await refreshTenantData();
    return created;
  };

  const handleUpdateSector = async (id: string, payload: any) => {
    const updated = await tenantApi.updateSector(id, payload);
    await refreshTenantData();
    return updated;
  };

  const handleDeleteSector = async (id: string) => {
    await tenantApi.deleteSector(id);
    await refreshTenantData();
  };

  const handleCreatePosition = async (payload: any) => {
    const created = await tenantApi.createPosition(payload);
    await refreshTenantData();
    return created;
  };

  const handleUpdatePosition = async (id: string, payload: any) => {
    const updated = await tenantApi.updatePosition(id, payload);
    await refreshTenantData();
    return updated;
  };

  const handleDeletePosition = async (id: string) => {
    await tenantApi.deletePosition(id);
    await refreshTenantData();
  };

  // Employee Handlers
  const handleFetchEmployees = async (companyId?: string, establishmentId?: string, includeInactive: boolean = true) => {
    const emps = await tenantApi.listEmployees(companyId, establishmentId, includeInactive);
    setEmployees(emps);
    return emps;
  };

  const handleCreateEmployee = async (payload: any) => {
    const created = await tenantApi.createEmployee(payload);
    await refreshTenantData();
    return created;
  };

  const handleBulkCreateEmployees = async (payload: { companyId: string; establishmentId: string; employees: Partial<Employee>[] }) => {
    const result = await tenantApi.bulkCreateEmployees(payload);
    await refreshTenantData();
    return result;
  };

  const handleUpdateEmployee = async (id: string, payload: any) => {
    const updated = await tenantApi.updateEmployee(id, payload);
    await refreshTenantData();
    return updated;
  };

  const handleDeleteEmployee = async (id: string, reason?: string, terminationDate?: string) => {
    await tenantApi.deleteEmployee(id, reason, terminationDate);
    await refreshTenantData();
  };

  const handleTerminateEmployee = async (id: string, reason: string, date: string) => {
    const updated = await tenantApi.terminateEmployee(id, reason, date);
    await refreshTenantData();
    return updated;
  };

  const handleAddPpeDelivery = async (employeeId: string, payload: any) => {
    const result = await tenantApi.addEmployeePpeDelivery(employeeId, payload);
    await refreshTenantData();
    return result;
  };

  const handleAddTraining = async (employeeId: string, payload: any) => {
    const result = await tenantApi.addEmployeeTraining(employeeId, payload);
    await refreshTenantData();
    return result;
  };

  const handleAddAccident = async (employeeId: string, payload: any) => {
    const result = await tenantApi.addEmployeeAccident(employeeId, payload);
    await refreshTenantData();
    return result;
  };

  const handleAddDocument = async (employeeId: string, payload: any) => {
    const result = await tenantApi.addEmployeeDocument(employeeId, payload);
    await refreshTenantData();
    return result;
  };

  const handleUpdateMedicalFitness = async (employeeId: string, payload: any) => {
    const updated = await tenantApi.updateEmployeeMedicalFitness(employeeId, payload);
    await refreshTenantData();
    return updated;
  };

  const handleTransferEmployee = async (employeeId: string, payload: any) => {
    const updated = await tenantApi.transferEmployee(employeeId, payload);
    await refreshTenantData();
    return updated;
  };

  const handleAddTimelineEvent = async (employeeId: string, payload: any) => {
    const updated = await tenantApi.addEmployeeTimelineEvent(employeeId, payload);
    await refreshTenantData();
    return updated;
  };

  const canAccess = (tab: string): boolean => {
    if (userRole === 'professional') return true;
    
    const permissions: Record<UserRole, string[]> = {
      professional: [],
      empresa: ['dashboard', 'home', 'documentation', 'calendar', 'reports', 'normative', 'normative_center', 'library', 'summaries'],
      rrhh: ['home', 'employees', 'documentation', 'trainings', 'calendar', 'reports'],
      supervisor: ['home', 'inspections', 'corrective_actions', 'inspector_ia', 'iper', 'hygiene', 'checklists', 'image_analysis', 'ppe'],
      trabajador: ['home', 'trainings', 'ppe', 'documentation', 'chat']
    };
    
    return permissions[userRole]?.includes(tab) || false;
  };

  return (
    <TenantContext.Provider
      value={{
        organizations,
        memberships,
        activeOrg,
        activeOrgId,
        setActiveOrgId,
        companies,
        activeCompany,
        activeCompanyId,
        setActiveCompanyId,
        establishments,
        sectors,
        positions,
        employees,
        userRole,
        loading,
        canAccess,
        error,
        refreshTenantData,
        createCompany: handleCreateCompany,
        updateCompany: handleUpdateCompany,
        deleteCompany: handleDeleteCompany,
        createEstablishment: handleCreateEstablishment,
        updateEstablishment: handleUpdateEstablishment,
        deleteEstablishment: handleDeleteEstablishment,
        createSector: handleCreateSector,
        updateSector: handleUpdateSector,
        deleteSector: handleDeleteSector,
        createPosition: handleCreatePosition,
        updatePosition: handleUpdatePosition,
        deletePosition: handleDeletePosition,
        fetchEmployees: handleFetchEmployees,
        createEmployee: handleCreateEmployee,
        bulkCreateEmployees: handleBulkCreateEmployees,
        updateEmployee: handleUpdateEmployee,
        deleteEmployee: handleDeleteEmployee,
        terminateEmployee: handleTerminateEmployee,
        addPpeDelivery: handleAddPpeDelivery,
        addTraining: handleAddTraining,
        addAccident: handleAddAccident,
        addDocument: handleAddDocument,
        updateMedicalFitness: handleUpdateMedicalFitness,
        transferEmployee: handleTransferEmployee,
        addTimelineEvent: handleAddTimelineEvent,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
