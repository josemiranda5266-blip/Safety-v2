import { z } from "zod";

// --- Company Validation Schemas ---
export const createCompanySchema = z
  .object({
    legalName: z.string().min(2, "La razón social debe tener al menos 2 caracteres").max(200),
    tradeName: z.string().max(200).optional(),
    cuit: z.string().min(10, "El CUIT debe tener al menos 10 dígitos").max(13),
    ciiuCode: z.string().max(20).optional(),
    activityDescription: z.string().max(500).optional(),
    artInsuranceName: z.string().max(100).optional(),
    artPolicyNumber: z.string().max(50).optional(),
  })
  .strict();

export const updateCompanySchema = z
  .object({
    legalName: z.string().min(2).max(200).optional(),
    tradeName: z.string().max(200).optional(),
    cuit: z.string().min(10).max(13).optional(),
    ciiuCode: z.string().max(20).optional(),
    activityDescription: z.string().max(500).optional(),
    artInsuranceName: z.string().max(100).optional(),
    artPolicyNumber: z.string().max(50).optional(),
    active: z.boolean().optional(),
  })
  .strict();

// --- Establishment Validation Schemas ---
export const createEstablishmentSchema = z
  .object({
    companyId: z.string().min(1, "El companyId es obligatorio"),
    name: z.string().min(2, "El nombre del establecimiento debe tener al menos 2 caracteres").max(200),
    code: z.string().max(50).optional(),
    address: z.string().min(3, "La dirección es obligatoria").max(300),
    city: z.string().min(2).max(100),
    province: z.string().min(2).max(100),
    country: z.string().default("Argentina"),
    postalCode: z.string().max(20).optional(),
    surfaceM2: z.number().nonnegative().optional(),
    totalWorkers: z.number().int().nonnegative().optional(),
    installedPowerKW: z.number().nonnegative().optional(),
    isConstructionSite: z.boolean().optional(),
  })
  .strict();

export const updateEstablishmentSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    code: z.string().max(50).optional(),
    address: z.string().min(3).max(300).optional(),
    city: z.string().min(2).max(100).optional(),
    province: z.string().min(2).max(100).optional(),
    country: z.string().max(50).optional(),
    postalCode: z.string().max(20).optional(),
    surfaceM2: z.number().nonnegative().optional(),
    totalWorkers: z.number().int().nonnegative().optional(),
    installedPowerKW: z.number().nonnegative().optional(),
    isConstructionSite: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .strict();

// --- Employee Validation Schemas (Strict: No medical fields, no emergency contacts) ---
export const createEmployeeSchema = z
  .object({
    companyId: z.string().min(1, "El companyId es obligatorio"),
    establishmentId: z.string().min(1, "El establishmentId es obligatorio"),
    sectorId: z.string().max(100).optional(),
    positionId: z.string().max(100).optional(),
    cuil: z.string().min(10, "El CUIL debe tener al menos 10 dígitos").max(13),
    firstName: z.string().min(1, "El nombre es obligatorio").max(100),
    lastName: z.string().min(1, "El apellido es obligatorio").max(100),
    hireDate: z.string().optional(),
    isContractorStaff: z.boolean().optional(),
    contractorId: z.string().max(100).optional(),
  })
  .strict();

export const updateEmployeeSchema = z
  .object({
    sectorId: z.string().max(100).optional(),
    positionId: z.string().max(100).optional(),
    cuil: z.string().min(10).max(13).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    hireDate: z.string().optional(),
    active: z.boolean().optional(),
    isContractorStaff: z.boolean().optional(),
    contractorId: z.string().max(100).optional(),
  })
  .strict();
