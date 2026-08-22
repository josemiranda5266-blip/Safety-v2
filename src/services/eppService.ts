import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { EPPAssignment, EPPItem } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const eppService = {
  getOrgId() {
    return localStorage.getItem('safetyia_active_org_id');
  },
  getCatalogRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'eppCatalog');
  },
  getAssignmentsRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'eppAssignments');
  },

  async getCatalog(): Promise<EPPItem[]> {
    if (!this.getOrgId()) return [];
    const snapshot = await getDocs(this.getCatalogRef());
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as EPPItem));
  },
  async seedCatalog(): Promise<void> {
    const orgId = this.getOrgId();
    if (!orgId) return;
    const existing = await this.getCatalog();
    if (existing.length > 0) return;

    const defaults: Omit<EPPItem, 'id'>[] = [
      { name: 'Casco de Seguridad', category: 'Protección Craneana', description: 'Casco Tipo 1 Clase B' },
      { name: 'Gafas de Seguridad (Transparentes)', category: 'Protección Ocular', description: 'Anti-empaño, protección UV' },
      { name: 'Guantes de Cuero', category: 'Protección Manual', description: 'Guantes de descarne para tareas generales' },
      { name: 'Botas de Seguridad', category: 'Protección Calzado', description: 'Con puntera de acero' },
      { name: 'Protector Auditivo de Copa', category: 'Protección Auditiva', description: 'Atenuación SNR 28dB' },
      { name: 'Arnés de Seguridad', category: 'Protección Altura', description: 'Arnés de cuerpo completo con cabo de vida' }
    ];

    for (const item of defaults) {
      await addDoc(this.getCatalogRef(), item);
    }
  },
  async assignEPP(assignment: Omit<EPPAssignment, 'id'>, companyId: string): Promise<string> {
    const docRef = await addDoc(this.getAssignmentsRef(), { ...assignment, companyId });
    await auditService.logAction('ASSIGN_EPP', 'EPP', docRef.id, auth.currentUser?.uid || 'system', assignment);
    return docRef.id;
  },
  async getAssignments(companyId?: string): Promise<EPPAssignment[]> {
    if (!this.getOrgId()) return [];
    let q = query(this.getAssignmentsRef());
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as EPPAssignment));
  }
};