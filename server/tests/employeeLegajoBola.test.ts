process.env.IS_RUNNING_TESTS = "true";
import { saveOrganization, saveMembership, clearStore } from "../authorization/store";
import { canAccessEmployee } from "../authorization/guards";
import { resolveAuthorizationContext } from "../authorization/context";
import * as companyService from "../services/companyService";
import * as establishmentService from "../services/establishmentService";
import * as sectorService from "../services/sectorService";
import * as positionService from "../services/positionService";
import * as employeeService from "../services/employeeService";
import { setAdminFirestoreForTesting } from "../auth/firestoreAdmin";
import { Organization, Membership, Company, Establishment, Sector, Position, Employee } from "../../src/types/tenant";

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

function createMockFirestore() {
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
              const exists = colMap.has(docId);
              const data = exists ? { ...colMap.get(docId)! } : undefined;
              return {
                id: docId,
                exists,
                data: () => data,
              };
            },
            async set(data: Record<string, unknown>, setOptions?: { merge?: boolean }) {
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
    async runTransaction(updateFunction: (transaction: any) => Promise<any>) {
      const transaction = {
        async get(docRef: any) {
          return await docRef.get();
        },
        set(docRef: any, data: Record<string, unknown>, setOptions?: { merge?: boolean }) {
          return docRef.set(data, setOptions);
        },
        delete(docRef: any) {
          for (const colMap of collections.values()) {
            colMap.delete(docRef.id);
          }
        },
      };
      return await updateFunction(transaction);
    },
  };

  return mockDb as any;
}

export async function runEmployeeLegajoBolaTests(): Promise<boolean> {
  console.log("\n==================================================");
  console.log("🧪 STARTING FASE 2: GESTIÓN DE TRABAJADORES & BOLA/IDOR TESTS");
  console.log("==================================================\n");

  const mockDb = createMockFirestore();
  setAdminFirestoreForTesting(mockDb);

  testResults.length = 0;
  await clearStore();
  await companyService.clearCompanyStore();
  await establishmentService.clearEstablishmentStore();
  await sectorService.clearSectorStore();
  await positionService.clearPositionStore();
  await employeeService.clearEmployeeStore();

  // Setup Organizations
  const orgAlpha: Organization = {
    id: "org_alpha",
    name: "Consultora H&S Alpha",
    ownerUid: "user_alpha_admin",
    plan: "enterprise",
    planStatus: "active",
    contactEmail: "admin@alpha.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const orgBeta: Organization = {
    id: "org_beta",
    name: "Servicios H&S Beta",
    ownerUid: "user_beta_admin",
    plan: "pro",
    planStatus: "active",
    contactEmail: "admin@beta.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveOrganization(orgAlpha);
  await saveOrganization(orgBeta);

  // Setup Users / Memberships
  // User 1: Org Alpha Admin
  const adminAlpha: Membership = {
    id: "mem_alpha_admin",
    userId: "user_alpha_admin",
    userEmail: "admin@alpha.com",
    orgId: "org_alpha",
    role: "owner",
    active: true,
    invitedAt: new Date().toISOString(),
  };
  // User 2: Org Alpha Scoped Consultant (Only Company A1)
  const scopedAlpha: Membership = {
    id: "mem_alpha_scoped",
    userId: "user_alpha_scoped",
    userEmail: "scoped@alpha.com",
    orgId: "org_alpha",
    role: "member",
    active: true,
    invitedAt: new Date().toISOString(),
    assignedCompanyIds: ["comp_alpha_1"],
  };
  // User 3: Org Beta Admin (Attacker / Cross-Tenant)
  const adminBeta: Membership = {
    id: "mem_beta_admin",
    userId: "user_beta_admin",
    userEmail: "admin@beta.com",
    orgId: "org_beta",
    role: "owner",
    active: true,
    invitedAt: new Date().toISOString(),
  };

  await saveMembership(adminAlpha);
  await saveMembership(scopedAlpha);
  await saveMembership(adminBeta);

  // Setup Hierarchy for Org Alpha:
  const compAlpha1 = await companyService.createCompany({
    id: "comp_alpha_1",
    orgId: "org_alpha",
    legalName: "Metalúrgica del Plata S.A.",
    cuit: "30-11111111-9",
    activityDescription: "Metalmecánica",
  });
  const compAlpha2 = await companyService.createCompany({
    id: "comp_alpha_2",
    orgId: "org_alpha",
    legalName: "Química Austral S.R.L.",
    cuit: "30-22222222-9",
    activityDescription: "Química",
  });
  const estAlpha1 = await establishmentService.createEstablishment({
    id: "est_alpha_1",
    companyId: compAlpha1.id,
    orgId: "org_alpha",
    name: "Planta Principal Wilde",
    code: "EST-01",
    address: "Calle 10 N° 500",
    city: "Avellaneda",
    province: "Buenos Aires",
  });
  const estAlpha2 = await establishmentService.createEstablishment({
    id: "est_alpha_2",
    companyId: compAlpha2.id,
    orgId: "org_alpha",
    name: "Laboratorio Pilar",
    code: "EST-02",
    address: "Parque Industrial Pilar",
    city: "Pilar",
    province: "Buenos Aires",
  });
  const secAlpha1 = await sectorService.createSector({
    id: "sec_alpha_1",
    establishmentId: estAlpha1.id,
    companyId: compAlpha1.id,
    orgId: "org_alpha",
    name: "Tornería y Fresado",
    requiresSpecificPPE: true,
  });
  const secAlpha2 = await sectorService.createSector({
    id: "sec_alpha_2",
    establishmentId: estAlpha2.id,
    companyId: compAlpha2.id,
    orgId: "org_alpha",
    name: "Síntesis Química",
    requiresSpecificPPE: true,
  });
  const posAlpha1 = await positionService.createPosition({
    id: "pos_alpha_1",
    sectorId: secAlpha1.id,
    establishmentId: estAlpha1.id,
    companyId: compAlpha1.id,
    orgId: "org_alpha",
    title: "Tornero CNC Oficial",
    standardRequiredPPEIds: ["Protector auditivo de copa", "Calzado de seguridad dieléctrico", "Gafas de seguridad anti-impacto"],
    requiresAnnualAudiometry: true,
  });
  const posAlpha2 = await positionService.createPosition({
    id: "pos_alpha_2",
    sectorId: secAlpha2.id,
    establishmentId: estAlpha2.id,
    companyId: compAlpha2.id,
    orgId: "org_alpha",
    title: "Operador de Reactor Químico",
    requiresRespiratoryProtection: true,
  });

  // Setup Hierarchy for Org Beta (Cross-tenant):
  const compBeta1 = await companyService.createCompany({
    id: "comp_beta_1",
    orgId: "org_beta",
    legalName: "Logística Beta Express",
    cuit: "30-99999999-9",
    activityDescription: "Logística",
  });
  const estBeta1 = await establishmentService.createEstablishment({
    id: "est_beta_1",
    companyId: compBeta1.id,
    orgId: "org_beta",
    name: "Centro de Distribución Haedo",
    code: "CD-01",
    address: "Rivadavia 1200",
    city: "Haedo",
    province: "Buenos Aires",
  });
  const secBeta1 = await sectorService.createSector({
    id: "sec_beta_1",
    establishmentId: estBeta1.id,
    companyId: compBeta1.id,
    orgId: "org_beta",
    name: "Depósito y Carga",
  });
  const posBeta1 = await positionService.createPosition({
    id: "pos_beta_1",
    sectorId: secBeta1.id,
    establishmentId: estBeta1.id,
    companyId: compBeta1.id,
    orgId: "org_beta",
    title: "Clarkista / Autoelevadorista",
  });

  // -------------------------------------------------------------
  // TEST 1: Creation of Complete Digital Legajo with initial timeline
  // -------------------------------------------------------------
  await runTest("1. Create employee with complete H&S legajo and initial timeline", async () => {
    const employee = await employeeService.createEmployee({
      orgId: "org_alpha",
      companyId: compAlpha1.id,
      establishmentId: estAlpha1.id,
      sectorId: secAlpha1.id,
      positionId: posAlpha1.id,
      cuil: "20-35888999-4",
      firstName: "Carlos",
      lastName: "Mendoza",
      hireDate: "2024-03-01",
      shift: "morning",
      category: "Oficial Especializado",
      associatedRisks: ["Ruido continuo > 85 dBA", "Proyección de partículas", "Atrapamiento en partes móviles"],
      medicalFitness: {
        status: "fit",
        examDate: "2024-02-25",
        examType: "pre_occupational",
        issuingDoctorOrClinic: "Medicina Laboral San Lucas",
        certificateNumber: "APT-2024-889",
        restrictions: [],
      },
      notes: "Experiencia previa en tornos CNC de 5 ejes",
    });

    assert(employee.id.length > 0, "Employee ID must be generated");
    assert(employee.dni === "35888999", `DNI should be automatically extracted from CUIL, got: ${employee.dni}`);
    assert(employee.active === true, "Employee should be active");
    assert(employee.timeline && employee.timeline.length >= 2, "Should automatically contain hire and medical fitness timeline events");
    assert(employee.history && employee.history.length === 1, "Should have initial hire history event");
    assert(employee.associatedRisks?.length === 3, "Associated risks must be preserved");
  });

  // -------------------------------------------------------------
  // TEST 2: Add PPE Delivery (Res. SRT 299/11) with timeline event
  // -------------------------------------------------------------
  let createdEmpId = "";
  await runTest("2. Add PPE Delivery record (Res. SRT 299/11) and verify timeline update", async () => {
    const employees = await employeeService.listEmployees("org_alpha", compAlpha1.id);
    assert(employees.length > 0, "Must find employees in compAlpha1");
    createdEmpId = employees[0].id;

    const res = await employeeService.addEmployeePpeDelivery(createdEmpId, {
      itemType: "Protector auditivo de copa 3M Peltor Optime II",
      brandModel: "3M H520A",
      standardOrCertification: "IRAM 4060 / EN 352-1",
      deliveryDate: "2024-03-02",
      quantity: 1,
      receiptSigned: true,
      status: "active",
      deliveredBy: "Lic. Martín Gómez (H&S)",
      notes: "Entrega inicial con firma de constancia según Res. SRT 299/11",
    }, "org_alpha");

    assert(res !== undefined, "PPE delivery result must be defined");
    assert(res!.employee.ppeDeliveries?.length === 1, "Employee must have 1 PPE delivery");
    assert(res!.employee.timeline?.some(e => e.type === "ppe_delivery"), "Timeline must contain ppe_delivery event");
    assert(res!.ppeDelivery.receiptSigned === true, "Receipt must be marked as signed");
  });

  // -------------------------------------------------------------
  // TEST 3: Add Training Record with timeline event
  // -------------------------------------------------------------
  await runTest("3. Add Training record and verify timeline integration", async () => {
    const res = await employeeService.addEmployeeTraining(createdEmpId, {
      title: "Inducción General de Higiene, Seguridad y Prevención de Riesgos",
      topic: "Inducción y Normas Básicas",
      trainingDate: "2024-03-01",
      durationHours: 2.0,
      instructorName: "Lic. Roberto Paz",
      institution: "Servicio de H&S Interno",
      certificationIssued: true,
      status: "certified",
      scoreOrGrade: "100%",
      notes: "Aprobación satisfactoria de evaluación escrita",
    }, "org_alpha");

    assert(res !== undefined, "Training result must be defined");
    assert(res!.employee.trainings?.length === 1, "Must have 1 training record");
    assert(res!.employee.timeline?.some(e => e.type === "induction"), "Timeline must mark induction event");
  });

  // -------------------------------------------------------------
  // TEST 4: Add Accident / Incident Record with ART details
  // -------------------------------------------------------------
  await runTest("4. Add Accident / Incident record with days lost and ART report", async () => {
    const res = await employeeService.addEmployeeAccident(createdEmpId, {
      type: "accident",
      eventDate: "2024-06-15",
      severity: "lost_time",
      description: "Corte superficial en antebrazo izquierdo por viruta metálica durante desbaste",
      locationDetails: "Taller de Tornería - Torno CNC #2",
      bodyPartAffected: "Antebrazo izquierdo",
      lostDaysCount: 3,
      daysOffWork: 3,
      artReportNumber: "ART-PREV-2024-99812",
      status: "closed",
      investigatorName: "Ing. Laura Méndez",
      notes: "Se reforzó el uso obligatorio de mangas de protección anticorte Kevlar",
    }, "org_alpha");

    assert(res !== undefined, "Accident result must be defined");
    assert(res!.employee.accidents?.length === 1, "Must have 1 accident record");
    assert(res!.employee.timeline?.some(e => e.type === "accident" && e.severity === "danger"), "Timeline must mark accident as danger event");
  });

  // -------------------------------------------------------------
  // TEST 5: Update Medical Fitness (Apto con restricciones)
  // -------------------------------------------------------------
  await runTest("5. Update Medical Fitness to 'fit_with_restrictions' and log timeline", async () => {
    const updated = await employeeService.updateEmployeeMedicalFitness(createdEmpId, {
      status: "fit_with_restrictions",
      examDate: "2024-07-01",
      examType: "post_absence",
      restrictions: ["Evitar levantamiento manual de cargas mayores a 15 kg por 30 días"],
      issuingDoctorOrClinic: "Dra. Sofía Roldán (Mat. Nac. 88312)",
      certificateNumber: "MED-RET-2024-411",
      notes: "Control post-alta médica de ART",
    }, "org_alpha");

    assert(updated !== undefined, "Updated employee must be returned");
    assert(updated!.medicalFitness?.status === "fit_with_restrictions", "Status must be fit_with_restrictions");
    assert(updated!.medicalFitness?.restrictions?.length === 1, "Must contain restrictions");
    assert(updated!.timeline?.some(e => e.type === "medical_exam" && e.severity === "warning"), "Timeline must reflect warning severity");
  });

  // -------------------------------------------------------------
  // TEST 6: Transfer Employee (Movilidad interna) with History & Timeline
  // -------------------------------------------------------------
  await runTest("6. Transfer employee position/sector and check audit history", async () => {
    const updated = await employeeService.transferEmployee(createdEmpId, {
      newSectorId: secAlpha1.id,
      newPositionId: posAlpha1.id,
      newPositionTitle: "Supervisor de Tornería CNC",
      newSectorName: "Tornería y Fresado",
      newShift: "rotating",
      effectiveDate: "2024-09-01",
      reason: "Promoción interna a supervisor de turno",
      registeredBy: "admin@consultora-alpha.com",
    }, "org_alpha");

    assert(updated !== undefined, "Updated employee must be returned");
    assert(updated!.shift === "rotating", "Shift must be updated");
    assert(updated!.history && updated!.history.length >= 2, "History must contain hire and transfer records");
    assert(updated!.history[0].eventType === "transfer", "Latest history record must be transfer");
    assert(updated!.timeline?.some(e => e.type === "transfer"), "Timeline must contain transfer event");
  });

  // -------------------------------------------------------------
  // TEST 7: BOLA/IDOR - Fail-closed Cross-Tenant Attacks
  // -------------------------------------------------------------
  await runTest("7. BOLA/IDOR: User in Org Beta cannot READ employee in Org Alpha", async () => {
    const empFromBetaContext = await employeeService.getEmployeeById(createdEmpId, "org_beta");
    assert(empFromBetaContext === undefined, "Must fail-closed and return undefined for cross-tenant query");
  });

  await runTest("8. BOLA/IDOR: User in Org Beta cannot UPDATE employee in Org Alpha", async () => {
    const res = await employeeService.updateEmployee(createdEmpId, {
      firstName: "Hacked Name",
    }, "org_beta");
    assert(res === undefined, "Cross-tenant update must be rejected");

    const unmodified = await employeeService.getEmployeeById(createdEmpId, "org_alpha");
    assert(unmodified?.firstName === "Carlos", "Employee name must remain unmodified");
  });

  await runTest("9. BOLA/IDOR: User in Org Beta cannot ADD PPE, Training or Accident to Org Alpha employee", async () => {
    const ppeRes = await employeeService.addEmployeePpeDelivery(createdEmpId, {
      itemType: "Casco atacante",
      deliveryDate: "2024-10-01",
      quantity: 1,
      receiptSigned: false,
      status: "active",
    }, "org_beta");
    assert(ppeRes === undefined, "Cross-tenant PPE delivery must fail-closed");

    const trnRes = await employeeService.addEmployeeTraining(createdEmpId, {
      title: "Curso Falso",
      trainingDate: "2024-10-01",
      durationHours: 1,
      certificationIssued: false,
      status: "attended",
    }, "org_beta");
    assert(trnRes === undefined, "Cross-tenant training must fail-closed");

    const accRes = await employeeService.addEmployeeAccident(createdEmpId, {
      type: "accident",
      eventDate: "2024-10-01",
      severity: "first_aid",
      description: "Accidente falso",
      status: "reported",
    }, "org_beta");
    assert(accRes === undefined, "Cross-tenant accident record must fail-closed");
  });

  await runTest("10. BOLA/IDOR: User in Org Beta cannot DELETE employee in Org Alpha", async () => {
    const delRes = await employeeService.deleteEmployee(createdEmpId, "org_beta");
    assert(delRes === false, "Cross-tenant deletion must fail-closed");

    const intact = await employeeService.getEmployeeById(createdEmpId, "org_alpha");
    assert(intact?.active === true, "Employee in Org Alpha must remain active");
  });

  // -------------------------------------------------------------
  // TEST 11: BOLA/IDOR - Scoped Consultant Boundary (Company Isolation)
  // -------------------------------------------------------------
  let empInCompany2 = "";
  await runTest("11. BOLA/IDOR: Scoped Consultant in Company 1 cannot access employee in Company 2", async () => {
    // Create employee in Company 2
    const emp2 = await employeeService.createEmployee({
      orgId: "org_alpha",
      companyId: compAlpha2.id,
      establishmentId: estAlpha2.id,
      sectorId: secAlpha2.id,
      positionId: posAlpha2.id,
      cuil: "27-40111222-8",
      firstName: "Valeria",
      lastName: "Suárez",
      hireDate: "2024-04-01",
    });
    empInCompany2 = emp2.id;

    // Resolve context for scoped consultant (only assigned to compAlpha1)
    const contextScoped = await resolveAuthorizationContext("user_alpha_scoped", "scoped@alpha.com", "org_alpha");
    assert(contextScoped !== null, "Scoped context must resolve");

    // Check guard access
    const canReadEmp1 = canAccessEmployee(contextScoped!, await employeeService.getEmployeeById(createdEmpId, "org_alpha")!, "employee:read");
    assert(canReadEmp1 === true, "Scoped consultant should access employee in assigned company 1");

    const canReadEmp2 = canAccessEmployee(contextScoped!, emp2, "employee:read");
    assert(canReadEmp2 === false, "Scoped consultant must be DENIED access to employee in non-assigned company 2");

    // Check list filtering
    const scopedList = await employeeService.listEmployees("org_alpha", undefined, undefined, contextScoped!.assignedCompanyIds);
    assert(scopedList.every(e => e.companyId === compAlpha1.id), "List must only contain employees from assigned company 1");
    assert(!scopedList.some(e => e.id === empInCompany2), "Employee in company 2 must NOT appear in scoped consultant list");
  });

  // -------------------------------------------------------------
  // TEST 12: Soft-Delete (Baja Lógica) with audit preservation
  // -------------------------------------------------------------
  await runTest("12. Soft-delete (Baja lógica) preserves historical records and marks timeline", async () => {
    const success = await employeeService.deleteEmployee(
      createdEmpId,
      "org_alpha",
      "Renuncia voluntaria / cambio de rubro",
      "2024-11-30"
    );
    assert(success === true, "Soft-delete must succeed");

    const inactiveEmployee = await employeeService.getEmployeeById(createdEmpId, "org_alpha");
    assert(inactiveEmployee !== undefined, "Employee record must still exist");
    assert(inactiveEmployee!.active === false, "Employee must be marked active: false");
    assert(inactiveEmployee!.terminationDate === "2024-11-30", "Termination date must be recorded");
    assert(inactiveEmployee!.terminationReason === "Renuncia voluntaria / cambio de rubro", "Termination reason must be recorded");
    assert(inactiveEmployee!.timeline?.some(e => e.type === "termination"), "Timeline must record termination event");
    assert(inactiveEmployee!.history?.some(h => h.eventType === "termination"), "History must record termination event");
    assert(inactiveEmployee!.ppeDeliveries?.length === 1, "Historical PPE deliveries must remain intact");
    assert(inactiveEmployee!.trainings?.length === 1, "Historical trainings must remain intact");
    assert(inactiveEmployee!.accidents?.length === 1, "Historical accidents must remain intact");

    // Standard list query filters out inactive by default
    const activeList = await employeeService.listEmployees("org_alpha", compAlpha1.id, undefined, undefined, false);
    assert(!activeList.some(e => e.id === createdEmpId), "Inactive employee must not appear in active-only list");

    // Query with includeInactive: true brings it back
    const allList = await employeeService.listEmployees("org_alpha", compAlpha1.id, undefined, undefined, true);
    assert(allList.some(e => e.id === createdEmpId), "Inactive employee must appear when includeInactive: true");
  });

  // Print Summary
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  console.log("\n==================================================");
  console.log(`📊 FASE 2 TEST SUMMARY: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log("==================================================\n");

  return passedCount === totalCount;
}

// Auto-run if direct execution
if (process.env.IS_RUNNING_TESTS === "true") {
  runEmployeeLegajoBolaTests().catch(console.error);
}
