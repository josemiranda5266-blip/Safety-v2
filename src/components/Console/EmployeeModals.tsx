import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  GraduationCap, 
  AlertTriangle, 
  FileText, 
  ArrowRightLeft, 
  UserX, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2,
  Building2,
  MapPin,
  Layers,
  Briefcase
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { Employee, EmployeeShift, MedicalFitnessStatus, MedicalExamType } from '../../types/tenant';

// --- MODAL 1: CREATE / EDIT EMPLOYEE ---
interface CreateEditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Employee | null;
}

export const CreateEditEmployeeModal: React.FC<CreateEditEmployeeModalProps> = ({ isOpen, onClose, initialData }) => {
  const { 
    companies, 
    establishments, 
    sectors, 
    positions, 
    activeCompanyId, 
    createEmployee, 
    updateEmployee 
  } = useTenant();

  const [companyId, setCompanyId] = useState(activeCompanyId || (companies[0]?.id || ''));
  const [establishmentId, setEstablishmentId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [cuil, setCuil] = useState('');
  const [dni, setDni] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState<EmployeeShift>('morning');
  const [category, setCategory] = useState('Operario');
  const [associatedRisks, setAssociatedRisks] = useState<string[]>([]);
  const [newRiskInput, setNewRiskInput] = useState('');
  const [medStatus, setMedStatus] = useState<MedicalFitnessStatus>('fit');
  const [medExamType, setMedExamType] = useState<MedicalExamType>('pre_occupational');
  const [medDoctor, setMedDoctor] = useState('');
  const [medRestrictions, setMedRestrictions] = useState<string[]>([]);
  const [newRestrictionInput, setNewRestrictionInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isContractorStaff, setIsContractorStaff] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered dropdowns
  const availableEstablishments = establishments.filter(e => e.companyId === companyId);
  const availableSectors = sectors.filter(s => s.establishmentId === establishmentId);
  const availablePositions = positions.filter(p => p.establishmentId === establishmentId && (!sectorId || p.sectorId === sectorId));

  useEffect(() => {
    if (initialData) {
      setCompanyId(initialData.companyId);
      setEstablishmentId(initialData.establishmentId);
      setSectorId(initialData.sectorId || '');
      setPositionId(initialData.positionId || '');
      setCuil(initialData.cuil || '');
      setDni(initialData.dni || '');
      setFirstName(initialData.firstName || '');
      setLastName(initialData.lastName || '');
      setHireDate(initialData.hireDate || new Date().toISOString().slice(0, 10));
      setShift(initialData.shift || 'morning');
      setCategory(initialData.category || 'Operario');
      setAssociatedRisks(initialData.associatedRisks || []);
      setMedStatus(initialData.medicalFitness?.status || 'fit');
      setMedExamType(initialData.medicalFitness?.examType || 'pre_occupational');
      setMedDoctor(initialData.medicalFitness?.issuingDoctorOrClinic || '');
      setMedRestrictions(initialData.medicalFitness?.restrictions || []);
      setNotes(initialData.notes || '');
      setIsContractorStaff(initialData.isContractorStaff || false);
    } else {
      const defaultComp = activeCompanyId || (companies[0]?.id || '');
      setCompanyId(defaultComp);
      const defaultEst = establishments.find(e => e.companyId === defaultComp)?.id || '';
      setEstablishmentId(defaultEst);
      setSectorId('');
      setPositionId('');
      setCuil('');
      setDni('');
      setFirstName('');
      setLastName('');
      setHireDate(new Date().toISOString().slice(0, 10));
      setShift('morning');
      setCategory('Operario');
      setAssociatedRisks(['Riesgo ergonómico', 'Uso de herramientas manuales']);
      setMedStatus('fit');
      setMedExamType('pre_occupational');
      setMedDoctor('');
      setMedRestrictions([]);
      setNotes('');
      setIsContractorStaff(false);
    }
    setError(null);
  }, [initialData, isOpen, activeCompanyId, companies]);

  // Handle position change: auto-suggest standard PPE/risks
  const handlePositionChange = (newPosId: string) => {
    setPositionId(newPosId);
    const pos = positions.find(p => p.id === newPosId);
    if (pos) {
      if (!sectorId && pos.sectorId) {
        setSectorId(pos.sectorId);
      }
      if (pos.standardRequiredPPEIds && pos.standardRequiredPPEIds.length > 0) {
        // add related risks
        const risksToAdd = [...associatedRisks];
        if (pos.requiresAnnualAudiometry && !risksToAdd.includes('Ruido continuo > 85 dBA')) {
          risksToAdd.push('Ruido continuo > 85 dBA');
        }
        if (pos.requiresRespiratoryProtection && !risksToAdd.includes('Polvos / Vapores en suspensión')) {
          risksToAdd.push('Polvos / Vapores en suspensión');
        }
        setAssociatedRisks(risksToAdd);
      }
    }
  };

  const handleAddRisk = () => {
    if (newRiskInput.trim() && !associatedRisks.includes(newRiskInput.trim())) {
      setAssociatedRisks([...associatedRisks, newRiskInput.trim()]);
      setNewRiskInput('');
    }
  };

  const handleRemoveRisk = (risk: string) => {
    setAssociatedRisks(associatedRisks.filter(r => r !== risk));
  };

  const handleAddRestriction = () => {
    if (newRestrictionInput.trim() && !medRestrictions.includes(newRestrictionInput.trim())) {
      setMedRestrictions([...medRestrictions, newRestrictionInput.trim()]);
      setNewRestrictionInput('');
    }
  };

  const handleRemoveRestriction = (res: string) => {
    setMedRestrictions(medRestrictions.filter(r => r !== res));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !establishmentId || !cuil || !firstName || !lastName) {
      setError('Por favor complete los campos obligatorios (Empresa, Establecimiento, CUIL, Nombre, Apellido).');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (initialData) {
        await updateEmployee(initialData.id, {
          sectorId: sectorId || undefined,
          positionId: positionId || undefined,
          cuil,
          dni: dni || undefined,
          firstName,
          lastName,
          hireDate,
          shift,
          category,
          associatedRisks,
          notes,
          isContractorStaff,
          medicalFitness: {
            status: medStatus,
            examType: medExamType,
            examDate: hireDate,
            issuingDoctorOrClinic: medDoctor || undefined,
            restrictions: medRestrictions,
          },
        });
      } else {
        await createEmployee({
          companyId,
          establishmentId,
          sectorId: sectorId || undefined,
          positionId: positionId || undefined,
          cuil,
          dni: dni || undefined,
          firstName,
          lastName,
          hireDate,
          shift,
          category,
          associatedRisks,
          notes,
          isContractorStaff,
          medicalFitness: {
            status: medStatus,
            examType: medExamType,
            examDate: hireDate,
            issuingDoctorOrClinic: medDoctor || undefined,
            restrictions: medRestrictions,
          },
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el trabajador');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {initialData ? 'Editar Legajo de Trabajador' : 'Alta de Nuevo Trabajador (Legajo Digital)'}
              </h3>
              <p className="text-xs text-slate-400">
                Registro oficial con vinculación jerárquica obligatoria y trazabilidad H&S
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Jerarquía Organizacional */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 1. Asignación Jerárquica Obligatoria
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Empresa Empleadora <span className="text-red-400">*</span>
                </label>
                <select
                  value={companyId}
                  disabled={!!initialData}
                  onChange={(e) => {
                    const newCId = e.target.value;
                    setCompanyId(newCId);
                    const firstEst = establishments.find(est => est.companyId === newCId)?.id || '';
                    setEstablishmentId(firstEst);
                    setSectorId('');
                    setPositionId('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  required
                >
                  <option value="" disabled>Seleccione empresa...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.legalName} ({c.cuit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Establecimiento / Planta <span className="text-red-400">*</span>
                </label>
                <select
                  value={establishmentId}
                  disabled={!!initialData}
                  onChange={(e) => {
                    setEstablishmentId(e.target.value);
                    setSectorId('');
                    setPositionId('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  required
                >
                  <option value="" disabled>Seleccione establecimiento...</option>
                  {availableEstablishments.map(est => (
                    <option key={est.id} value={est.id}>{est.name} ({est.code || 'S/C'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Sector Operativo
                </label>
                <select
                  value={sectorId}
                  onChange={(e) => {
                    setSectorId(e.target.value);
                    if (positionId) {
                      const currentPos = positions.find(p => p.id === positionId);
                      if (currentPos && currentPos.sectorId !== e.target.value) {
                        setPositionId('');
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">(Sin sector asignado)</option>
                  {availableSectors.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Puesto de Trabajo
                </label>
                <select
                  value={positionId}
                  onChange={(e) => handlePositionChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">(Sin puesto asignado)</option>
                  {availablePositions.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Datos Personales y Laborales */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" /> 2. Identificación y Parámetros Laborales
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre(s) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. Carlos"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Apellido(s) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. Mendoza"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  CUIL Oficial <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={cuil}
                  onChange={(e) => {
                    setCuil(e.target.value);
                    const clean = e.target.value.replace(/\D/g, '');
                    if (clean.length >= 10 && !dni) {
                      setDni(clean.slice(2, -1));
                    }
                  }}
                  placeholder="20-35888999-4"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  DNI (Documento)
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="35888999"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Turno de Trabajo
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as EmployeeShift)}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="morning">Mañana (06:00 - 14:00)</option>
                  <option value="afternoon">Tarde (14:00 - 22:00)</option>
                  <option value="night">Noche (22:00 - 06:00)</option>
                  <option value="rotating">Rotativo / Cuarto Turno</option>
                  <option value="custom">Personalizado / Flexible</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Categoría Laboral
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej. Oficial Especializado"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="relative flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isContractorStaff}
                    onChange={(e) => setIsContractorStaff(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                  />
                  <span>Personal Tercerizado / Contratista</span>
                </label>
              </div>
            </div>
          </div>

          {/* 3. Matriz de Riesgos Asociados */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> 3. Riesgos Laborales Asociados al Puesto
            </h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {associatedRisks.map((risk) => (
                <span
                  key={risk}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300"
                >
                  {risk}
                  <button
                    type="button"
                    onClick={() => handleRemoveRisk(risk)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {associatedRisks.length === 0 && (
                <span className="text-xs text-slate-500 italic">No hay riesgos asignados a este trabajador.</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRiskInput}
                onChange={(e) => setNewRiskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRisk(); } }}
                placeholder="Ej. Exposición a ruido, Trabajo en altura, Químicos corrosivos..."
                className="flex-1 px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddRisk}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Agregar Riesgo
              </button>
            </div>
          </div>

          {/* 4. Aptitud Médica Inicial */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 4. Aptitud Médico-Laboral (Res. SRT 37/10)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Condición de Aptitud
                </label>
                <select
                  value={medStatus}
                  onChange={(e) => setMedStatus(e.target.value as MedicalFitnessStatus)}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="fit">Apto Laboral Total</option>
                  <option value="fit_with_restrictions">Apto con Restricciones</option>
                  <option value="pending">En Evaluación / Pendiente</option>
                  <option value="unfit">No Apto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tipo de Examen
                </label>
                <select
                  value={medExamType}
                  onChange={(e) => setMedExamType(e.target.value as MedicalExamType)}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="pre_occupational">Pre-ocupacional de Ingreso</option>
                  <option value="periodic">Periódico Anual</option>
                  <option value="transfer">Previo a Transferencia</option>
                  <option value="post_absence">Posterior a Ausencia</option>
                  <option value="exit">De Egreso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Profesional / Clínica Médica
                </label>
                <input
                  type="text"
                  value={medDoctor}
                  onChange={(e) => setMedDoctor(e.target.value)}
                  placeholder="Ej. Medicina Laboral San Lucas"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {medStatus === 'fit_with_restrictions' && (
              <div className="space-y-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <label className="block text-xs font-semibold text-amber-300">
                  Restricciones Médicas Específicas:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {medRestrictions.map((res) => (
                    <span
                      key={res}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-amber-500/20 text-amber-200"
                    >
                      {res}
                      <button
                        type="button"
                        onClick={() => handleRemoveRestriction(res)}
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRestrictionInput}
                    onChange={(e) => setNewRestrictionInput(e.target.value)}
                    placeholder="Ej. No levantar cargas > 15 kg, No trabajar en altura..."
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddRestriction}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Observaciones Generales */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300">
              Observaciones Iniciales del Legajo
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotaciones relevantes de seguridad, habilitaciones previas o antecedentes..."
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium shadow-lg shadow-blue-600/20 transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>{initialData ? 'Guardar Cambios' : 'Crear Legajo de Trabajador'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL 2: ADD PPE DELIVERY (RES. SRT 299/11) ---
interface AddPpeDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export const AddPpeDeliveryModal: React.FC<AddPpeDeliveryModalProps> = ({ isOpen, onClose, employee }) => {
  const { addPpeDelivery } = useTenant();
  const [itemType, setItemType] = useState('Protector auditivo de copa');
  const [brandModel, setBrandModel] = useState('');
  const [standardOrCertification, setStandardOrCertification] = useState('IRAM / Sello Oficial');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [renewalDate, setRenewalDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [receiptSigned, setReceiptSigned] = useState(true);
  const [deliveredBy, setDeliveredBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemType || !deliveryDate) {
      setError('El tipo de EPP y fecha de entrega son requeridos');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addPpeDelivery(employee.id, {
        itemType,
        brandModel: brandModel || undefined,
        standardOrCertification: standardOrCertification || undefined,
        deliveryDate,
        renewalDate: renewalDate || undefined,
        quantity,
        receiptSigned,
        status: 'active',
        deliveredBy: deliveredBy || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar entrega de EPP');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Entrega de EPP (Res. SRT 299/11)
              </h3>
              <p className="text-xs text-slate-400">
                Trabajador: <span className="text-slate-200 font-medium">{employee.firstName} {employee.lastName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Elemento de Protección Personal (EPP) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              placeholder="Ej. Calzado de seguridad con puntera de acero"
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Marca y Modelo</label>
              <input
                type="text"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="Ej. 3M Peltor / Ombú"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Norma / Sello IRAM</label>
              <input
                type="text"
                value={standardOrCertification}
                onChange={(e) => setStandardOrCertification(e.target.value)}
                placeholder="Ej. IRAM 3870"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Fecha Entrega</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Renovación Prev.</label>
              <input
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Cantidad</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Entregado Por</label>
              <input
                type="text"
                value={deliveredBy}
                onChange={(e) => setDeliveredBy(e.target.value)}
                placeholder="Ej. Lic. Especialista H&S"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
            <div className="pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-300 font-medium">
                <input
                  type="checkbox"
                  checked={receiptSigned}
                  onChange={(e) => setReceiptSigned(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500 w-4 h-4"
                />
                <span>Constancia Firmada por Trabajador</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Observaciones</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre talle, capacitación de uso o reemplazo por deterioro..."
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-600/20"
            >
              {saving ? 'Registrando...' : 'Registrar Entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MODAL 3: ADD TRAINING RECORD ---
interface AddTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export const AddTrainingModal: React.FC<AddTrainingModalProps> = ({ isOpen, onClose, employee }) => {
  const { addTraining } = useTenant();
  const [title, setTitle] = useState('Inducción General de Higiene y Seguridad');
  const [topic, setTopic] = useState('Normas de Prevención');
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationHours, setDurationHours] = useState(2.0);
  const [instructorName, setInstructorName] = useState('');
  const [institution, setInstitution] = useState('Servicio de H&S');
  const [certificationIssued, setCertificationIssued] = useState(true);
  const [status, setStatus] = useState<'attended' | 'certified' | 'pending_evaluation' | 'absent'>('certified');
  const [scoreOrGrade, setScoreOrGrade] = useState('100%');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await addTraining(employee.id, {
        title,
        topic: topic || undefined,
        trainingDate,
        durationHours,
        instructorName: instructorName || undefined,
        institution: institution || undefined,
        certificationIssued,
        status,
        scoreOrGrade: scoreOrGrade || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar capacitación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Registrar Capacitación / Formación
              </h3>
              <p className="text-xs text-slate-400">
                Trabajador: <span className="text-slate-200 font-medium">{employee.firstName} {employee.lastName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nombre de la Capacitación <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Uso y Mantenimiento de EPP en Altura"
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Temario / Módulo</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej. Trabajos en Espacios Confinados"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Fecha</label>
              <input
                type="date"
                value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Duración (hs)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={durationHours}
                onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Condición</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="certified">Aprobado y Certificado</option>
                <option value="attended">Asistió (Sin examen)</option>
                <option value="pending_evaluation">Pendiente Evaluación</option>
                <option value="absent">Ausente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nota / Calificación</label>
              <input
                type="text"
                value={scoreOrGrade}
                onChange={(e) => setScoreOrGrade(e.target.value)}
                placeholder="100% / Aprobado"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Instructor / Capacitador</label>
              <input
                type="text"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                placeholder="Ej. Ing. Roberto Paz"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Institución Emisora</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ej. Servicio H&S Interno"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-purple-300 font-medium">
              <input
                type="checkbox"
                checked={certificationIssued}
                onChange={(e) => setCertificationIssued(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-purple-500 w-4 h-4"
              />
              <span>Certificado Oficial Emitido y Entregado al Trabajador</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-purple-600/20"
            >
              {saving ? 'Registrando...' : 'Registrar Capacitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MODAL 4: ADD ACCIDENT / INCIDENT RECORD ---
interface AddAccidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export const AddAccidentModal: React.FC<AddAccidentModalProps> = ({ isOpen, onClose, employee }) => {
  const { addAccident } = useTenant();
  const [type, setType] = useState<'accident' | 'incident' | 'unsafe_act' | 'occupational_disease'>('accident');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [severity, setSeverity] = useState<'first_aid' | 'minor_medical' | 'lost_time' | 'severe' | 'near_miss' | 'fatal'>('lost_time');
  const [description, setDescription] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [bodyPartAffected, setBodyPartAffected] = useState('');
  const [lostDaysCount, setLostDaysCount] = useState(0);
  const [artReportNumber, setArtReportNumber] = useState('');
  const [investigatorName, setInvestigatorName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      setError('La descripción de lo ocurrido es obligatoria');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addAccident(employee.id, {
        type,
        eventDate,
        severity,
        description,
        locationDetails: locationDetails || undefined,
        bodyPartAffected: bodyPartAffected || undefined,
        lostDaysCount: lostDaysCount || undefined,
        daysOffWork: lostDaysCount || undefined,
        artReportNumber: artReportNumber || undefined,
        status: 'reported',
        investigatorName: investigatorName || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar siniestro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Registro de Accidente / Incidente Laboral
              </h3>
              <p className="text-xs text-slate-400">
                Trabajador: <span className="text-slate-200 font-medium">{employee.firstName} {employee.lastName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Evento</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="accident">Accidente de Trabajo (ART)</option>
                <option value="incident">Incidente / Cuasi-accidente</option>
                <option value="unsafe_act">Acto / Condición Insegura</option>
                <option value="occupational_disease">Enfermedad Profesional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Fecha del Evento</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Severidad</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="lost_time">Con Días Perdidos (Baja)</option>
                <option value="first_aid">Primeros Auxilios (Sin baja)</option>
                <option value="minor_medical">Atención Médica Menor</option>
                <option value="near_miss">Casi-accidente</option>
                <option value="severe">Grave</option>
                <option value="fatal">Fatal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Días de Baja</label>
              <input
                type="number"
                min="0"
                value={lostDaysCount}
                onChange={(e) => setLostDaysCount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">N° Denuncia ART</label>
              <input
                type="text"
                value={artReportNumber}
                onChange={(e) => setArtReportNumber(e.target.value)}
                placeholder="ART-2024-XXXX"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Descripción Detallada de los Hechos <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describa cómo ocurrió el evento, causas inmediatas y consecuencias observadas..."
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sector / Ubicación Física</label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="Ej. Taller Mecánico - Torno CNC #2"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Parte del Cuerpo Afectada</label>
              <input
                type="text"
                value={bodyPartAffected}
                onChange={(e) => setBodyPartAffected(e.target.value)}
                placeholder="Ej. Antebrazo izquierdo / Mano"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Investigador H&S Asignado</label>
              <input
                type="text"
                value={investigatorName}
                onChange={(e) => setInvestigatorName(e.target.value)}
                placeholder="Ej. Ing. Laura Méndez"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Medidas Correctivas Inmediatas</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Se detuvo la máquina y se colocó guarda"
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-red-600/20"
            >
              {saving ? 'Registrando...' : 'Registrar Siniestro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MODAL 5: TRANSFER EMPLOYEE (MOVIMIENTO DE PUESTO / SECTOR) ---
interface TransferEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export const TransferEmployeeModal: React.FC<TransferEmployeeModalProps> = ({ isOpen, onClose, employee }) => {
  const { sectors, positions, transferEmployee } = useTenant();
  const [newSectorId, setNewSectorId] = useState(employee.sectorId || '');
  const [newPositionId, setNewPositionId] = useState(employee.positionId || '');
  const [newShift, setNewShift] = useState<EmployeeShift>(employee.shift || 'morning');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Promoción interna / Reasignación operativa');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSectors = sectors.filter(s => s.establishmentId === employee.establishmentId);
  const availablePositions = positions.filter(p => p.establishmentId === employee.establishmentId);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('El motivo del cambio es obligatorio');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await transferEmployee(employee.id, {
        newSectorId: newSectorId || undefined,
        newPositionId: newPositionId || undefined,
        newShift,
        effectiveDate,
        reason,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al reasignar puesto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Reasignación / Pase de Puesto o Sector
              </h3>
              <p className="text-xs text-slate-400">
                Trabajador: <span className="text-slate-200 font-medium">{employee.firstName} {employee.lastName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nuevo Sector</label>
              <select
                value={newSectorId}
                onChange={(e) => setNewSectorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="">(Sin sector)</option>
                {availableSectors.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nuevo Puesto</label>
              <select
                value={newPositionId}
                onChange={(e) => setNewPositionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="">(Sin puesto)</option>
                {availablePositions.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nuevo Turno</label>
              <select
                value={newShift}
                onChange={(e) => setNewShift(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="morning">Mañana</option>
                <option value="afternoon">Tarde</option>
                <option value="night">Noche</option>
                <option value="rotating">Rotativo</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Fecha Efectiva</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Motivo del Cambio / Justificación <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Promoción interna a maquinista CNC"
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              required
            />
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
            💡 El movimiento quedará asentado en el historial cronológico y línea de tiempo del trabajador.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-600/20"
            >
              {saving ? 'Aplicando...' : 'Aplicar Reasignación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MODAL 6: TERMINATE EMPLOYEE (BAJA LÓGICA CON MOTIVO) ---
interface TerminateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export const TerminateEmployeeModal: React.FC<TerminateEmployeeModalProps> = ({ isOpen, onClose, employee }) => {
  const { terminateEmployee } = useTenant();
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().slice(0, 10));
  const [terminationReason, setTerminationReason] = useState('Desvinculación voluntaria / Renuncia');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminationReason || !terminationDate) {
      setError('Por favor complete la fecha y el motivo de la baja');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await terminateEmployee(employee.id, terminationReason, terminationDate);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la baja');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Baja Lógica de Trabajador
              </h3>
              <p className="text-xs text-slate-400">
                {employee.firstName} {employee.lastName} (CUIL: {employee.cuil})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Fecha de Baja / Egreso</label>
            <input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Motivo de Desvinculación</label>
            <textarea
              rows={3}
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="Ej. Renuncia voluntaria, fin de contrato de obra, despido..."
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              required
            />
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
            ⚠️ <strong>Preservación de Auditoría:</strong> El legajo no será eliminado permanentemente. Todos los registros de EPP, capacitaciones, siniestros y exámenes médicos permanecerán archivados para futuras auditorías de ART y SRT.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-red-600/20"
            >
              {saving ? 'Procesando...' : 'Confirmar Baja Lógica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MODAL 7: ADD DOCUMENT TO DIGITAL LEGAJO ---
interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({ isOpen, onClose, employee }) => {
  const { addDocument } = useTenant();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'medical_fitness' | 'induction' | 'afip_alta' | 'ppe_receipt' | 'training_certificate' | 'license_permit' | 'affidavit' | 'other'>('induction');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expirationDate, setExpirationDate] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('El título del documento es obligatorio');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addDocument(employee.id, {
        title,
        category,
        issueDate,
        expirationDate: expirationDate || undefined,
        fileName: fileName || `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        status: 'valid',
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al adjuntar documento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Incorporar Documento a Legajo
              </h3>
              <p className="text-xs text-slate-400">
                {employee.firstName} {employee.lastName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Título del Documento <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Constancia Alta Temprana AFIP / Apto Médico"
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Categoría Documental</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
            >
              <option value="induction">Constancia de Inducción</option>
              <option value="ppe_receipt">Recibo de EPP Firmado (Res. 299/11)</option>
              <option value="medical_fitness">Aptitud Médica / Certificado</option>
              <option value="afip_alta">Alta Temprana AFIP</option>
              <option value="training_certificate">Certificado de Capacitación</option>
              <option value="license_permit">Licencia / Carnet Habilitante</option>
              <option value="affidavit">Declaración Jurada</option>
              <option value="other">Otro Documento</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Fecha Emisión</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Vencimiento (Opcional)</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nombre de Archivo / Referencia</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Ej. constancia_afip_carlos_mendoza.pdf"
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Observaciones</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotaciones complementarias..."
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-600/20"
            >
              {saving ? 'Adjuntando...' : 'Adjuntar Documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
