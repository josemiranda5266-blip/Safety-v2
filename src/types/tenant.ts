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
  createdAt: string;
  updatedAt?: string;
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
  createdAt: string;
  updatedAt?: string;
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
  invitedAt: string;
  joinedAt?: string;
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
  createdAt: string;
  updatedAt?: string;
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
  createdAt: string;
  updatedAt?: string;
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
  createdAt: string;
  updatedAt?: string;
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
  createdAt: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  companyId: string;
  establishmentId: string;
  sectorId?: string;
  positionId?: string;
  orgId: string;
  cuil: string;
  firstName: string;
  lastName: string;
  hireDate?: string;
  active: boolean;
  isContractorStaff?: boolean;
  contractorId?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Contractor {
  id: string;
  companyId: string; // Empresa principal contratante
  orgId: string;
  businessName: string;
  cuit: string;
  activityDescription: string;
  artInsuranceName: string;
  artCertificateExpiryDate: string; // Vencimiento de nómina y cobertura con cláusula de no repetición
  lifeInsuranceExpiryDate?: string;
  authorizedWorkerCount?: number;
  complianceStatus: 'compliant' | 'missing_documentation' | 'expired_insurance' | 'blocked';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
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
  evaluatedAt: string;
  evaluatedByUserId: string;
}
