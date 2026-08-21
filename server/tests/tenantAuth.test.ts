import { saveOrganization, saveMembership, clearStore } from "../authorization/store";
import { resolveAuthorizationContext } from "../authorization/context";
import { canAccessCompany, canAccessEstablishment, canAccessEmployee, hasPermission } from "../authorization/guards";
import * as companyService from "../services/companyService";
import * as establishmentService from "../services/establishmentService";
import * as employeeService from "../services/employeeService";
import { Organization, Membership, Company, Establishment, Employee } from "../../src/types/tenant";

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

function runTest(name: string, fn: () => void) {
  try {
    fn();
    testResults.push({ name, passed: true });
    console.log(`✅ [PASS] ${name}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    testResults.push({ name, passed: false, error: errorMsg });
    console.error(`❌ [FAIL] ${name}: ${errorMsg}`);
  }
}

export function runAllTenantAuthTests(): { total: number; passed: number; failed: number } {
  console.log("\n=======================================================");
  console.log("   SAFETY IA V2 — SUITE DE PRUEBAS MULTI-TENANT & RBAC ");
  console.log("=======================================================\n");

  // Setup Clean State
  clearStore();
  companyService.clearCompanyStore();
  establishmentService.clearEstablishmentStore();
  employeeService.clearEmployeeStore();

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
  // EXECUTE TEST SUITE
  // =========================================================================

  // TEST 1: Usuario A -> Organization A puede leer Company A
  runTest("TEST 1: Usuario A -> Organization A puede leer Company A", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(contextA !== null, "El contexto de usuario A debe resolverse correctamente");
    const canAccess = canAccessCompany(contextA!, compA1, "company:read");
    assert(canAccess === true, "Usuario A debe poder leer Company A1");
  });

  // TEST 2: Usuario A -> Organization A NO puede leer Company B de Organization B
  runTest("TEST 2: Usuario A -> Organization A NO puede leer Company B de Organization B", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(contextA !== null, "El contexto debe resolverse");
    const canAccess = canAccessCompany(contextA!, compB1, "company:read");
    assert(canAccess === false, "Usuario A NO debe poder acceder a Company B1 de Org B");
  });

  // TEST 3: Usuario A conoce directamente companyId de Company B pero sigue bloqueado (IDOR)
  runTest("TEST 3: Anti-IDOR: Conocer ID directo de Company B devuelve denegación estricta", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    const directCompanyB = companyService.getCompanyById(compB1.id);
    assert(directCompanyB !== undefined, "La empresa existe en el backend");
    const allowed = canAccessCompany(contextA!, directCompanyB!, "company:read");
    assert(allowed === false, "Conocer el ID directo NO autoriza el acceso entre tenants");
  });

  // TEST 4: Professional (member) no puede eliminar Company ni gestionar membresías
  runTest("TEST 4: Professional (member) tiene permisos de edición pero NO de eliminación de Company", () => {
    const contextMember = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(hasPermission(contextMember!, "company:create") === true, "Member puede crear empresas");
    assert(hasPermission(contextMember!, "company:update") === true, "Member puede actualizar empresas");
    assert(hasPermission(contextMember!, "company:delete") === false, "Member NO puede eliminar empresas");
    assert(hasPermission(contextMember!, "membership:manage") === false, "Member NO puede gestionar miembros");
  });

  // TEST 5: Auditor solo puede realizar operaciones de lectura autorizadas
  runTest("TEST 5: Auditor solo puede realizar operaciones de lectura (read-only)", () => {
    const contextAuditor = resolveAuthorizationContext("user_auditor_a", "auditor@alpha.com", "org_alpha");
    assert(hasPermission(contextAuditor!, "company:read") === true, "Auditor puede leer empresas");
    assert(hasPermission(contextAuditor!, "compliance:read") === true, "Auditor puede leer cumplimiento");
    assert(hasPermission(contextAuditor!, "company:create") === false, "Auditor NO puede crear empresas");
    assert(hasPermission(contextAuditor!, "employee:update") === false, "Auditor NO puede editar empleados");
    assert(hasPermission(contextAuditor!, "company:delete") === false, "Auditor NO puede eliminar empresas");
  });

  // TEST 6: assignedCompanyIds restringe correctamente el acceso a solo las empresas asignadas
  runTest("TEST 6: assignedCompanyIds restringe acceso selectivo dentro de la misma Org", () => {
    const contextRestricted = resolveAuthorizationContext("user_restricted_a", "restricted@alpha.com", "org_alpha");
    assert(canAccessCompany(contextRestricted!, compA1, "company:read") === true, "Tiene acceso a compA1 asignada");
    assert(canAccessCompany(contextRestricted!, compA2, "company:read") === false, "Bloqueado para compA2 no asignada");
  });

  // TEST 7: PATCH Company no permite cambiar orgId (Inmutabilidad de Tenant)
  runTest("TEST 7: PATCH Company mantiene orgId inmutable y previene cambio de tenant", () => {
    const maliciousPayload = {
      legalName: "Metalúrgica Alpha Renombrada S.A.",
      orgId: "org_beta",
    } as unknown as Partial<Company>;
    const updated = companyService.updateCompany(compA1.id, maliciousPayload);
    assert(updated !== undefined, "La empresa se actualiza");
    assert(updated?.orgId === "org_alpha", "El orgId DEBE permanecer en org_alpha sin alteración");
  });

  // TEST 8: PATCH Establishment no permite cambiar orgId/companyId hacia otro tenant
  runTest("TEST 8: PATCH Establishment mantiene orgId y companyId inmutables", () => {
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

  // TEST 9: Employee no puede crearse dentro de una Company de otro tenant
  runTest("TEST 9: Employee solo puede asociarse a una Company y Establishment del mismo tenant", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    const targetCompB = companyService.getCompanyById(compB1.id);
    const canCreateInB = canAccessCompany(contextA!, targetCompB!, "company:update");
    assert(canCreateInB === false, "Usuario de Org A no puede crear empleados en Company de Org B");
  });

  // TEST 10: Un usuario autenticado sin Membership activa no puede acceder a la Organization
  runTest("TEST 10: Usuario sin membresía activa en target Org recibe contexto nulo", () => {
    const strangerContext = resolveAuthorizationContext("user_stranger", "stranger@external.com", "org_alpha");
    assert(strangerContext === null, "El contexto debe ser nulo para usuarios sin membresía");
  });

  // TEST 11: No autenticado -> AuthContext es nulo
  runTest("TEST 11: Usuario no autenticado (UID vacío) produce contexto nulo", () => {
    const noAuthContext = resolveAuthorizationContext("", "");
    assert(noAuthContext === null, "UID vacío produce contexto nulo");
  });

  // TEST 12: Autenticado pero sin permiso -> Bloqueo controlado
  runTest("TEST 12: Comprobación estricta de permisos por rol", () => {
    const contextMember = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    assert(hasPermission(contextMember!, "company:delete") === false, "Permiso no concedido retorna false");
  });

  // TEST 13 (EXTRA IDOR): Verificación de IDOR en Establecimientos y Empleados entre tenants
  runTest("TEST 13: Anti-IDOR cruzado para Establecimientos y Empleados entre Org A y Org B", () => {
    const contextA = resolveAuthorizationContext("user_member_a", "pro@alpha.com", "org_alpha");
    const estB = establishmentService.getEstablishmentById(estB1.id);
    const empB = employeeService.getEmployeeById(empB1.id);

    assert(canAccessEstablishment(contextA!, estB!, "establishment:read") === false, "Establecimiento de Org B bloqueado para Org A");
    assert(canAccessEmployee(contextA!, empB!, "employee:read") === false, "Empleado de Org B bloqueado para Org A");
  });

  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  console.log("\n=======================================================");
  console.log(`   RESULTADO DE PRUEBAS: ${passed}/${testResults.length} EXITOSAS`);
  if (failed > 0) {
    console.error(`   ⚠️ ${failed} PRUEBAS FALLIDAS`);
  } else {
    console.log("   🎉 TODAS LAS PRUEBAS DE AISLAMIENTO PASARON PERFECTAMENTE");
  }
  console.log("=======================================================\n");

  return { total: testResults.length, passed, failed };
}

// Auto-run when executed directly via tsx
if (process.argv[1]?.includes("tenantAuth.test.ts")) {
  runAllTenantAuthTests();
}
