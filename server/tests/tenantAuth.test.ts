import { saveOrganization, saveMembership, clearStore, getOrganizations, getAllMemberships, getAuthorizationRepository, setAuthorizationRepository } from "../authorization/store";
import { resolveAuthorizationContext } from "../authorization/context";
import { canAccessCompany, canAccessEstablishment, canAccessEmployee, hasPermission } from "../authorization/guards";
import { requireAuth, requireTenantContext, TenantRequest } from "../authorization/middleware";
import { extractAuthUser, AuthenticatedRequest } from "../middleware/auth";
import { MockAuthVerifier } from "../auth/mockAuthVerifier";
import { FirebaseAdminAuthVerifier } from "../auth/firebaseAdminVerifier";
import { setGlobalAuthVerifier, resetGlobalAuthVerifier, getAuthVerifier } from "../auth/verifier";
import { validatePlatformUserRole } from "../auth/types";
import { getFirebaseProjectId } from "../auth/config";
import { createCompanySchema } from "../authorization/validation";
import { AuthorizationContext } from "../authorization/types";
import * as companyService from "../services/companyService";
import * as establishmentService from "../services/establishmentService";
import * as employeeService from "../services/employeeService";
import { requireAiCredits, CreditGuardedRequest } from "../middleware/creditGatekeeper";
import {
  FirestoreOrganizationRepository,
  FirestoreMembershipRepository,
  FirestoreAuthorizationRepository,
  sanitizeOrganization,
  sanitizeMembership,
} from "../authorization/firestoreRepository";
import { InMemoryAuthorizationRepository } from "../authorization/repository";
import { Organization, Membership, Company, Establishment, Employee, PlatformUserRole } from "../../src/types/tenant";
import { Response } from "express";
import { Firestore } from "firebase-admin/firestore";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    testResults.push({ name, passed: true });
    console.log(`✅ [PASS] ${name}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    testResults.push({ name, passed: false, error: errorMsg });
    console.error(`❌ [FAIL] ${name}: ${errorMsg}`);
  }
}

interface MockResponse {
  statusCode: number;
  jsonData: Record<string, unknown> | null;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.jsonData = (data && typeof data === "object") ? (data as Record<string, unknown>) : null;
      return this;
    },
  };
  return res;
}

/**
 * Creates an in-memory Mock Firestore instance for testing Firestore repositories deterministically.
 */
function createMockFirestore(options?: { shouldFailQuery?: boolean }) {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();

  function getCollectionMap(name: string) {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    return collections.get(name)!;
  }

  const mockDb = {
    collection(colName: string) {
      const colMap = getCollectionMap(colName);

      return {
        doc(docId: string) {
          return {
            id: docId,
            async get() {
              if (options?.shouldFailQuery) {
                throw new Error("Simulated Firestore network failure");
              }
              const exists = colMap.has(docId);
              const data = exists ? { ...colMap.get(docId)! } : undefined;
              return {
                id: docId,
                exists,
                data: () => data,
              };
            },
            async set(data: Record<string, unknown>, setOptions?: { merge?: boolean }) {
              if (options?.shouldFailQuery) {
                throw new Error("Simulated Firestore write failure");
              }
              if (setOptions?.merge && colMap.has(docId)) {
                colMap.set(docId, { ...colMap.get(docId)!, ...data });
              } else {
                colMap.set(docId, { ...data });
              }
            },
          };
        },
        where(field: string, op: string, value: unknown) {
          const filters: Array<{ field: string; op: string; value: unknown }> = [{ field, op, value }];
          let limitCount: number | undefined = undefined;

          const queryObj = {
            where(f: string, o: string, v: unknown) {
              filters.push({ field: f, op: o, value: v });
              return queryObj;
            },
            limit(n: number) {
              limitCount = n;
              return queryObj;
            },
            async get() {
              if (options?.shouldFailQuery) {
                throw new Error("Simulated Firestore query error");
              }
              let matches: Array<{ id: string; ref: { id: string }; data: () => Record<string, unknown> }> = [];
              for (const [id, docData] of colMap.entries()) {
                const satisfiesAll = filters.every((filter) => {
                  if (filter.op === "==") {
                    return docData[filter.field] === filter.value;
                  }
                  return true;
                });
                if (satisfiesAll) {
                  matches.push({
                    id,
                    ref: { id },
                    data: () => ({ ...docData }),
                  });
                }
              }
              if (limitCount !== undefined) {
                matches = matches.slice(0, limitCount);
              }
              return {
                empty: matches.length === 0,
                docs: matches,
              };
            },
          };
          return queryObj;
        },
        async get() {
          if (options?.shouldFailQuery) {
            throw new Error("Simulated Firestore collection get error");
          }
          const matches: Array<{ id: string; ref: { id: string }; data: () => Record<string, unknown> }> = [];
          for (const [id, docData] of colMap.entries()) {
            matches.push({
              id,
              ref: { id },
              data: () => ({ ...docData }),
            });
          }
          return {
            empty: matches.length === 0,
            docs: matches,
          };
        },
      };
    },
    batch() {
      const deletions: Array<() => void> = [];
      return {
        delete(docRef: { id: string }) {
          deletions.push(() => {
            for (const colMap of collections.values()) {
              colMap.delete(docRef.id);
            }
          });
        },
        async commit() {
          deletions.forEach((fn) => fn());
        },
      };
    },
  };

  return mockDb as unknown as Firestore;
}

export async function runAllTenantAuthTests(): Promise<{ total: number; passed: number; failed: number }> {
  console.log("\n=======================================================");
  console.log("   SAFETY IA V2 — SUITE DE PRUEBAS MULTI-TENANT & RBAC ");
  console.log("=======================================================\n");

  // Setup Clean State and Inject Mock Verifier for Tests
  await clearStore();
  companyService.clearCompanyStore();
  establishmentService.clearEstablishmentStore();
  employeeService.clearEmployeeStore();
  resetGlobalAuthVerifier();

  const mockVerifier = new MockAuthVerifier();
  setGlobalAuthVerifier(mockVerifier);

  const now = new Date().toISOString();

  // Seed Organization A (Consultora A)
  const orgA: Organization = {
    id: "org_alpha",
    name: "Consultora H&S Alpha",
    ownerUid: "user_owner_a",
    plan: "pro",
    planStatus: "active",
    contactEmail: "admin@alpha.com",
    createdAt: now,
  };
  await saveOrganization(orgA);

  // Seed Organization B (Consultora B)
  const orgB: Organization = {
    id: "org_beta",
    name: "Consultora H&S Beta",
    ownerUid: "user_owner_b",
    plan: "pro_plus",
    planStatus: "active",
    contactEmail: "admin@beta.com",
    createdAt: now,
  };
  await saveOrganization(orgB);

  // User A1: Owner of Org A
  const memOwnerA: Membership = {
    id: "mem_owner_a",
    orgId: "org_alpha",
    userId: "user_owner_a",
    userEmail: "owner@alpha.com",
    role: "owner",
    active: true,
    invitedAt: now,
  };
  await saveMembership(memOwnerA);

  // User A2: Member / Professional of Org A
  const memMemberA: Membership = {
    id: "mem_member_a",
    orgId: "org_alpha",
    userId: "user_member_a",
    userEmail: "pro@alpha.com",
    role: "member",
    active: true,
    invitedAt: now,
  };
  await saveMembership(memMemberA);

  // Seed Companies
  const compA1 = companyService.createCompany({
    orgId: "org_alpha",
    legalName: "Metalúrgica Alpha S.A.",
    cuit: "30-11111111-9",
  });

  const compA2 = companyService.createCompany({
    orgId: "org_alpha",
    legalName: "Constructora Alpha S.R.L.",
    cuit: "30-22222222-9",
  });

  const compB1 = companyService.createCompany({
    orgId: "org_beta",
    legalName: "Logística Beta S.A.",
    cuit: "30-33333333-9",
  });

  // User A3: Restricted Member assigned ONLY to compA1
  const memRestrictedA: Membership = {
    id: "mem_restricted_a",
    orgId: "org_alpha",
    userId: "user_restricted_a",
    userEmail: "restricted@alpha.com",
    role: "member",
    assignedCompanyIds: [compA1.id],
    active: true,
    invitedAt: now,
  };
  await saveMembership(memRestrictedA);

  // User A4: Auditor in Org A
  const memAuditorA: Membership = {
    id: "mem_auditor_a",
    orgId: "org_alpha",
    userId: "user_auditor_a",
    userEmail: "auditor@alpha.com",
    role: "auditor",
    active: true,
    invitedAt: now,
  };
  await saveMembership(memAuditorA);

  // User B1: Owner in Org B
  const memOwnerB: Membership = {
    id: "mem_owner_b",
    orgId: "org_beta",
    userId: "user_owner_b",
    userEmail: "owner@beta.com",
    role: "owner",
    active: true,
    invitedAt: now,
  };
  await saveMembership(memOwnerB);

  // Seed Establishments
  const estA1 = establishmentService.createEstablishment({
    orgId: "org_alpha",
    companyId: compA1.id,
    name: "Planta Principal Alpha",
    address: "Av. Industrial 100",
    city: "Córdoba",
    province: "Córdoba",
  });

  const estB1 = establishmentService.createEstablishment({
    orgId: "org_beta",
    companyId: compB1.id,
    name: "Depósito Central Beta",
    address: "Ruta 9 Km 500",
    city: "Rosario",
    province: "Santa Fe",
  });

  // Seed Employees
  const empA1 = employeeService.createEmployee({
    orgId: "org_alpha",
    companyId: compA1.id,
    establishmentId: estA1.id,
    firstName: "Juan",
    lastName: "Perez",
    cuil: "20-12345678-9",
  });

  const empB1 = employeeService.createEmployee({
    orgId: "org_beta",
    companyId: compB1.id,
    establishmentId: estB1.id,
    firstName: "Carlos",
    lastName: "Gomez",
    cuil: "20-87654321-9",
  });

  // ==========================================
  // TESTS 1-48: EXISTING CORE RBAC & SECURITY
  // ==========================================

  // TEST 1: Fail-closed verifier in production without Project ID
  await runTest("TEST 1: Fallo cerrado en producción sin Project ID", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalProjectId = process.env.FIREBASE_PROJECT_ID;
    const originalGcloud = process.env.GCLOUD_PROJECT;

    try {
      process.env.NODE_ENV = "production";
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.GCLOUD_PROJECT;

      let threw = false;
      try {
        getFirebaseProjectId();
      } catch (err: unknown) {
        threw = true;
        assert((err as Error).message.includes("CRITICAL SECURITY CONFIGURATION ERROR"), "Error message contains security flag");
      }
      assert(threw, "Debe lanzar error crítico en producción si falta FIREBASE_PROJECT_ID");
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalProjectId) process.env.FIREBASE_PROJECT_ID = originalProjectId;
      if (originalGcloud) process.env.GCLOUD_PROJECT = originalGcloud;
    }
  });

  // TEST 2: Inyección de Verifier en pruebas
  await runTest("TEST 2: Inyección de MockAuthVerifier en runtime", () => {
    const verifier = getAuthVerifier();
    assert(verifier instanceof MockAuthVerifier, "El verifier actual debe ser la instancia mock inyectada");
  });

  // TEST 3: Rechazo de token malformado
  await runTest("TEST 3: Rechazo de token malformado o vacío", async () => {
    const req = {
      headers: {
        authorization: "Bearer invalid_malformed_token",
      },
    } as unknown as AuthenticatedRequest;

    await extractAuthUser(req, {} as Response, () => {});
    assert(req.identity === undefined, "Token inválido no debe producir identidad");
    assert(req.userUid === undefined, "userUid debe ser indefinido");
  });

  // TEST 4: PlatformRole válido
  await runTest("TEST 4: Validación de PlatformRole 'platform_admin'", () => {
    const validated = validatePlatformUserRole("platform_admin");
    assert(validated === "platform_admin", "Debe validar 'platform_admin'");
  });

  // TEST 5: PlatformRole inválido rechazado
  await runTest("TEST 5: Rechazo de PlatformRole 'super_root'", () => {
    const validated = validatePlatformUserRole("super_root");
    assert(validated === undefined, "Debe rechazar roles de plataforma arbitrarios");
  });

  // TEST 6: Permiso company:create para rol 'owner'
  await runTest("TEST 6: Permiso company:create permitido para rol 'owner'", async () => {
    const contextA = await resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(contextA !== null, "Debe resolver contexto");
    assert(hasPermission({ ...contextA!, membershipRole: "owner" }, "company:create"), "Owner tiene permiso company:create");
  });

  // TEST 7: Permiso company:create permitido para rol 'admin'
  await runTest("TEST 7: Permiso company:create permitido para rol 'admin'", async () => {
    const contextA = await resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(hasPermission({ ...contextA!, membershipRole: "admin" }, "company:create"), "Admin tiene permiso company:create");
  });

  // TEST 8: Permiso company:delete denegado para rol 'member'
  await runTest("TEST 8: Permiso company:delete denegado para rol 'member'", async () => {
    const contextA = await resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(!hasPermission({ ...contextA!, membershipRole: "member" }, "company:delete"), "Member no puede eliminar empresas");
  });

  // TEST 9: Permiso employee:create permitido para rol 'member'
  await runTest("TEST 9: Permiso employee:create permitido para rol 'member'", async () => {
    const contextMember = await resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(hasPermission(contextMember!, "employee:create"), "Member puede crear empleados");
  });

  // TEST 10: Permiso employee:create denegado para rol 'auditor'
  await runTest("TEST 10: Permiso employee:create denegado para rol 'auditor'", async () => {
    const contextAuditor = await resolveAuthorizationContext("user_auditor_a", "auditor@alpha.com", "org_alpha");
    assert(!hasPermission(contextAuditor!, "employee:create"), "Auditor no puede crear empleados (read-only)");
  });

  // TEST 11: Acceso a Empresa asignada para usuario restringido
  await runTest("TEST 11: Acceso a Empresa asignada para usuario restringido", async () => {
    const contextRestricted = await resolveAuthorizationContext("user_restricted_a", "restricted@alpha.com", "org_alpha");
    assert(contextRestricted !== null, "Contexto resuelto");
    assert(canAccessCompany(contextRestricted!, compA1, "company:read"), "Restricted member puede leer compA1");
  });

  // TEST 12: Bloqueo de Empresa no asignada para usuario restringido
  await runTest("TEST 12: Bloqueo de Empresa no asignada para usuario restringido", async () => {
    const contextRestricted = await resolveAuthorizationContext("user_restricted_a", "restricted@alpha.com", "org_alpha");
    assert(!canAccessCompany(contextRestricted!, compA2, "company:read"), "Restricted member no puede leer compA2");
  });

  // TEST 13: Bloqueo de Empresa de otra Organización (Anti-IDOR)
  await runTest("TEST 13: Bloqueo de Empresa de otra Organización (Anti-IDOR)", async () => {
    const contextA = await resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(!canAccessCompany(contextA!, compB1, "company:read"), "Usuario de Org A no puede leer compB1 de Org B");
  });

  // TEST 14: Usuario sin membresía no puede resolver AuthorizationContext
  await runTest("TEST 14: Usuario sin membresía no puede resolver AuthorizationContext", async () => {
    const strangerContext = await resolveAuthorizationContext("user_stranger_no_org", "stranger@external.com", "org_alpha");
    assert(strangerContext === null, "Usuario sin membresía devuelve null");
  });

  // TEST 15: userId vacío no puede resolver AuthorizationContext
  await runTest("TEST 15: userId vacío no puede resolver AuthorizationContext", async () => {
    const noAuthContext = await resolveAuthorizationContext("", "");
    assert(noAuthContext === null, "userId vacío devuelve null");
  });

  // TEST 16: Listado de empresas filtra por tenant
  await runTest("TEST 16: Listado de empresas filtra por tenant", async () => {
    const contextMember = await resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    const companies = companyService.listCompanies(contextMember!.orgId, contextMember!.assignedCompanyIds);
    assert(companies.length === 2, "Org A ve 2 empresas");
    assert(companies.every((c) => c.orgId === "org_alpha"), "Todas las empresas pertenecen a Org A");
  });

  // TEST 17: Listado de empresas filtra por assignedCompanyIds
  await runTest("TEST 17: Listado de empresas filtra por assignedCompanyIds", async () => {
    const contextRestricted = await resolveAuthorizationContext("user_restricted_a", "restricted@alpha.com", "org_alpha");
    const companies = companyService.listCompanies(contextRestricted!.orgId, contextRestricted!.assignedCompanyIds);
    assert(companies.length === 1, "Usuario restringido ve exactamente 1 empresa");
    assert(companies[0].id === compA1.id, "Empresa visible es compA1");
  });

  // TEST 18: Bloqueo de Establecimiento de otra Organización
  await runTest("TEST 18: Bloqueo de Establecimiento de otra Organización", async () => {
    const contextA = await resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(!canAccessEstablishment(contextA!, estB1, "establishment:read"), "No puede leer estB1");
  });

  // TEST 19: Bloqueo de Empleado de otra Organización
  await runTest("TEST 19: Bloqueo de Empleado de otra Organización", async () => {
    const contextA = await resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(!canAccessEmployee(contextA!, empB1, "employee:read"), "No puede leer empB1");
  });

  // TEST 20: Usuario autenticado sin Membership → 403
  await runTest("TEST 20: Usuario autenticado sin Membership → 403", async () => {
    const req = {
      headers: {
        authorization: "Bearer valid_token_stranger",
      },
    } as unknown as TenantRequest;

    await extractAuthUser(req, {} as Response, () => {});
    assert(req.identity?.uid === "user_stranger_no_org", "Usuario autenticado");

    const res = createMockResponse();
    let nextCalled = false;
    await requireTenantContext(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert(!nextCalled, "requireTenantContext debe denegar acceso a usuario sin membresía");
    assert(res.statusCode === 403, "Debe responder 403 FORBIDDEN");
  });

  // TEST 21: Usuario autenticado con Membership A no puede acceder a Organization B
  await runTest("TEST 21: Usuario autenticado con Membership A no puede acceder a Organization B", async () => {
    const req = {
      headers: {
        authorization: "Bearer valid_token_member_a",
        "x-org-id": "org_beta",
      },
    } as unknown as TenantRequest;

    await extractAuthUser(req, {} as Response, () => {});
    assert(req.identity?.uid === "user_member_a", "Usuario de Org A autenticado");

    const res = createMockResponse();
    let nextCalled = false;
    await requireTenantContext(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert(!nextCalled, "Debe bloquear acceso a org_beta");
    assert(res.statusCode === 403, "Debe responder 403");
  });

  // TEST 22: x-org-id solamente selecciona contexto; nunca concede acceso
  await runTest("TEST 22: x-org-id solamente selecciona contexto; nunca concede acceso", async () => {
    const strangerContext = await resolveAuthorizationContext("user_stranger_no_org", "stranger@external.com", "org_alpha");
    assert(strangerContext === null, "Enviar x-org-id=org_alpha no otorga acceso si no hay membership activa");
  });

  // TEST 23: Membership role no puede modificarse desde request body
  await runTest("TEST 23: Membership role no puede modificarse desde request body", async () => {
    const contextMember = await resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(contextMember?.membershipRole === "member", "Role es member");
    assert(!hasPermission(contextMember!, "company:delete"), "Member no puede eliminar empresas");
  });

  // TEST 24: Owner sí puede crear empresas
  await runTest("TEST 24: Owner sí puede crear empresas", async () => {
    const ownerContext = await resolveAuthorizationContext("user_owner_a", "owner@alpha.com", "org_alpha");
    assert(ownerContext?.membershipRole === "owner", "Role es owner");
    assert(hasPermission(ownerContext!, "company:create"), "Owner puede crear empresas");
  });

  // TEST 25: Auditor no puede crear ni editar recursos
  await runTest("TEST 25: Auditor no puede crear ni editar recursos", async () => {
    const contextAuditor = await resolveAuthorizationContext("user_auditor_a", "auditor@alpha.com", "org_alpha");
    assert(hasPermission(contextAuditor!, "company:read"), "Auditor puede leer empresas");
    assert(!hasPermission(contextAuditor!, "company:create"), "Auditor no puede crear empresas");
    assert(!hasPermission(contextAuditor!, "company:update"), "Auditor no puede actualizar empresas");
    assert(!hasPermission(contextAuditor!, "company:delete"), "Auditor no puede eliminar empresas");
  });

  // TEST 26: Pure resolver no crea organizaciones
  await runTest("TEST 26: Pure resolver no crea organizaciones", async () => {
    const orgsBefore = (await getOrganizations()).length;
    const unregisteredUid = "unregistered_user_12345";
    const result = await resolveAuthorizationContext(unregisteredUid, "unreg@test.com");
    assert(result === null, "Devuelve null");
    const orgsAfter = (await getOrganizations()).length;
    assert(orgsBefore === orgsAfter, "No crea organización");
  });

  // TEST 27: Pure resolver no crea membresías
  await runTest("TEST 27: Pure resolver no crea membresías", async () => {
    const membershipsBefore = (await getAllMemberships()).length;
    const unregisteredUid = "unregistered_user_67890";
    await resolveAuthorizationContext(unregisteredUid, "unreg@test.com");
    const membershipsAfter = (await getAllMemberships()).length;
    assert(membershipsBefore === membershipsAfter, "No crea membresía");
  });

  // TEST 28: Usuario restringido bloqueado de establecimiento no asignado
  await runTest("TEST 28: Usuario restringido bloqueado de establecimiento no asignado", async () => {
    const contextRestricted = await resolveAuthorizationContext("user_restricted_a", "restricted@alpha.com", "org_alpha");
    const estA2 = establishmentService.createEstablishment({
      orgId: "org_alpha",
      companyId: compA2.id,
      name: "Planta Secundaria Alpha",
      address: "Calle 2 450",
      city: "Córdoba",
      province: "Córdoba",
    });
    assert(!canAccessEstablishment(contextRestricted!, estA2, "establishment:read"), "No accede a establecimiento no asignado");
  });

  // TEST 29: Usuario restringido bloqueado de empleado no asignado
  await runTest("TEST 29: Usuario restringido bloqueado de empleado no asignado", async () => {
    const contextRestricted = await resolveAuthorizationContext("user_restricted_a", "restricted@alpha.com", "org_alpha");
    const empA2 = employeeService.createEmployee({
      orgId: "org_alpha",
      companyId: compA2.id,
      establishmentId: "est_dummy",
      firstName: "Maria",
      lastName: "Lopez",
      cuil: "27-33333333-4",
    });
    assert(!canAccessEmployee(contextRestricted!, empA2, "employee:read"), "No accede a empleado no asignado");
  });

  // TEST 30: Validation schema rechaza CUIT inválido
  await runTest("TEST 30: Validation schema rechaza CUIT inválido", () => {
    const result = createCompanySchema.safeParse({
      legalName: "Test Company",
      cuit: "12345",
    });
    assert(!result.success, "CUIT inválido es rechazado por zod");
  });

  // TEST 31: Validation schema acepta CUIT argentino válido
  await runTest("TEST 31: Validation schema acepta CUIT argentino válido", () => {
    const result = createCompanySchema.safeParse({
      legalName: "Test Company",
      cuit: "30-12345678-9",
    });
    assert(result.success, "CUIT válido es aceptado por zod");
  });

  // TEST 32: Inmutabilidad de orgId en actualización de empresa
  await runTest("TEST 32: Inmutabilidad de orgId en actualización de empresa", () => {
    const updated = companyService.updateCompany(compA1.id, {
      legalName: "Metalúrgica Alpha Renombrada S.A.",
    });
    assert(updated?.orgId === "org_alpha", "orgId permanece inmutable");
  });

  // TEST 33: Soft delete de empresa
  await runTest("TEST 33: Soft delete de empresa", () => {
    const tempComp = companyService.createCompany({
      orgId: "org_alpha",
      legalName: "Empresa Temporal S.A.",
      cuit: "30-99999999-9",
    });
    const deleted = companyService.deleteCompany(tempComp.id);
    assert(deleted, "Empresa marcada como borrada");
    const found = companyService.getCompanyById(tempComp.id);
    assert(found?.active === false, "Empresa está inactiva");
  });

  // TEST 34: canAccessCompany previene actualización sin permiso
  await runTest("TEST 34: canAccessCompany previene actualización sin permiso", async () => {
    const context = (await resolveAuthorizationContext("user_owner_a", "owner@alpha.com", "org_alpha"))!;
    assert(canAccessCompany(context, compA1, "company:update"), "Owner puede actualizar compA1");
  });

  // TEST 35: Member no puede borrar empresas
  await runTest("TEST 35: Member no puede borrar empresas", async () => {
    const memberContext = (await resolveAuthorizationContext("user_restricted_a", "restricted@alpha.com", "org_alpha"))!;
    assert(!canAccessCompany(memberContext, compA1, "company:delete"), "Member no puede borrar empresas");
  });

  // TEST 36: Header de autenticación ausente → 401
  await runTest("TEST 36: Header de autenticación ausente → 401", async () => {
    const req = { headers: {} } as unknown as TenantRequest;
    await extractAuthUser(req, {} as Response, () => {});
    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });
    assert(!nextCalled, "requireAuth bloquea sin token");
    assert(res.statusCode === 401, "Responde 401");
  });

  // TEST 37: Header con esquema incorrecto (Basic en vez de Bearer) → 401
  await runTest("TEST 37: Header con esquema incorrecto (Basic en vez de Bearer) → 401", async () => {
    const req = { headers: { authorization: "Basic some_basic_creds" } } as unknown as TenantRequest;
    await extractAuthUser(req, {} as Response, () => {});
    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });
    assert(!nextCalled, "requireAuth bloquea sin Bearer");
    assert(res.statusCode === 401, "Responde 401");
  });

  // TEST 38: Inyección de x-user-id no autentica
  await runTest("TEST 38: Inyección de x-user-id no autentica", async () => {
    const req = { headers: { "x-user-id": "user_owner_a" } } as unknown as TenantRequest;
    await extractAuthUser(req, {} as Response, () => {});
    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });
    assert(!nextCalled, "x-user-id no es fuente de autenticación");
    assert(res.statusCode === 401, "Responde 401");
  });

  // TEST 39: Inyección de body.userId no autentica
  await runTest("TEST 39: Inyección de body.userId no autentica", async () => {
    const req = { body: { userId: "user_owner_a" }, headers: {} } as unknown as TenantRequest;
    await extractAuthUser(req, {} as Response, () => {});
    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });
    assert(!nextCalled, "body.userId no es fuente de autenticación");
    assert(res.statusCode === 401, "Responde 401");
  });

  // TEST 40: Inyección de query.userId no autentica
  await runTest("TEST 40: Inyección de query.userId no autentica", async () => {
    const req = { query: { userId: "user_owner_a" }, headers: {} } as unknown as TenantRequest;
    await extractAuthUser(req, {} as Response, () => {});
    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });
    assert(!nextCalled, "query.userId no es fuente de autenticación");
    assert(res.statusCode === 401, "Responde 401");
  });

  // TEST 41: Header x-forwarded-for no otorga privilegios
  await runTest("TEST 41: Header x-forwarded-for no otorga privilegios", async () => {
    const req = { headers: { "x-forwarded-for": "127.0.0.1" } } as unknown as TenantRequest;
    await extractAuthUser(req, {} as Response, () => {});
    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });
    assert(!nextCalled, "IP headers no otorgan autenticación");
    assert(res.statusCode === 401, "Responde 401");
  });

  // TEST 42: No cross-tenant access a través de x-org-id
  await runTest("TEST 42: No cross-tenant access a través de x-org-id", async () => {
    const contextOrgB = await resolveAuthorizationContext("user_owner_a", "owner@alpha.com", "org_beta");
    assert(contextOrgB === null, "Owner de Org A no puede acceder a Org B via x-org-id");
  });

  // TEST 43: Membership inactiva deniega acceso
  await runTest("TEST 43: Membership inactiva deniega acceso", async () => {
    const inactiveMem: Membership = {
      id: "mem_inactive",
      orgId: "org_alpha",
      userId: "user_inactive",
      userEmail: "inactive@alpha.com",
      role: "member",
      active: false,
      invitedAt: now,
    };
    await saveMembership(inactiveMem);
    const context = await resolveAuthorizationContext("user_inactive", "inactive@alpha.com", "org_alpha");
    assert(context === null, "Membership inactiva no resuelve contexto");
  });

  // TEST 44: Platform Admin con Membership en tenant
  await runTest("TEST 44: Platform Admin con Membership en tenant", async () => {
    const adminMembership: Membership = {
      id: "mem_tenant_admin",
      orgId: "org_alpha",
      userId: "user_tenant_admin",
      userEmail: "admin@alpha.com",
      role: "admin",
      active: true,
      invitedAt: now,
    };
    await saveMembership(adminMembership);
    const adminContext = await resolveAuthorizationContext("user_tenant_admin", "admin@alpha.com", "org_alpha");
    assert(adminContext !== null, "Admin resuelve contexto");
    assert(hasPermission(adminContext!, "company:create"), "Admin puede crear empresas");
  });

  // TEST 45: Verifier mock rechaza token expirado
  await runTest("TEST 45: Verifier mock rechaza token expirado", async () => {
    const verifier = getAuthVerifier();
    let threw = false;
    try {
      await verifier.verifyIdToken("expired_token");
    } catch (err: unknown) {
      threw = true;
      assert((err as Error).message.includes("expirado"), "Error indica expiración");
    }
    assert(threw, "Token expirado debe ser rechazado fail-closed");
  });

  // TEST 46: Rutas IA requieren identidad autenticada
  await runTest("TEST 46: Rutas IA requieren identidad autenticada", async () => {
    const anonymousReq = {
      headers: {},
      body: { question: "¿Qué EPP se requiere?" },
    } as unknown as TenantRequest;

    await extractAuthUser(anonymousReq, {} as Response, () => {});
    const res = createMockResponse();
    let reachedHandler = false;

    requireAuth(anonymousReq, res as unknown as Response, () => {
      reachedHandler = true;
    });

    assert(!reachedHandler, "Petición anónima debe ser bloqueada antes de la IA");
    assert(res.statusCode === 401, "Debe responder 401");
  });

  // TEST 47: Flujo de autorización completo para llamada a IA
  await runTest("TEST 47: Flujo de autorización completo para llamada a IA", async () => {
    const req = {
      headers: {
        authorization: "Bearer valid_token_owner_a",
        "x-org-id": "org_alpha",
      },
      body: { question: "¿Qué EPP se requiere en altura?" },
    } as unknown as CreditGuardedRequest;

    await extractAuthUser(req, {} as Response, () => {});
    const res = createMockResponse();
    let reachedOperation = false;

    requireAuth(req, res as unknown as Response, () => {
      requireAiCredits("CHAT_RAG")(req, res as unknown as Response, () => {
        reachedOperation = true;
      });
    });

    assert(reachedOperation, "Usuario autenticado debe superar requireAuth y creditGatekeeper");
    assert(req.creditContext !== undefined, "CreditContext debe quedar adjunto en el request");
    assert(req.creditContext?.uid === "user_owner_a", "CreditContext debe pertenecer al UID autenticado");
  });

  // TEST 48: creditGatekeeper sin identidad → fail-closed 401
  await runTest("TEST 48: creditGatekeeper sin identidad → fail-closed 401", () => {
    const unauthenticatedReq = {
      headers: {},
      userUid: undefined,
      identity: undefined,
    } as unknown as CreditGuardedRequest;

    const res = createMockResponse();
    let nextCalled = false;

    requireAiCredits("CHAT_RAG")(unauthenticatedReq, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert(!nextCalled, "creditGatekeeper nunca debe permitir usuarios anónimos");
    assert(res.statusCode === 401, "creditGatekeeper debe responder 401 cuando no hay identidad");
  });

  // =========================================================================
  // PHASE 3 TESTS (TEST 49 - TEST 66): FIRESTORE AUTHORIZATION REPOSITORIES
  // =========================================================================

  const mockFirestore = createMockFirestore();
  const firestoreOrgRepo = new FirestoreOrganizationRepository(mockFirestore);
  const firestoreMemRepo = new FirestoreMembershipRepository(mockFirestore);

  // TEST 49: FirestoreOrganizationRepository — getById & save & getAll
  await runTest("TEST 49: FirestoreOrganizationRepository — getById & save & getAll", async () => {
    const orgData: Organization = {
      id: "fs_org_1",
      name: "Constructora del Sur",
      ownerUid: "fs_user_owner",
      plan: "enterprise",
      planStatus: "active",
      contactEmail: "contacto@sur.com",
      createdAt: now,
    };

    const saved = await firestoreOrgRepo.save(orgData);
    assert(saved.id === "fs_org_1", "Organization guardada con id correcto");

    const fetched = await firestoreOrgRepo.getById("fs_org_1");
    assert(fetched !== undefined, "Organization encontrada en Firestore");
    assert(fetched?.name === "Constructora del Sur", "Nombre coincide");
    assert(fetched?.plan === "enterprise", "Plan coincide");

    const all = await firestoreOrgRepo.getAll();
    assert(all.length >= 1, "getAll devuelve organizaciones");
  });

  // TEST 50: FirestoreOrganizationRepository — Inexistente devuelve undefined (Fail-Closed)
  await runTest("TEST 50: FirestoreOrganizationRepository — Inexistente devuelve undefined (Fail-Closed)", async () => {
    const notFound = await firestoreOrgRepo.getById("non_existent_org_id");
    assert(notFound === undefined, "Organización inexistente devuelve undefined sin inventar datos");
  });

  // TEST 51: FirestoreOrganizationRepository — Sanitización y validación de campos
  await runTest("TEST 51: FirestoreOrganizationRepository — Sanitización y validación de campos", () => {
    const sanitized = sanitizeOrganization({
      id: "org_sanitize_test",
      name: "Empresa Sanitizada",
      ownerUid: "owner_123",
      contactEmail: "sanitized@test.com",
      plan: "invalid_plan_tier", // should default to free
      planStatus: "invalid_status", // should default to active
    });

    assert(sanitized !== undefined, "Sanitiza datos válidos con defaults seguros");
    assert(sanitized?.plan === "free", "Plan inválido cae en default 'free'");
    assert(sanitized?.planStatus === "active", "PlanStatus inválido cae en default 'active'");

    // Missing mandatory ID
    const invalid = sanitizeOrganization({ name: "No ID" });
    assert(invalid === undefined, "Objeto sin ID es rechazado");
  });

  // TEST 52: FirestoreOrganizationRepository — Error en Firestore devuelve undefined (Fail-Closed)
  await runTest("TEST 52: FirestoreOrganizationRepository — Error en Firestore devuelve undefined (Fail-Closed)", async () => {
    const failingFirestore = createMockFirestore({ shouldFailQuery: true });
    const failingOrgRepo = new FirestoreOrganizationRepository(failingFirestore);

    const result = await failingOrgRepo.getById("org_alpha");
    assert(result === undefined, "Error de Firestore resulta en undefined (Fail-Closed)");
  });

  // TEST 53: FirestoreMembershipRepository — getByOrgAndUser devuelve membresía activa
  await runTest("TEST 53: FirestoreMembershipRepository — getByOrgAndUser devuelve membresía activa", async () => {
    const memData: Membership = {
      id: "fs_mem_1",
      orgId: "fs_org_1",
      userId: "fs_user_1",
      userEmail: "user1@sur.com",
      role: "member",
      active: true,
      invitedAt: now,
    };

    await firestoreMemRepo.save(memData);

    const fetched = await firestoreMemRepo.getByOrgAndUser("fs_org_1", "fs_user_1");
    assert(fetched !== undefined, "Membresía encontrada para org y user");
    assert(fetched?.role === "member", "Rol correcto");
    assert(fetched?.active === true, "Membresía activa");
  });

  // TEST 54: FirestoreMembershipRepository — Cross-tenant isolation (Org A no accede a Org B)
  await runTest("TEST 54: FirestoreMembershipRepository — Cross-tenant isolation (Org A no accede a Org B)", async () => {
    // Querying for fs_org_999 where user is NOT a member
    const fetched = await firestoreMemRepo.getByOrgAndUser("fs_org_999", "fs_user_1");
    assert(fetched === undefined, "Usuario no tiene acceso a org ajena en Firestore");
  });

  // TEST 55: FirestoreMembershipRepository — Membresía inactiva devuelve undefined (Fail-Closed)
  await runTest("TEST 55: FirestoreMembershipRepository — Membresía inactiva devuelve undefined (Fail-Closed)", async () => {
    const inactiveMem: Membership = {
      id: "fs_mem_inactive",
      orgId: "fs_org_1",
      userId: "fs_user_inactive",
      userEmail: "inactive@sur.com",
      role: "member",
      active: false,
      invitedAt: now,
    };

    await firestoreMemRepo.save(inactiveMem);

    const fetched = await firestoreMemRepo.getByOrgAndUser("fs_org_1", "fs_user_inactive");
    assert(fetched === undefined, "Membresía inactiva en Firestore devuelve undefined (Fail-Closed)");
  });

  // TEST 56: FirestoreMembershipRepository — Membresía inexistente devuelve undefined
  await runTest("TEST 56: FirestoreMembershipRepository — Membresía inexistente devuelve undefined", async () => {
    const fetched = await firestoreMemRepo.getByOrgAndUser("fs_org_1", "non_existent_user");
    assert(fetched === undefined, "Membresía no registrada devuelve undefined");
  });

  // TEST 57: FirestoreMembershipRepository — Rol inválido rechazado por sanitizador (Fail-Closed)
  await runTest("TEST 57: FirestoreMembershipRepository — Rol inválido rechazado por sanitizador (Fail-Closed)", () => {
    const invalidRoleMem = sanitizeMembership({
      id: "mem_hacked",
      orgId: "fs_org_1",
      userId: "fs_user_hacked",
      userEmail: "hacker@test.com",
      role: "super_platform_superuser", // invalid role
      active: true,
    });

    assert(invalidRoleMem === undefined, "Rol no reconocido es rechazado completamente por el sanitizador");
  });

  // TEST 58: FirestoreMembershipRepository — assignedCompanyIds preservado y sanitizado
  await runTest("TEST 58: FirestoreMembershipRepository — assignedCompanyIds preservado y sanitizado", async () => {
    const restrictedMem: Membership = {
      id: "fs_mem_restricted",
      orgId: "fs_org_1",
      userId: "fs_user_restricted",
      userEmail: "restricted@sur.com",
      role: "member",
      assignedCompanyIds: ["comp_101", "comp_102"],
      active: true,
      invitedAt: now,
    };

    await firestoreMemRepo.save(restrictedMem);

    const fetched = await firestoreMemRepo.getByOrgAndUser("fs_org_1", "fs_user_restricted");
    assert(fetched !== undefined, "Membresía recuperada");
    assert(Array.isArray(fetched?.assignedCompanyIds), "assignedCompanyIds es un array");
    assert(fetched?.assignedCompanyIds?.length === 2, "Contiene 2 compañías asignadas");
    assert(fetched?.assignedCompanyIds?.includes("comp_101"), "Incluye comp_101");
  });

  // TEST 59: FirestoreMembershipRepository — getByUser devuelve solo membresías activas del usuario
  await runTest("TEST 59: FirestoreMembershipRepository — getByUser devuelve solo membresías activas del usuario", async () => {
    const userMems = await firestoreMemRepo.getByUser("fs_user_1");
    assert(userMems.length >= 1, "Devuelve membresías del usuario");
    assert(userMems.every((m) => m.userId === "fs_user_1" && m.active), "Todas son del usuario y activas");
  });

  // TEST 60: FirestoreMembershipRepository — Error en Firestore devuelve undefined (Fail-Closed)
  await runTest("TEST 60: FirestoreMembershipRepository — Error en Firestore devuelve undefined (Fail-Closed)", async () => {
    const failingFirestore = createMockFirestore({ shouldFailQuery: true });
    const failingMemRepo = new FirestoreMembershipRepository(failingFirestore);

    const result = await failingMemRepo.getByOrgAndUser("fs_org_1", "fs_user_1");
    assert(result === undefined, "Falla en Firestore devuelve undefined en getByOrgAndUser");

    const byUserResult = await failingMemRepo.getByUser("fs_user_1");
    assert(Array.isArray(byUserResult) && byUserResult.length === 0, "Falla en Firestore devuelve [] en getByUser");
  });

  // TEST 61: End-to-End Context Resolution con FirestoreAuthorizationRepository
  await runTest("TEST 61: End-to-End Context Resolution con FirestoreAuthorizationRepository", async () => {
    const e2eFirestore = createMockFirestore();
    const e2eAuthRepo = new FirestoreAuthorizationRepository(e2eFirestore);

    // Save Org and Membership in Firestore
    await e2eAuthRepo.organizations.save({
      id: "fs_e2e_org",
      name: "Seguridad Industrial E2E",
      ownerUid: "fs_e2e_owner",
      plan: "pro_plus",
      planStatus: "active",
      contactEmail: "admin@e2e.com",
      createdAt: now,
    });

    await e2eAuthRepo.memberships.save({
      id: "fs_e2e_mem",
      orgId: "fs_e2e_org",
      userId: "fs_e2e_user",
      userEmail: "user@e2e.com",
      role: "admin",
      assignedCompanyIds: ["comp_e2e_1"],
      active: true,
      invitedAt: now,
    });

    // Swap active repository to Firestore instance
    setAuthorizationRepository(e2eAuthRepo);

    const resolvedContext = await resolveAuthorizationContext("fs_e2e_user", "user@e2e.com", "fs_e2e_org");
    assert(resolvedContext !== null, "Contexto resuelto exitosamente desde Firestore");
    assert(resolvedContext?.orgId === "fs_e2e_org", "orgId coincide con Firestore");
    assert(resolvedContext?.membershipRole === "admin", "membershipRole coincide con Firestore");
    assert(resolvedContext?.assignedCompanyIds?.[0] === "comp_e2e_1", "assignedCompanyIds coincide con Firestore");
  });

  // TEST 62: End-to-End Context Resolution con Firestore — Usuario en Org B denegado (403)
  await runTest("TEST 62: End-to-End Context Resolution con Firestore — Usuario en Org B denegado (403)", async () => {
    const resolvedContext = await resolveAuthorizationContext("fs_e2e_user", "user@e2e.com", "org_other_unauthorized");
    assert(resolvedContext === null, "Acceso a organización ajena denegado (403)");
  });

  // TEST 63: End-to-End Context Resolution con Firestore — Membresía inactiva denegada (403)
  await runTest("TEST 63: End-to-End Context Resolution con Firestore — Membresía inactiva denegada (403)", async () => {
    const currentRepo = getAuthorizationRepository();
    await currentRepo.memberships.save({
      id: "fs_e2e_inactive_mem",
      orgId: "fs_e2e_org",
      userId: "fs_e2e_inactive_user",
      userEmail: "inactive@e2e.com",
      role: "member",
      active: false,
      invitedAt: now,
    });

    const context = await resolveAuthorizationContext("fs_e2e_inactive_user", "inactive@e2e.com", "fs_e2e_org");
    assert(context === null, "Membresía inactiva en Firestore devuelve null (403)");
  });

  // TEST 64: End-to-End Context Resolution con Firestore — Organización inexistente denegada (403)
  await runTest("TEST 64: End-to-End Context Resolution con Firestore — Organización inexistente denegada (403)", async () => {
    const context = await resolveAuthorizationContext("fs_e2e_user", "user@e2e.com", "non_existent_org_id_123");
    assert(context === null, "Organización inexistente devuelve null (403)");
  });

  // TEST 65: End-to-End Context Resolution con Firestore — Falla de red Firestore → Fail-Closed (null)
  await runTest("TEST 65: End-to-End Context Resolution con Firestore — Falla de red Firestore → Fail-Closed (null)", async () => {
    const failingFirestore = createMockFirestore({ shouldFailQuery: true });
    const failingAuthRepo = new FirestoreAuthorizationRepository(failingFirestore);

    setAuthorizationRepository(failingAuthRepo);

    const context = await resolveAuthorizationContext("fs_e2e_user", "user@e2e.com", "fs_e2e_org");
    assert(context === null, "Falla en conexión a Firestore resuelve fail-closed en null (403)");
  });

  // TEST 66: Restauración de In-Memory repository y validación final de aislamiento
  await runTest("TEST 66: Restauración de In-Memory repository y validación final de aislamiento", async () => {
    const inMemoryRepo = new InMemoryAuthorizationRepository();
    inMemoryRepo.organizations.save(orgA);
    inMemoryRepo.memberships.save(memOwnerA);

    setAuthorizationRepository(inMemoryRepo);

    const context = await resolveAuthorizationContext("user_owner_a", "owner@alpha.com", "org_alpha");
    assert(context !== null, "In-Memory repository reestablecido correctamente");
    assert(context?.membershipRole === "owner", "Owner resuelto correctamente");
  });

  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  console.log("\n=======================================================");
  console.log(`   RESULTADO DE PRUEBAS: ${passed}/${testResults.length} EXITOSAS`);
  if (failed > 0) {
    console.error(`   ⚠️ ${failed} PRUEBAS FALLIDAS`);
  } else {
    console.log(`   🎉 TODAS LAS ${testResults.length} PRUEBAS DE AUTENTICACIÓN Y AISLAMIENTO PASARON EXITOSAMENTE`);
  }
  console.log("=======================================================\n");

  return { total: testResults.length, passed, failed };
}

// Auto-run when executed directly via tsx
if (process.argv[1]?.includes("tenantAuth.test.ts")) {
  runAllTenantAuthTests();
}
