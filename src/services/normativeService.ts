import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Norma, LegalRequirement } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const normativeService = {
  getOrgId() {
    return localStorage.getItem('safetyia_active_org_id') || localStorage.getItem('safety_ia_active_org_id') || 'org_demo_1';
  },
  getNormasRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'normas');
  },
  getRequirementsRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'legalRequirements');
  },
  
  async addNorma(norma: Omit<Norma, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getNormasRef(), norma);
    await auditService.logAction('ADD_NORMA', 'Normative', docRef.id, auth.currentUser?.uid || 'system', norma);
    return docRef.id;
  },
  async getNormas(): Promise<Norma[]> {
    if (!this.getOrgId()) return [];
    const snapshot = await getDocs(this.getNormasRef());
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Norma));
  },
  async seedDefaultNormas(): Promise<void> {
    const orgId = this.getOrgId();
    if (!orgId) return;
    const existing = await this.getNormas();
    if (existing.length > 0) return; // Already seeded

    const defaultNormas: Omit<Norma, 'id'>[] = [
      {
        norma: 'Resolución 299/11',
        type: 'Resolución SRT',
        number: '299/11',
        articleAnexo: 'Anexo I',
        topic: 'Elementos de Protección Personal (EPP)',
        activity: 'General',
        risk: 'Riesgos Generales',
        obligation: 'Entrega de Elementos de Protección Personal y provisión de ropa de trabajo con registro en formulario oficial',
        validity: 'Vigente',
        modifications: '',
        source: 'SRT',
        evidenceRequired: 'Formulario de entrega de EPP firmado (Anexo I)',
        lastVerified: new Date().toISOString(),
        isVerified: true
      },
      {
        norma: 'Resolución 905/15',
        type: 'Resolución SRT',
        number: '905/15',
        articleAnexo: 'Art. 2',
        topic: 'Servicios de Higiene y Seguridad',
        activity: 'General',
        risk: 'Falta de Gestión Preventiva',
        obligation: 'Funciones conjuntas del servicio de Higiene y Seguridad y Medicina del Trabajo. Libro de actas y relevamiento anual.',
        validity: 'Vigente',
        modifications: '',
        source: 'SRT',
        evidenceRequired: 'Libro de actas visado, constancia de visitas',
        lastVerified: new Date().toISOString(),
        isVerified: true
      },
      {
        norma: 'Resolución 84/12',
        type: 'Resolución SRT',
        number: '84/12',
        articleAnexo: 'Protocolo',
        topic: 'Iluminación',
        activity: 'General',
        risk: 'Iluminación Deficiente',
        obligation: 'Medición de nivel de iluminación según protocolo oficial de SRT.',
        validity: 'Vigente',
        modifications: '',
        source: 'SRT',
        evidenceRequired: 'Protocolo de medición firmado por profesional',
        lastVerified: new Date().toISOString(),
        isVerified: true
      }
    ];

    for (const norma of defaultNormas) {
      await addDoc(this.getNormasRef(), norma);
    }
  },
  async getLegalMatrix(companyId?: string): Promise<LegalRequirement[]> {
    if (!this.getOrgId()) return [];
    let q = query(this.getRequirementsRef());
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as LegalRequirement));
  },
  async createRequirement(req: Omit<LegalRequirement, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getRequirementsRef(), req);
    return docRef.id;
  },
  async updateCompliance(requirementId: string, status: LegalRequirement['status'], notes: string, evidenceUrl?: string): Promise<void> {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    const docRef = doc(dbFirestore, 'organizations', orgId, 'legalRequirements', requirementId);
    
    const updateData: any = { status, notes, lastChecked: new Date().toISOString() };
    if (evidenceUrl) updateData.evidenceUrl = evidenceUrl;
    
    await updateDoc(docRef, updateData);
    await auditService.logAction('UPDATE_COMPLIANCE', 'Normative', requirementId, auth.currentUser?.uid || 'system', { status });
  }
};