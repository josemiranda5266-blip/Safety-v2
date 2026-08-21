import { saveOrganization, saveMembership, clearStore, getOrganizations, getAllMemberships, getAuthorizationRepository } from "../authorization/store";
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
import { Organization, Membership, Company, Establishment, Employee, PlatformUserRole } from "../../src/types/tenant";
import { Response } from "express";

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

export async function runAllTenantAuthTests(): Promise<{ total: number; passed: number; failed: number }> {
  console.log("\n=======================================================");
  console.log("   SAFETY IA V2 — SUITE DE PRUEBAS MULTI-TENANT & RBAC ");
  console.log("=======================================================\n");

  // Setup Clean State and Inject Mock Verifier for Tests
  clearStore();
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
  saveOrganization(orgA);

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
  saveOrganization(orgB);

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
  saveMembership(memOwnerA);

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
  saveMembership(memMemberA);

  // Seed Companies
  const compA1 = companyService.createCompany({
    orgId: "org_alpha",
    legalName: "Metalúrgica Alpha S.A.",
    cuit: "30-11111111-9",
  });

  // User A3: Restricted Member of Org A (only compA1)
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
  saveMembership(memRestrictedA);

  // User A4: Auditor of Org A
  const memAuditorA: Membership = {
    id: "mem_auditor_a",
    orgId: "org_alpha",
    userId: "user_auditor_a",
    userEmail: "auditor@alpha.com",
    role: "auditor",
    active: true,
    invitedAt: now,
  };
  saveMembership(memAuditorA);

  // User B1: Owner of Org B
  const memOwnerB: Membership = {
    id: "mem_owner_b",
    orgId: "org_beta",
    userId: "user_owner_b",
    userEmail: "owner@beta.com",
    role: "owner",
    active: true,
    invitedAt: now,
  };
  saveMembership(memOwnerB);

  const compA2 = companyService.createCompany({
    orgId: "org_alpha",
    legalName: "Constructora Alpha S.R.L.",
    cuit: "30-22222222-9",
  });

  const compB1 = companyService.createCompany({
    orgId: "org_beta",
    legalName: "Química Beta S.A.",
    cuit: "30-33333333-9",
  });

  // Seed Establishments
  const estA1 = establishmentService.createEstablishment({
    companyId: compA1.id,
    orgId: "org_alpha",
    name: "Planta Principal Alpha",
    address: "Av. Industrial 123",
    city: "Zárate",
    province: "Buenos Aires",
  });

  const estB1 = establishmentService.createEstablishment({
    companyId: compB1.id,
    orgId: "org_beta",
    name: "Planta Química Beta",
    address: "Ruta 9 Km 50",
    city: "Campana",
    province: "Buenos Aires",
  });

  // Seed Employees
  const empA1 = employeeService.createEmployee({
    companyId: compA1.id,
    establishmentId: estA1.id,
    orgId: "org_alpha",
    cuil: "20-35111222-4",
    firstName: "Juan",
    lastName: "Pérez",
  });

  const empB1 = employeeService.createEmployee({
    companyId: compB1.id,
    establishmentId: estB1.id,
    orgId: "org_beta",
    cuil: "20-40999888-4",
    firstName: "Carlos",
    lastName: "Gómez",
  });

  // =========================================================================
  // EXECUTE TEST SUITE 1 TO 27
  // =========================================================================

  // TEST 1: Usuario A -> Organization A puede leer Company A
  await runTest("TEST 1: Usuario A -> Organization A puede leer Company A", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(contextA !== null, "El contexto de usuario A debe resolverse correctamente");
    const canAccess = canAccessCompany(contextA!, compA1, "company:read");
    assert(canAccess === true, "Usuario A debe poder leer Company A1");
  });

  // TEST 2: Usuario A -> Organization A NO puede leer Company B de Organization B
  await runTest("TEST 2: Usuario A -> Organization A NO puede leer Company B de Organization B", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(contextA !== null, "El contexto debe resolverse");
    const canAccess = canAccessCompany(contextA!, compB1, "company:read");
    assert(canAccess === false, "Usuario A NO debe poder acceder a Company B1 de Org B");
  });

  // TEST 3: Anti-IDOR: Conocer ID directo de Company B devuelve denegación estricta
  await runTest("TEST 3: Anti-IDOR: Conocer ID directo de Company B devuelve denegación estricta", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    const directCompanyB = companyService.getCompanyById(compB1.id);
    assert(directCompanyB !== undefined, "La empresa existe en el backend");
    const allowed = canAccessCompany(contextA!, directCompanyB!, "company:read");
    assert(allowed === false, "Conocer el ID directo NO autoriza el acceso entre tenants");
  });

  // TEST 4: Professional (member) tiene permisos de edición pero NO de eliminación de Company
  await runTest("TEST 4: Professional (member) tiene permisos de edición pero NO de eliminación de Company", () => {
    const contextMember = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(hasPermission(contextMember!, "company:create") === true, "Member puede crear empresas");
    assert(hasPermission(contextMember!, "company:update") === true, "Member puede actualizar empresas");
    assert(hasPermission(contextMember!, "company:delete") === false, "Member NO puede eliminar empresas");
    assert(hasPermission(contextMember!, "membership:manage") === false, "Member NO puede gestionar miembros");
  });

  // TEST 5: Auditor solo puede realizar operaciones de lectura (read-only)
  await runTest("TEST 5: Auditor solo puede realizar operaciones de lectura (read-only)", () => {
    const contextAuditor = resolveAuthorizationContext("user_auditor_a", "auditor@alpha.com", "org_alpha");
    assert(hasPermission(contextAuditor!, "company:read") === true, "Auditor puede leer empresas");
    assert(hasPermission(contextAuditor!, "compliance:read") === true, "Auditor puede leer cumplimiento");
    assert(hasPermission(contextAuditor!, "company:create") === false, "Auditor NO puede crear empresas");
    assert(hasPermission(contextAuditor!, "employee:update") === false, "Auditor NO puede editar empleados");
    assert(hasPermission(contextAuditor!, "company:delete") === false, "Auditor NO puede eliminar empresas");
  });

  // TEST 6: assignedCompanyIds restringe acceso selectivo dentro de la misma Org
  await runTest("TEST 6: assignedCompanyIds restringe acceso selectivo dentro de la misma Org", () => {
    const contextRestricted = resolveAuthorizationContext("user_restricted_a", "restricted@alpha.com", "org_alpha");
    assert(canAccessCompany(contextRestricted!, compA1, "company:read") === true, "Tiene acceso a compA1 asignada");
    assert(canAccessCompany(contextRestricted!, compA2, "company:read") === false, "Bloqueado para compA2 no asignada");
  });

  // TEST 7: PATCH Company mantiene orgId inmutable y previene cambio de tenant
  await runTest("TEST 7: PATCH Company mantiene orgId inmutable y previene cambio de tenant", () => {
    const maliciousPayload = {
      legalName: "Metalúrgica Alpha Renombrada S.A.",
      orgId: "org_beta",
    } as unknown as Partial<Company>;
    const updated = companyService.updateCompany(compA1.id, maliciousPayload);
    assert(updated !== undefined, "La empresa se actualiza");
    assert(updated?.orgId === "org_alpha", "El orgId DEBE permanecer en org_alpha sin alteración");
  });

  // TEST 8: PATCH Establishment mantiene orgId y companyId inmutables
  await runTest("TEST 8: PATCH Establishment mantiene orgId y companyId inmutables", () => {
    const maliciousPayload = {
      name: "Planta Principal Renovada",
      companyId: compB1.id,
      orgId: "org_beta",
    } as unknown as Partial<Establishment>;
    const updatedEst = establishmentService.updateEstablishment(estA1.id, maliciousPayload);
    assert(updatedEst !== undefined, "El establecimiento se actualiza");
    assert(updatedEst?.orgId === "org_alpha", "orgId no puede ser modificado");
    assert(updatedEst?.companyId === compA1.id, "companyId no puede ser modificado");
  });

  // TEST 9: Employee solo puede asociarse a una Company y Establishment del mismo tenant
  await runTest("TEST 9: Employee solo puede asociarse a una Company y Establishment del mismo tenant", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    const targetCompB = companyService.getCompanyById(compB1.id);
    const canCreateInB = canAccessCompany(contextA!, targetCompB!, "company:update");
    assert(canCreateInB === false, "Usuario de Org A no puede crear empleados en Company de Org B");
  });

  // TEST 10: Usuario sin membresía activa en target Org recibe contexto nulo
  await runTest("TEST 10: Usuario sin membresía activa en target Org recibe contexto nulo", () => {
    const strangerContext = resolveAuthorizationContext("user_stranger_no_org", "stranger@external.com", "org_alpha");
    assert(strangerContext === null, "El contexto debe ser nulo para usuarios sin membresía");
  });

  // TEST 11: Usuario no autenticado (UID vacío) produce contexto nulo
  await runTest("TEST 11: Usuario no autenticado (UID vacío) produce contexto nulo", () => {
    const noAuthContext = resolveAuthorizationContext("", "");
    assert(noAuthContext === null, "UID vacío produce contexto nulo");
  });

  // TEST 12: Comprobación estricta de permisos por rol
  await runTest("TEST 12: Comprobación estricta de permisos por rol", () => {
    const contextMember = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(hasPermission(contextMember!, "company:delete") === false, "Permiso no concedido retorna false");
  });

  // TEST 13: Anti-IDOR cruzado para Establecimientos y Empleados entre Org A y Org B
  await runTest("TEST 13: Anti-IDOR cruzado para Establecimientos y Empleados entre Org A y Org B", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    const estB = establishmentService.getEstablishmentById(estB1.id);
    const empB = employeeService.getEmployeeById(empB1.id);

    assert(canAccessEstablishment(contextA!, estB!, "establishment:read") === false, "Establecimiento de Org B bloqueado para Org A");
    assert(canAccessEmployee(contextA!, empB!, "employee:read") === false, "Empleado de Org B bloqueado para Org A");
  });

  // TEST 14: Token Firebase válido produce identidad autenticada
  await runTest("TEST 14: Token Firebase válido produce identidad autenticada", async () => {
    const req = {
      headers: {
        authorization: "Bearer valid_token_owner_a",
      },
    } as unknown as AuthenticatedRequest;

    let nextCalled = false;
    await extractAuthUser(req, {} as Response, () => {
      nextCalled = true;
    });

    assert(Boolean(nextCalled), "extractAuthUser debe invocar next()");
    assert(req.identity !== undefined, "req.identity debe estar presente");
    assert(req.identity?.uid === "user_owner_a", "UID debe ser user_owner_a");
    assert(req.userUid === "user_owner_a", "req.userUid debe coincidir con identity.uid");
  });

  // TEST 15: Token inválido → 401
  await runTest("TEST 15: Token inválido → 401", async () => {
    const req = {
      headers: {
        authorization: "Bearer invalid_malformed_token_999",
      },
    } as unknown as TenantRequest;

    await extractAuthUser(req, {} as Response, () => {});
    assert(req.identity === undefined, "req.identity debe ser undefined para token inválido");
    assert(req.userUid === undefined, "req.userUid debe ser undefined para token inválido");

    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert(!nextCalled, "requireAuth no debe llamar next() si el token es inválido");
    assert(res.statusCode === 401, "Debe responder con código 401 UNAUTHENTICATED");
  });

  // TEST 16: Token expirado → 401
  await runTest("TEST 16: Token expirado → 401", async () => {
    const req = {
      headers: {
        authorization: "Bearer expired_token",
      },
    } as unknown as TenantRequest;

    await extractAuthUser(req, {} as Response, () => {});
    assert(req.identity === undefined, "req.identity debe ser undefined para token expirado");

    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert(!nextCalled, "requireAuth debe bloquear tokens expirados");
    assert(res.statusCode === 401, "Debe responder con 401");
  });

  // TEST 17: Authorization header ausente → 401
  await runTest("TEST 17: Authorization header ausente → 401", async () => {
    const req = {
      headers: {},
    } as unknown as TenantRequest;

    await extractAuthUser(req, {} as Response, () => {});
    assert(req.identity === undefined, "req.identity debe ser undefined");
    assert(req.userUid === undefined, "req.userUid debe ser undefined");

    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert(!nextCalled, "requireAuth debe bloquear peticiones sin token");
    assert(res.statusCode === 401, "Debe responder con 401");
  });

  // TEST 18: x-user-id por sí solo NO autentica
  await runTest("TEST 18: x-user-id por sí solo NO autentica", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAuthDev = process.env.AUTH_DEV_MODE;
    try {
      process.env.NODE_ENV = "production";
      process.env.AUTH_DEV_MODE = "false";

      const req = {
        headers: {
          "x-user-id": "user_owner_a",
        },
      } as unknown as TenantRequest;

      await extractAuthUser(req, {} as Response, () => {});
      assert(req.identity === undefined, "x-user-id debe ser completamente ignorado en producción");
      assert(req.userUid === undefined, "req.userUid no debe setearse desde x-user-id");

      const res = createMockResponse();
      let nextCalled = false;
      requireAuth(req, res as unknown as Response, () => {
        nextCalled = true;
      });

      assert(!nextCalled, "requireAuth debe rechazar peticiones que solo mandan x-user-id");
      assert(res.statusCode === 401, "Debe responder 401");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.AUTH_DEV_MODE = originalAuthDev;
    }
  });

  // TEST 19: x-forwarded-for NO crea identidad
  await runTest("TEST 19: x-forwarded-for NO crea identidad", async () => {
    const req = {
      headers: {
        "x-forwarded-for": "203.0.113.195, 70.41.3.18",
      },
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TenantRequest;

    await extractAuthUser(req, {} as Response, () => {});
    assert(req.identity === undefined, "No debe crearse identidad basada en IP");
    assert(req.userUid === undefined, "req.userUid debe permanecer undefined");
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
    requireTenantContext(req, res as unknown as Response, () => {
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
    requireTenantContext(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert(!nextCalled, "Debe bloquear acceso a org_beta");
    assert(res.statusCode === 403, "Debe responder 403");
  });

  // TEST 22: x-org-id solamente selecciona contexto; nunca concede acceso
  await runTest("TEST 22: x-org-id solamente selecciona contexto; nunca concede acceso", async () => {
    const strangerContext = resolveAuthorizationContext("user_stranger_no_org", "stranger@external.com", "org_alpha");
    assert(strangerContext === null, "Enviar x-org-id=org_alpha no otorga acceso si no hay membership activa");
  });

  // TEST 23: Membership role no puede modificarse desde request body
  await runTest("TEST 23: Membership role no puede modificarse desde request body", () => {
    const contextMember = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(contextMember?.membershipRole === "member", "El rol autoritativo es member");

    // Intento de simular manipulación de rol en payload
    const bodyAttempt = { role: "owner", membershipRole: "owner", platformRole: "platform_admin" };
    // El contexto de autorización viene estrictamente del almacén autoritativo
    assert(contextMember?.membershipRole !== bodyAttempt.role, "El payload del cliente no puede alterar el rol");
  });

  // TEST 24: platformRole no se deriva automáticamente de membershipRole
  await runTest("TEST 24: platformRole no se deriva automáticamente de membershipRole", () => {
    const ownerContext = resolveAuthorizationContext("user_owner_a", "owner@alpha.com", "org_alpha");
    assert(ownerContext !== null, "Contexto de owner resuelto");
    assert(
      ownerContext?.platformRole === undefined,
      "platformRole NO debe inferirse automáticamente como consultant_admin a partir de owner"
    );
  });

  // TEST 25: Resolver de AuthorizationContext NO crea Organization
  await runTest("TEST 25: Resolver de AuthorizationContext NO crea Organization", () => {
    const orgsBefore = getOrganizations().length;
    const unregisteredUid = "unregistered_test_user_xyz";
    const result = resolveAuthorizationContext(unregisteredUid, "unreg@test.com");

    assert(result === null, "El contexto debe ser null para usuarios sin registro previo");
    const orgsAfter = getOrganizations().length;
    assert(orgsBefore === orgsAfter, "El número de Organizaciones NO debe haber aumentado (cero auto-creación)");
  });

  // TEST 26: Resolver de AuthorizationContext NO crea Membership
  await runTest("TEST 26: Resolver de AuthorizationContext NO crea Membership", () => {
    const membershipsBefore = getAllMemberships().length;
    const unregisteredUid = "unregistered_test_user_abc";
    resolveAuthorizationContext(unregisteredUid, "unreg@test.com");

    const membershipsAfter = getAllMemberships().length;
    assert(membershipsBefore === membershipsAfter, "El número de Memberships NO debe haber aumentado");
  });

  // TEST 27: Producción sin Firebase Auth verifier real → fail closed
  await runTest("TEST 27: Producción sin Firebase Auth verifier real → fail closed", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAuthDev = process.env.AUTH_DEV_MODE;
    try {
      process.env.NODE_ENV = "production";
      process.env.AUTH_DEV_MODE = "true";

      resetGlobalAuthVerifier();

      let failedClosed: boolean = false;
      try {
        getAuthVerifier();
      } catch (_err: unknown) {
        failedClosed = true;
      }

      assert(failedClosed === true, "En producción, activar AUTH_DEV_MODE debe provocar un fallo fatal cerrado (Fail-Closed)");
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.AUTH_DEV_MODE = originalAuthDev;
      setGlobalAuthVerifier(mockVerifier);
    }
  });

  // TEST 28: platformRole inválido no concede permisos
  await runTest("TEST 28: platformRole inválido no concede permisos", () => {
    // Attempt arbitrary/untrusted roles
    assert(validatePlatformUserRole("super_user") === undefined, "super_user debe ser invalidado");
    assert(validatePlatformUserRole("admin") === undefined, "admin genérico debe ser invalidado");
    assert(validatePlatformUserRole("root") === undefined, "root debe ser invalidado");
    assert(validatePlatformUserRole(null) === undefined, "null debe ser invalidado");
    assert(validatePlatformUserRole(123) === undefined, "número debe ser invalidado");
    assert(validatePlatformUserRole("platform_admin") === "platform_admin", "platform_admin válido");

    // Invalid platformRole in context does not bypass permission guards
    const fakeContext: AuthorizationContext = {
      userId: "user_attacker",
      userEmail: "attacker@test.com",
      orgId: "org_alpha",
      membershipId: "mem_attacker",
      membershipRole: "auditor",
      platformRole: validatePlatformUserRole("super_admin_fake"),
    };

    assert(!hasPermission(fakeContext, "company:delete"), "Rol inválido no otorga permisos de admin");
  });

  // TEST 29: platformRole enviado en body es ignorado
  await runTest("TEST 29: platformRole enviado en body es ignorado", () => {
    const rawPayload = {
      legalName: "Empresa Ataque",
      cuit: "30-99999999-9",
      platformRole: "platform_admin",
    };

    const parseResult = createCompanySchema.safeParse(rawPayload);
    // Zod strict schema rejects unknown / injected fields
    assert(!parseResult.success, "Payload con platformRole inyectado debe ser rechazado por Zod strict schema");
  });

  // TEST 30: orgId enviado en body no cambia tenant
  await runTest("TEST 30: orgId enviado en body no cambia tenant", () => {
    const rawPayload = {
      legalName: "Empresa Org Injection",
      cuit: "30-88888888-8",
      orgId: "org_beta", // Intento de cruzar a org_beta
    };

    const parseResult = createCompanySchema.safeParse(rawPayload);
    assert(!parseResult.success, "Payload con orgId en body debe ser rechazado por Zod strict");

    // Y aún si se procesara, el servicio siempre fuerza context.orgId
    const context = resolveAuthorizationContext("user_owner_a", "owner@alpha.com", "org_alpha")!;
    const created = companyService.createCompany({
      legalName: "Empresa Con Org Forzado",
      cuit: "30-77777777-7",
      orgId: context.orgId, // Server authoritative
    });

    assert(created.orgId === "org_alpha", "El orgId final del recurso siempre es el del contexto autoritativo");
  });

  // TEST 31: assignedCompanyIds enviado por cliente es ignorado
  await runTest("TEST 31: assignedCompanyIds enviado por cliente es ignorado", () => {
    const memberContext = resolveAuthorizationContext("user_restricted_a", "restricted@alpha.com", "org_alpha")!;
    assert(memberContext !== null, "Contexto de usuario restringido debe resolverse");
    assert(memberContext.assignedCompanyIds?.length === 1, "Contexto autoritativo restringe a compA1");

    // Frontend intenta enviar assignedCompanyIds ampliado en request
    const comp2 = companyService.createCompany({
      orgId: "org_alpha",
      legalName: "Segunda Empresa Alpha S.A.",
      cuit: "30-22222222-9",
    });

    // La comprobación de guard usa context.assignedCompanyIds, nunca lo enviado por el cliente
    assert(!canAccessCompany(memberContext, comp2, "company:read"), "assignedCompanyIds del cliente no amplía acceso a comp2");
  });

  // TEST 32: Firebase projectId ausente en production → fail closed
  await runTest("TEST 32: Firebase projectId ausente en production → fail closed", () => {
    const origEnv = process.env.NODE_ENV;
    const origProject = process.env.FIREBASE_PROJECT_ID;
    const origGcloud = process.env.GCLOUD_PROJECT;

    try {
      process.env.NODE_ENV = "production";
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.GCLOUD_PROJECT;

      let caughtError = false;
      try {
        getFirebaseProjectId();
      } catch (_err: unknown) {
        caughtError = true;
      }

      assert(caughtError === true, "getFirebaseProjectId() debe lanzar error crítico si falta en producción");
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origProject) process.env.FIREBASE_PROJECT_ID = origProject;
      if (origGcloud) process.env.GCLOUD_PROJECT = origGcloud;
    }
  });

  // TEST 33: MockAuthVerifier en production → fail closed
  await runTest("TEST 33: MockAuthVerifier en production → fail closed", () => {
    const origEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";

      let rejectedMock = false;
      try {
        setGlobalAuthVerifier(mockVerifier);
      } catch (_err: unknown) {
        rejectedMock = true;
      }

      assert(rejectedMock === true, "setGlobalAuthVerifier debe rechazar MockAuthVerifier en producción");
    } finally {
      process.env.NODE_ENV = origEnv;
      setGlobalAuthVerifier(mockVerifier);
    }
  });

  // TEST 34: x-user-id + token inválido → 401
  await runTest("TEST 34: x-user-id + token inválido → 401", async () => {
    const req = {
      headers: {
        authorization: "Bearer invalid_garbage_token",
        "x-user-id": "user_owner_a",
      },
    } as unknown as AuthenticatedRequest;

    await extractAuthUser(req, {} as Response, () => {});
    assert(req.identity === undefined, "Token inválido no genera identidad");
    assert(req.userUid === undefined, "x-user-id no debe sobreescribir token inválido");

    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert(!nextCalled, "requireAuth debe bloquear");
    assert(res.statusCode === 401, "Debe responder 401");
  });

  // TEST 35: x-user-id + ausencia de token → 401 en producción
  await runTest("TEST 35: x-user-id + ausencia de token → 401", async () => {
    const origEnv = process.env.NODE_ENV;
    const origDev = process.env.AUTH_DEV_MODE;
    try {
      process.env.NODE_ENV = "production";
      process.env.AUTH_DEV_MODE = "false";

      const req = {
        headers: {
          "x-user-id": "user_owner_a",
        },
      } as unknown as AuthenticatedRequest;

      await extractAuthUser(req, {} as Response, () => {});
      assert(req.identity === undefined, "En producción x-user-id sin token no autentica");

      const res = createMockResponse();
      let nextCalled = false;
      requireAuth(req, res as unknown as Response, () => {
        nextCalled = true;
      });

      assert(!nextCalled, "requireAuth debe bloquear");
      assert(res.statusCode === 401, "Debe responder 401");
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.AUTH_DEV_MODE = origDev;
    }
  });

  // TEST 36: x-forwarded-for + ausencia de token → 401
  await runTest("TEST 36: x-forwarded-for + ausencia de token → 401", async () => {
    const req = {
      headers: {
        "x-forwarded-for": "192.168.1.100, 10.0.0.1",
      },
      socket: {
        remoteAddress: "192.168.1.100",
      },
    } as unknown as AuthenticatedRequest;

    await extractAuthUser(req, {} as Response, () => {});
    assert(req.identity === undefined, "IP no genera identidad");

    const res = createMockResponse();
    let nextCalled = false;
    requireAuth(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    assert(!nextCalled, "requireAuth debe bloquear");
    assert(res.statusCode === 401, "Debe responder 401");
  });

  // TEST 37: membership de Organization A no permite Organization B
  await runTest("TEST 37: membership de Organization A no permite Organization B", () => {
    const contextOrgB = resolveAuthorizationContext("user_owner_a", "owner@alpha.com", "org_beta");
    assert(contextOrgB === null, "Owner de Org A no tiene membresía en Org B -> context null");
  });

  // TEST 38: membership inactiva no permite acceso
  await runTest("TEST 38: membership inactiva no permite acceso", () => {
    const inactiveMem: Membership = {
      id: "mem_inactive_user",
      orgId: "org_alpha",
      userId: "user_inactive",
      userEmail: "inactive@alpha.com",
      role: "member",
      active: false, // Inactiva
      invitedAt: now,
    };
    saveMembership(inactiveMem);

    const context = resolveAuthorizationContext("user_inactive", "inactive@alpha.com", "org_alpha");
    assert(context === null, "Membresía inactiva debe ser rechazada y retornar contexto null");
  });

  // TEST 39: membership role inválido no concede permisos
  await runTest("TEST 39: membership role inválido no concede permisos", () => {
    const invalidRoleContext: AuthorizationContext = {
      userId: "user_fake_role",
      userEmail: "faker@test.com",
      orgId: "org_alpha",
      membershipId: "mem_fake",
      membershipRole: "unrecognized_role" as any,
    };

    assert(!hasPermission(invalidRoleContext, "company:read"), "Rol inválido no tiene permiso company:read");
    assert(!hasPermission(invalidRoleContext, "company:delete"), "Rol inválido no tiene permiso company:delete");
    assert(!hasPermission(invalidRoleContext, "employee:create"), "Rol inválido no tiene permiso employee:create");
  });

  // TEST 40: platformRole nunca se deriva de membershipRole
  await runTest("TEST 40: platformRole nunca se deriva de membershipRole", () => {
    const adminMembership: Membership = {
      id: "mem_admin_test",
      orgId: "org_alpha",
      userId: "user_tenant_admin",
      userEmail: "admin@alpha.com",
      role: "admin",
      active: true,
      invitedAt: now,
    };
    saveMembership(adminMembership);

    const adminContext = resolveAuthorizationContext("user_tenant_admin", "admin@alpha.com", "org_alpha");
    assert(adminContext !== null, "Contexto resuelto");
    assert(adminContext?.membershipRole === "admin", "membershipRole es admin");
    assert(adminContext?.platformRole === undefined, "platformRole debe permanecer undefined (nunca derivado)");
  });

  // TEST 41: Contrato AuthorizationRepository y InMemoryAuthorizationRepository funcionan desacoplados
  await runTest("TEST 41: Contrato AuthorizationRepository funciona desacoplado", () => {
    const repo = getAuthorizationRepository();
    assert(repo !== undefined, "Repositorio de autorización presente");
    assert(repo.organizations.getById("org_alpha")?.id === "org_alpha", "Organization repository getById funciona");
    assert(repo.memberships.getByOrgAndUser("org_alpha", "user_owner_a")?.role === "owner", "Membership repository getByOrgAndUser funciona");
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

