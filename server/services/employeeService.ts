import { 
  Employee, 
  EmployeePpeDelivery, 
  EmployeeTrainingRecord, 
  EmployeeAccidentRecord, 
  EmployeeDocumentRecord, 
  EmployeeHistoryRecord, 
  EmployeeTimelineEvent, 
  MedicalFitnessRecord,
  EmployeeShift
} from "../../src/types/tenant";
import { getAdminFirestore } from "../auth/firestoreAdmin";

function extractDniFromCuil(cuil: string): string {
  const digits = cuil.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(2, -1);
  }
  return digits;
}

export async function listEmployees(
  orgId: string,
  companyId?: string,
  establishmentId?: string,
  allowedCompanyIds?: string[],
  includeInactive: boolean = false
): Promise<Employee[]> {
  if (allowedCompanyIds && allowedCompanyIds.length === 0) {
    return [];
  }
  const db = getAdminFirestore();
  let query = db.collection("employees").where("orgId", "==", orgId);

  if (!includeInactive) {
    query = query.where("active", "==", true);
  }
  if (companyId) {
    query = query.where("companyId", "==", companyId);
  }
  if (establishmentId) {
    query = query.where("establishmentId", "==", establishmentId);
  }

  const snapshot = await query.get();
  const result: Employee[] = [];
  snapshot.docs.forEach((doc) => {
    const emp = { id: doc.id, ...doc.data() } as Employee;
    if (!allowedCompanyIds || allowedCompanyIds.includes(emp.companyId)) {
      result.push(emp);
    }
  });
  return result;
}

export async function getEmployeeById(id: string, orgId?: string): Promise<Employee | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const doc = await db.collection("employees").doc(id).get();
  if (!doc.exists) return undefined;
  const emp = { id: doc.id, ...doc.data() } as Employee;
  if (orgId && emp.orgId !== orgId) {
    return undefined; // Fail-closed
  }
  return emp;
}

export async function createEmployee(data: {
  id?: string;
  companyId: string;
  establishmentId: string;
  sectorId?: string;
  positionId?: string;
  orgId: string;
  cuil: string;
  dni?: string;
  firstName: string;
  lastName: string;
  hireDate?: string;
  shift?: EmployeeShift;
  category?: string;
  associatedRisks?: string[];
  medicalFitness?: MedicalFitnessRecord;
  notes?: string;
  isContractorStaff?: boolean;
  contractorId?: string;
}): Promise<Employee> {
  const now = new Date().toISOString();
  const id = data.id || `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const hireDate = data.hireDate || now.slice(0, 10);
  const dni = data.dni || extractDniFromCuil(data.cuil);

  // Initial timeline event: Hire
  const initialTimeline: EmployeeTimelineEvent[] = [
    {
      id: `evt_hire_${Date.now()}`,
      employeeId: id,
      type: "hire",
      date: hireDate,
      title: "Alta de Ingreso y Registro de Legajo",
      description: `Ingreso registrado en nómina oficial. Categoría: ${data.category || "General"} | Turno: ${data.shift || "Normal"}`,
      severity: "success",
      badge: "Ingreso",
      metadata: {
        companyId: data.companyId,
        establishmentId: data.establishmentId,
        sectorId: data.sectorId,
        positionId: data.positionId,
      },
    },
  ];

  // Initial history event: Hire
  const initialHistory: EmployeeHistoryRecord[] = [
    {
      id: `hist_hire_${Date.now()}`,
      date: hireDate,
      eventType: "hire",
      newPositionId: data.positionId,
      newSectorId: data.sectorId,
      newShift: data.shift,
      reason: "Alta inicial de nómina laboral",
    },
  ];

  // If medical fitness was provided at creation, record timeline
  if (data.medicalFitness) {
    initialTimeline.push({
      id: `evt_med_${Date.now()}`,
      employeeId: id,
      type: "medical_exam",
      date: data.medicalFitness.examDate || hireDate,
      title: `Apto Médico: ${data.medicalFitness.status === 'fit' ? 'Apto' : data.medicalFitness.status === 'fit_with_restrictions' ? 'Apto con Restricciones' : 'Pendiente / En Evaluación'}`,
      description: data.medicalFitness.restrictions?.length 
        ? `Restricciones: ${data.medicalFitness.restrictions.join(', ')}` 
        : `Evaluación médico-laboral periódica / pre-ocupacional`,
      severity: data.medicalFitness.status === 'fit' ? 'success' : data.medicalFitness.status === 'fit_with_restrictions' ? 'warning' : 'danger',
      badge: "Salud Ocupacional",
    });
  }

  const employee: Employee = {
    id,
    companyId: data.companyId,
    establishmentId: data.establishmentId,
    sectorId: data.sectorId,
    positionId: data.positionId,
    orgId: data.orgId,
    cuil: data.cuil,
    dni,
    firstName: data.firstName,
    lastName: data.lastName,
    hireDate,
    shift: data.shift || "morning",
    category: data.category || "Operario",
    active: true,
    associatedRisks: data.associatedRisks || [],
    medicalFitness: data.medicalFitness || {
      status: "fit",
      examDate: hireDate,
      examType: "pre_occupational",
      notes: "Examen pre-ocupacional registrado al alta",
    },
    ppeDeliveries: [],
    trainings: [],
    accidents: [],
    documents: [],
    history: initialHistory,
    timeline: initialTimeline,
    notes: data.notes || "",
    isContractorStaff: data.isContractorStaff || false,
    contractorId: data.contractorId,
    createdAt: now,
    updatedAt: now,
  };

  const db = getAdminFirestore();
  await db.collection("employees").doc(id).set(employee);
  return employee;
}

export async function updateEmployee(
  id: string,
  updates: Partial<Omit<Employee, "id" | "orgId" | "companyId" | "createdAt">>,
  orgId?: string
): Promise<Employee | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(id);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;

      const existing = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && existing.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      // If CUIL is updated and DNI is not provided, update DNI
      let dni = updates.dni !== undefined ? updates.dni : existing.dni;
      if (updates.cuil && !updates.dni) {
        dni = extractDniFromCuil(updates.cuil);
      }

      const updated: Employee = {
        ...existing,
        ...updates,
        dni,
        id: existing.id, // Immutable
        orgId: existing.orgId, // Immutable
        companyId: existing.companyId, // Immutable
        createdAt: existing.createdAt, // Immutable
        updatedAt: new Date().toISOString(),
      };

      transaction.set(docRef, updated, { merge: true });
      return updated;
    });
  } catch (error) {
    console.error("Error updating employee in transaction:", error);
    return undefined;
  }
}

export async function deleteEmployee(
  id: string, 
  orgId?: string,
  terminationReason?: string,
  terminationDate?: string
): Promise<boolean> {
  if (!id) return false;
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(id);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return false;

      const existing = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && existing.orgId !== orgId) {
        return false; // Fail-closed
      }

      const now = new Date().toISOString();
      const date = terminationDate || now.slice(0, 10);
      const reason = terminationReason || "Baja administrativa";

      existing.active = false;
      existing.terminationDate = date;
      existing.terminationReason = reason;
      existing.updatedAt = now;

      // Append termination timeline event
      const termEvent: EmployeeTimelineEvent = {
        id: `evt_term_${Date.now()}`,
        employeeId: id,
        type: "termination",
        date,
        title: "Baja de Nómina Laboral (Desvinculación)",
        description: `Motivo: ${reason}`,
        severity: "danger",
        badge: "Baja",
      };

      // Append termination history event
      const termHistory: EmployeeHistoryRecord = {
        id: `hist_term_${Date.now()}`,
        date,
        eventType: "termination",
        reason,
      };

      existing.timeline = [termEvent, ...(existing.timeline || [])];
      existing.history = [termHistory, ...(existing.history || [])];

      transaction.set(docRef, existing, { merge: true });
      return true;
    });
  } catch (error) {
    console.error("Error deleting employee in transaction:", error);
    return false;
  }
}

/**
 * Adds an EPP Delivery record (Res. SRT 299/11) and updates Timeline.
 */
export async function addEmployeePpeDelivery(
  employeeId: string,
  data: Omit<EmployeePpeDelivery, "id">,
  orgId?: string
): Promise<{ employee: Employee; ppeDelivery: EmployeePpeDelivery } | undefined> {
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(employeeId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;

      const employee = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && employee.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      const ppeId = `ppe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const ppeDelivery: EmployeePpeDelivery = {
        id: ppeId,
        ...data,
      };

      const timelineEvent: EmployeeTimelineEvent = {
        id: `evt_ppe_${Date.now()}`,
        employeeId,
        type: data.status === 'renewed' ? 'ppe_renewal' : 'ppe_delivery',
        date: data.deliveryDate,
        title: `Entrega de EPP: ${data.itemType} (${data.quantity} un.)`,
        description: `Marca/Modelo: ${data.brandModel || 'Estándar'} | Certificación/IRAM: ${data.standardOrCertification || 'Sello Oficial'}. Constancia firmada: ${data.receiptSigned ? 'Sí' : 'Pendiente'}`,
        severity: "success",
        badge: "EPP SRT 299/11",
        relatedEntityId: ppeId,
      };

      const ppeDeliveries = [ppeDelivery, ...(employee.ppeDeliveries || [])];
      const timeline = [timelineEvent, ...(employee.timeline || [])];

      employee.ppeDeliveries = ppeDeliveries;
      employee.timeline = timeline;
      employee.updatedAt = new Date().toISOString();

      transaction.set(docRef, employee, { merge: true });
      return { employee, ppeDelivery };
    });
  } catch (error) {
    console.error("Error adding PPE delivery in transaction:", error);
    return undefined;
  }
}

/**
 * Adds a Training Record and updates Timeline.
 */
export async function addEmployeeTraining(
  employeeId: string,
  data: Omit<EmployeeTrainingRecord, "id">,
  orgId?: string
): Promise<{ employee: Employee; training: EmployeeTrainingRecord } | undefined> {
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(employeeId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;

      const employee = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && employee.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      const trainingId = `trn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const training: EmployeeTrainingRecord = {
        id: trainingId,
        ...data,
      };

      const isInduction = data.title.toLowerCase().includes("inducción") || (data.topic && data.topic.toLowerCase().includes("inducción"));

      const timelineEvent: EmployeeTimelineEvent = {
        id: `evt_trn_${Date.now()}`,
        employeeId,
        type: isInduction ? "induction" : "training",
        date: data.trainingDate,
        title: `Capacitación: ${data.title}`,
        description: `Duración: ${data.durationHours} hs cátedra | Instructor: ${data.instructorName || 'Departamento H&S'} | Certificado emitido: ${data.certificationIssued ? 'Sí' : 'No'}`,
        severity: "success",
        badge: `${data.durationHours} hs`,
        relatedEntityId: trainingId,
      };

      const trainings = [training, ...(employee.trainings || [])];
      const timeline = [timelineEvent, ...(employee.timeline || [])];

      employee.trainings = trainings;
      employee.timeline = timeline;
      employee.updatedAt = new Date().toISOString();

      transaction.set(docRef, employee, { merge: true });
      return { employee, training };
    });
  } catch (error) {
    console.error("Error adding training in transaction:", error);
    return undefined;
  }
}

/**
 * Adds an Accident / Incident Record and updates Timeline.
 */
export async function addEmployeeAccident(
  employeeId: string,
  data: Omit<EmployeeAccidentRecord, "id">,
  orgId?: string
): Promise<{ employee: Employee; accident: EmployeeAccidentRecord } | undefined> {
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(employeeId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;

      const employee = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && employee.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      const accidentId = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const accident: EmployeeAccidentRecord = {
        id: accidentId,
        ...data,
      };

      const isAccident = data.type === "accident" || data.type === "occupational_disease";

      const timelineEvent: EmployeeTimelineEvent = {
        id: `evt_acc_${Date.now()}`,
        employeeId,
        type: isAccident ? "accident" : "incident",
        date: data.eventDate,
        title: `${isAccident ? 'Accidente Laboral' : 'Incidente / Cuasi-Accidente'}: ${data.severity.toUpperCase()}`,
        description: `${data.description}${data.lostDaysCount ? ` | Días de baja: ${data.lostDaysCount}` : ''}${data.artReportNumber ? ` | Denuncia ART N° ${data.artReportNumber}` : ''}`,
        severity: isAccident ? "danger" : "warning",
        badge: isAccident ? "Siniestro ART" : "Incidente",
        relatedEntityId: accidentId,
      };

      const accidents = [accident, ...(employee.accidents || [])];
      const timeline = [timelineEvent, ...(employee.timeline || [])];

      employee.accidents = accidents;
      employee.timeline = timeline;
      employee.updatedAt = new Date().toISOString();

      transaction.set(docRef, employee, { merge: true });
      return { employee, accident };
    });
  } catch (error) {
    console.error("Error adding accident record in transaction:", error);
    return undefined;
  }
}

/**
 * Adds a Legajo Document Record and updates Timeline.
 */
export async function addEmployeeDocument(
  employeeId: string,
  data: Omit<EmployeeDocumentRecord, "id">,
  orgId?: string
): Promise<{ employee: Employee; document: EmployeeDocumentRecord } | undefined> {
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(employeeId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;

      const employee = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && employee.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const document: EmployeeDocumentRecord = {
        id: docId,
        ...data,
      };

      const timelineEvent: EmployeeTimelineEvent = {
        id: `evt_doc_${Date.now()}`,
        employeeId,
        type: data.category === 'induction' ? 'induction' : 'observation',
        date: data.issueDate || new Date().toISOString().slice(0, 10),
        title: `Documento Incorporado: ${data.title}`,
        description: `Categoría: ${data.category.toUpperCase()} | Archivo: ${data.fileName || 'Adjunto digital'}`,
        severity: "normal",
        badge: "Legajo Digital",
        relatedEntityId: docId,
      };

      const documents = [document, ...(employee.documents || [])];
      const timeline = [timelineEvent, ...(employee.timeline || [])];

      employee.documents = documents;
      employee.timeline = timeline;
      employee.updatedAt = new Date().toISOString();

      transaction.set(docRef, employee, { merge: true });
      return { employee, document };
    });
  } catch (error) {
    console.error("Error adding employee document in transaction:", error);
    return undefined;
  }
}

/**
 * Updates Medical Fitness and updates Timeline.
 */
export async function updateEmployeeMedicalFitness(
  employeeId: string,
  fitnessData: MedicalFitnessRecord,
  orgId?: string
): Promise<Employee | undefined> {
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(employeeId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;

      const employee = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && employee.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      const date = fitnessData.examDate || new Date().toISOString().slice(0, 10);
      const timelineEvent: EmployeeTimelineEvent = {
        id: `evt_med_${Date.now()}`,
        employeeId,
        type: "medical_exam",
        date,
        title: `Examen Médico Ocupacional (${fitnessData.examType || 'Periódico'}): ${fitnessData.status.toUpperCase()}`,
        description: fitnessData.restrictions?.length 
          ? `Restricciones: ${fitnessData.restrictions.join(', ')}`
          : `Aptitud laboral certificada por ${fitnessData.issuingDoctorOrClinic || 'Servicio Médico'}`,
        severity: fitnessData.status === 'fit' ? 'success' : fitnessData.status === 'fit_with_restrictions' ? 'warning' : 'danger',
        badge: "Aptitud SRT",
      };

      employee.medicalFitness = fitnessData;
      employee.timeline = [timelineEvent, ...(employee.timeline || [])];
      employee.updatedAt = new Date().toISOString();

      transaction.set(docRef, employee, { merge: true });
      return employee;
    });
  } catch (error) {
    console.error("Error updating medical fitness in transaction:", error);
    return undefined;
  }
}

/**
 * Transfers employee (Sector / Position / Establishment / Shift change) with history & timeline.
 */
export async function transferEmployee(
  employeeId: string,
  transferData: {
    newEstablishmentId?: string;
    newSectorId?: string;
    newPositionId?: string;
    newPositionTitle?: string;
    newSectorName?: string;
    newShift?: EmployeeShift;
    effectiveDate?: string;
    reason: string;
    registeredBy?: string;
  },
  orgId?: string
): Promise<Employee | undefined> {
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(employeeId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;

      const employee = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && employee.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      const date = transferData.effectiveDate || new Date().toISOString().slice(0, 10);

      const historyRecord: EmployeeHistoryRecord = {
        id: `hist_trf_${Date.now()}`,
        date,
        eventType: "transfer",
        previousPositionId: employee.positionId,
        newPositionId: transferData.newPositionId !== undefined ? transferData.newPositionId : employee.positionId,
        previousSectorId: employee.sectorId,
        newSectorId: transferData.newSectorId !== undefined ? transferData.newSectorId : employee.sectorId,
        previousShift: employee.shift,
        newShift: transferData.newShift || employee.shift,
        reason: transferData.reason,
        registeredBy: transferData.registeredBy,
      };

      const timelineEvent: EmployeeTimelineEvent = {
        id: `evt_trf_${Date.now()}`,
        employeeId,
        type: "transfer",
        date,
        title: `Reasignación / Movimiento de Puesto`,
        description: `Motivo: ${transferData.reason} | Nuevo Puesto: ${transferData.newPositionTitle || 'Actualizado'} | Sector: ${transferData.newSectorName || 'Actualizado'}`,
        severity: "normal",
        badge: "Movimiento",
      };

      if (transferData.newEstablishmentId) {
        employee.establishmentId = transferData.newEstablishmentId;
      }
      if (transferData.newSectorId !== undefined) {
        employee.sectorId = transferData.newSectorId;
      }
      if (transferData.newPositionId !== undefined) {
        employee.positionId = transferData.newPositionId;
      }
      if (transferData.newShift) {
        employee.shift = transferData.newShift;
      }

      employee.history = [historyRecord, ...(employee.history || [])];
      employee.timeline = [timelineEvent, ...(employee.timeline || [])];
      employee.updatedAt = new Date().toISOString();

      transaction.set(docRef, employee, { merge: true });
      return employee;
    });
  } catch (error) {
    console.error("Error transferring employee in transaction:", error);
    return undefined;
  }
}

/**
 * Appends custom timeline event.
 */
export async function addEmployeeTimelineEvent(
  employeeId: string,
  eventData: Omit<EmployeeTimelineEvent, "id" | "employeeId">,
  orgId?: string
): Promise<Employee | undefined> {
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(employeeId);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;

      const employee = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && employee.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      const event: EmployeeTimelineEvent = {
        id: `evt_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        employeeId,
        ...eventData,
      };

      employee.timeline = [event, ...(employee.timeline || [])];
      employee.updatedAt = new Date().toISOString();

      transaction.set(docRef, employee, { merge: true });
      return employee;
    });
  } catch (error) {
    console.error("Error adding timeline event in transaction:", error);
    return undefined;
  }
}

export async function clearEmployeeStore(): Promise<void> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("employees").get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
