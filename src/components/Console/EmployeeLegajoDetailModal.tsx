import React, { useState } from 'react';
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
  Building2,
  MapPin,
  Layers,
  Briefcase,
  Activity,
  History,
  Download,
  AlertCircle,
  FileCheck,
  Award,
  Sparkles
} from 'lucide-react';
import { 
  Employee, 
  EmployeeTimelineEvent, 
  EmployeePpeDelivery, 
  EmployeeTrainingRecord, 
  EmployeeAccidentRecord, 
  EmployeeDocumentRecord, 
  MedicalFitnessStatus 
} from '../../types/tenant';
import { useTenant } from '../../context/TenantContext';

interface EmployeeLegajoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onOpenEdit: (emp: Employee) => void;
  onOpenAddPpe: (emp: Employee) => void;
  onOpenAddTraining: (emp: Employee) => void;
  onOpenAddAccident: (emp: Employee) => void;
  onOpenTransfer: (emp: Employee) => void;
  onOpenAddDocument: (emp: Employee) => void;
  onOpenTerminate: (emp: Employee) => void;
}

export const EmployeeLegajoDetailModal: React.FC<EmployeeLegajoDetailModalProps> = ({
  isOpen,
  onClose,
  employee,
  onOpenEdit,
  onOpenAddPpe,
  onOpenAddTraining,
  onOpenAddAccident,
  onOpenTransfer,
  onOpenAddDocument,
  onOpenTerminate,
}) => {
  const { companies, establishments, sectors, positions } = useTenant();
  const [activeTab, setActiveTab] = useState<'timeline' | 'ppe' | 'training' | 'accidents' | 'documents' | 'medical_risks' | 'history'>('timeline');
  const [timelineFilter, setTimelineFilter] = useState<string>('all');

  if (!isOpen || !employee) return null;

  // Resolve hierarchy names
  const company = companies.find(c => c.id === employee.companyId);
  const establishment = establishments.find(e => e.id === employee.establishmentId);
  const sector = sectors.find(s => s.id === employee.sectorId);
  const position = positions.find(p => p.id === employee.positionId);

  // Calculate seniority
  const calculateSeniority = (hireDateStr?: string) => {
    if (!hireDateStr) return 'No informada';
    const hire = new Date(hireDateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - hire.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (years > 0) {
      return `${years} año${years > 1 ? 's' : ''} y ${months} mes${months !== 1 ? 'es' : ''}`;
    }
    return `${diffDays} días`;
  };

  // Sort timeline events desc
  const timelineEvents: EmployeeTimelineEvent[] = (employee.timeline || []).slice().sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const filteredTimeline = timelineEvents.filter(ev => {
    if (timelineFilter === 'all') return true;
    return ev.type === timelineFilter;
  });

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'hire':
        return <User className="w-4 h-4 text-blue-400" />;
      case 'induction':
        return <Award className="w-4 h-4 text-cyan-400" />;
      case 'ppe_delivery':
      case 'ppe_renewal':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'training':
        return <GraduationCap className="w-4 h-4 text-purple-400" />;
      case 'accident':
      case 'incident':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'medical_exam':
      case 'medical_fitness_update':
        return <Activity className="w-4 h-4 text-teal-400" />;
      case 'position_change':
      case 'sector_change':
      case 'shift_change':
        return <ArrowRightLeft className="w-4 h-4 text-amber-400" />;
      case 'document_added':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'termination':
        return <UserX className="w-4 h-4 text-rose-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getMedicalStatusBadge = (status?: MedicalFitnessStatus) => {
    switch (status) {
      case 'fit':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Apto Laboral Total
          </span>
        );
      case 'fit_with_restrictions':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <AlertCircle className="w-3.5 h-3.5" /> Apto con Restricciones
          </span>
        );
      case 'unfit':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-300">
            <AlertTriangle className="w-3.5 h-3.5" /> No Apto
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 border border-slate-500/20 text-slate-300">
            <Clock className="w-3.5 h-3.5" /> Examen Pendiente
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP HEADER */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 text-xl font-bold">
              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {employee.firstName} {employee.lastName}
                </h2>
                {employee.active ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Nómina Activa
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                    Baja Registrada
                  </span>
                )}
                {employee.isContractorStaff && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    Personal Contratista
                  </span>
                )}
                {getMedicalStatusBadge(employee.medicalFitness?.status)}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="font-mono">
                  <strong className="text-slate-300 font-semibold">CUIL:</strong> {employee.cuil}
                </span>
                {employee.dni && (
                  <span className="font-mono">
                    <strong className="text-slate-300 font-semibold">DNI:</strong> {employee.dni}
                  </span>
                )}
                <span>
                  <strong className="text-slate-300 font-semibold">Empresa:</strong> {company?.legalName || 'N/A'}
                </span>
                <span>
                  <strong className="text-slate-300 font-semibold">Planta:</strong> {establishment?.name || 'N/A'}
                </span>
                <span>
                  <strong className="text-slate-300 font-semibold">Puesto:</strong> {position?.title || 'Sin asignar'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              onClick={() => onOpenEdit(employee)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              Editar Datos
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* QUICK ACTION TOOLBAR */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenAddPpe(employee)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Entregar EPP (Res. 299/11)
            </button>
            <button
              onClick={() => onOpenAddTraining(employee)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Registrar Capacitación
            </button>
            <button
              onClick={() => onOpenAddAccident(employee)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Registrar Siniestro
            </button>
            <button
              onClick={() => onOpenTransfer(employee)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Reasignar Puesto/Sector
            </button>
            <button
              onClick={() => onOpenAddDocument(employee)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Adjuntar Documento
            </button>
          </div>

          {employee.active && (
            <button
              onClick={() => onOpenTerminate(employee)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
            >
              <UserX className="w-3.5 h-3.5" /> Baja Lógica
            </button>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/60 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" /> Línea de Tiempo ({timelineEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('medical_risks')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'medical_risks'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" /> Riesgos & Aptitud Médica
          </button>
          <button
            onClick={() => setActiveTab('ppe')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'ppe'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> EPP Entregados ({employee.ppeDeliveries?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'training'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Capacitaciones ({employee.trainings?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('accidents')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'accidents'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Siniestros ({employee.accidents?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Documentación ({employee.documents?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" /> Historial de Pases ({employee.history?.length || 0})
          </button>
        </div>

        {/* TAB BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/40">

          {/* TAB 1: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Filter pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-medium mr-1">Filtrar Hitos:</span>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'hire', label: 'Ingreso' },
                  { id: 'induction', label: 'Inducción' },
                  { id: 'ppe_delivery', label: 'EPP' },
                  { id: 'training', label: 'Capacitaciones' },
                  { id: 'accident', label: 'Accidentes' },
                  { id: 'medical_fitness_update', label: 'Aptitud Médica' },
                  { id: 'position_change', label: 'Movimientos' },
                  { id: 'document_added', label: 'Documental' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTimelineFilter(f.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      timelineFilter === f.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Timeline list */}
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {filteredTimeline.map((ev, index) => (
                  <div key={ev.id || index} className="relative group">
                    {/* Timeline Node Point */}
                    <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-slate-900 border-2 border-slate-700 group-hover:border-blue-500 flex items-center justify-center transition-colors">
                      {getTimelineIcon(ev.type)}
                    </div>

                    {/* Timeline Event Card */}
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 group-hover:border-slate-600 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                        <h4 className="text-sm font-semibold text-white">
                          {ev.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{ev.date}</span>
                          {ev.authorName && (
                            <span className="text-slate-500 font-medium">({ev.authorName})</span>
                          )}
                        </div>
                      </div>

                      {ev.description && (
                        <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                          {ev.description}
                        </p>
                      )}

                      {/* Extra Metadata tags */}
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                          {Object.entries(ev.metadata).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded bg-slate-900/60 text-[11px] text-slate-400 font-mono"
                            >
                              <strong className="text-slate-300 font-normal">{k}:</strong> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredTimeline.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    No se encontraron hitos para el filtro seleccionado.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MEDICAL & RISKS */}
          {activeTab === 'medical_risks' && (
            <div className="space-y-6">
              {/* Medical Card */}
              <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-400" /> Aptitud Médica Ocupacional (Res. SRT 37/10)
                  </h3>
                  {getMedicalStatusBadge(employee.medicalFitness?.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <span className="text-xs text-slate-400 block">Tipo de Examen Realizado</span>
                    <span className="text-sm font-semibold text-white">
                      {employee.medicalFitness?.examType === 'pre_occupational' && 'Pre-ocupacional de Ingreso'}
                      {employee.medicalFitness?.examType === 'periodic' && 'Periódico Anual'}
                      {employee.medicalFitness?.examType === 'transfer' && 'Por Cambio de Puesto'}
                      {employee.medicalFitness?.examType === 'post_absence' && 'Posterior a Ausencia'}
                      {employee.medicalFitness?.examType === 'exit' && 'De Egreso'}
                      {!employee.medicalFitness?.examType && 'No especificado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block">Fecha del Examen</span>
                    <span className="text-sm font-semibold text-white">
                      {employee.medicalFitness?.examDate || 'No informada'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block">Clínica / Profesional Habilitado</span>
                    <span className="text-sm font-semibold text-white">
                      {employee.medicalFitness?.issuingDoctorOrClinic || 'No informado'}
                    </span>
                  </div>
                </div>

                {employee.medicalFitness?.restrictions && employee.medicalFitness.restrictions.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-amber-300 block">
                      Restricciones y Recomendaciones Médicas:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {employee.medicalFitness.restrictions.map((res, i) => (
                        <span key={i} className="px-2.5 py-1 bg-amber-500/20 text-amber-200 text-xs rounded-lg font-medium">
                          ⚠️ {res}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Risks Matrix Card */}
              <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" /> Matriz de Riesgos Asociados al Trabajador
                </h3>
                <p className="text-xs text-slate-400">
                  Factores de riesgo identificados para su puesto ({position?.title || 'S/P'}) en {establishment?.name || 'Planta'}:
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  {(employee.associatedRisks || []).map((risk, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {risk}
                    </span>
                  ))}
                  {(!employee.associatedRisks || employee.associatedRisks.length === 0) && (
                    <span className="text-xs text-slate-500 italic">No hay riesgos asociados cargados en el legajo.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PPE (RES. SRT 299/11) */}
          {activeTab === 'ppe' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Registro de Entregas de EPP (Res. SRT 299/11)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Elementos de protección personal provistos con constancia y trazabilidad
                  </p>
                </div>
                <button
                  onClick={() => onOpenAddPpe(employee)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Nueva Entrega EPP
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Elemento (EPP)</th>
                      <th className="px-4 py-3">Marca / Modelo</th>
                      <th className="px-4 py-3">Norma / IRAM</th>
                      <th className="px-4 py-3">Cant.</th>
                      <th className="px-4 py-3">Fecha Entrega</th>
                      <th className="px-4 py-3">Renovación Prev.</th>
                      <th className="px-4 py-3">Firma Recibo</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {(employee.ppeDeliveries || []).map((ppe) => (
                      <tr key={ppe.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-white">{ppe.itemType}</td>
                        <td className="px-4 py-3 text-slate-400">{ppe.brandModel || '-'}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{ppe.standardOrCertification || 'IRAM'}</td>
                        <td className="px-4 py-3 font-semibold">{ppe.quantity}</td>
                        <td className="px-4 py-3">{ppe.deliveryDate}</td>
                        <td className="px-4 py-3 text-slate-400">{ppe.renewalDate || 'N/A'}</td>
                        <td className="px-4 py-3">
                          {ppe.receiptSigned ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Firmado
                            </span>
                          ) : (
                            <span className="text-amber-400 font-medium">Pendiente</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            ppe.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-700 text-slate-400'
                          }`}>
                            {ppe.status === 'active' ? 'En Uso' : ppe.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!employee.ppeDeliveries || employee.ppeDeliveries.length === 0) && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">
                          No hay registros de entrega de EPP para este trabajador.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TRAINING */}
          {activeTab === 'training' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Historial de Capacitaciones e Inducciones
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cursos, horas cátedra y certificados emitidos en materia de H&S
                  </p>
                </div>
                <button
                  onClick={() => onOpenAddTraining(employee)}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Registrar Capacitación
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(employee.trainings || []).map((tr) => (
                  <div key={tr.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white">{tr.title}</h4>
                        <span className="text-xs text-purple-400 font-medium">{tr.topic || 'Higiene y Seguridad'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-300">
                        {tr.durationHours} hs cátedra
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div>
                        <span className="text-slate-500 block">Fecha:</span>
                        <span className="text-slate-200 font-medium">{tr.trainingDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Instructor:</span>
                        <span className="text-slate-200 font-medium">{tr.instructorName || 'Servicio H&S'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Condición:</span>
                        <span className="text-emerald-400 font-semibold">{tr.status === 'certified' ? 'Certificado' : tr.status}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Calificación:</span>
                        <span className="text-slate-200 font-semibold">{tr.scoreOrGrade || 'Aprobado'}</span>
                      </div>
                    </div>

                    {tr.certificationIssued && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium pt-2 border-t border-slate-700/60">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Certificado emitido y archivado en legajo
                      </div>
                    )}
                  </div>
                ))}

                {(!employee.trainings || employee.trainings.length === 0) && (
                  <div className="col-span-2 text-center py-12 text-slate-500 text-xs italic border border-dashed border-slate-800 rounded-xl">
                    No hay capacitaciones registradas en el legajo del trabajador.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ACCIDENTS & INCIDENTS */}
          {activeTab === 'accidents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Registro de Siniestralidad (Accidentes e Incidentes)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Historial auditable de eventos laborales, reportes ART y días de baja
                  </p>
                </div>
                <button
                  onClick={() => onOpenAddAccident(employee)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Registrar Siniestro
                </button>
              </div>

              <div className="space-y-3">
                {(employee.accidents || []).map((acc) => (
                  <div key={acc.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          acc.type === 'accident'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {acc.type === 'accident' ? 'Accidente de Trabajo' : acc.type}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">{acc.eventDate}</span>
                        {acc.artReportNumber && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-[11px] text-blue-400 font-mono">
                            Denuncia ART: {acc.artReportNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-rose-400">
                        {acc.lostDaysCount || acc.daysOffWork ? `${acc.lostDaysCount || acc.daysOffWork} días de baja` : 'Sin días perdidos'}
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                      {acc.description}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 pt-1">
                      <div>
                        <span className="text-slate-500 block">Severidad:</span>
                        <span className="text-slate-300 font-medium">{acc.severity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ubicación:</span>
                        <span className="text-slate-300 font-medium">{acc.locationDetails || 'No informada'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Parte del Cuerpo:</span>
                        <span className="text-slate-300 font-medium">{acc.bodyPartAffected || 'No informada'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Investigador H&S:</span>
                        <span className="text-slate-300 font-medium">{acc.investigatorName || 'En asignación'}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {(!employee.accidents || employee.accidents.length === 0) && (
                  <div className="text-center py-12 text-emerald-400/80 text-xs italic border border-dashed border-slate-800 rounded-xl flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
                    <span>Sin registro de accidentes o incidentes laborales (0 días perdidos).</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Documentación Digitalizada del Legajo
                  </h3>
                  <p className="text-xs text-slate-400">
                    Certificados médicos, constancias de inducción, altas AFIP y recibos
                  </p>
                </div>
                <button
                  onClick={() => onOpenAddDocument(employee)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Adjuntar Documento
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(employee.documents || []).map((doc) => (
                  <div key={doc.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white mb-0.5">{doc.title}</h4>
                        <span className="text-[11px] text-slate-400 block font-mono">{doc.fileName || 'documento.pdf'}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span>Emisión: {doc.issueDate}</span>
                          {doc.expirationDate && <span>• Vence: {doc.expirationDate}</span>}
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      Válido
                    </span>
                  </div>
                ))}

                {(!employee.documents || employee.documents.length === 0) && (
                  <div className="col-span-2 text-center py-12 text-slate-500 text-xs italic border border-dashed border-slate-800 rounded-xl">
                    No hay documentos anexados al legajo.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: HISTORIAL DE PASES */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Historial de Movimientos y Pases Internos
                </h3>
                <p className="text-xs text-slate-400">
                  Registro cronológico de transferencias de sector, puesto o turno
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Fecha Efectiva</th>
                      <th className="px-4 py-3">Puesto</th>
                      <th className="px-4 py-3">Sector</th>
                      <th className="px-4 py-3">Turno</th>
                      <th className="px-4 py-3">Motivo / Justificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {(employee.history || []).map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-white">{h.effectiveDate || h.startDate}</td>
                        <td className="px-4 py-3 text-slate-200">
                          {positions.find(p => p.id === h.positionId)?.title || h.positionId || 'S/P'}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {sectors.find(s => s.id === h.sectorId)?.name || h.sectorId || 'S/S'}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{h.shift || 'Mañana'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{h.reason || 'Movimiento operativo'}</td>
                      </tr>
                    ))}
                    {(!employee.history || employee.history.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">
                          No se registran cambios de puesto o sector posteriores al ingreso.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Antigüedad en la empresa: <strong className="text-slate-200">{calculateSeniority(employee.hireDate)}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Cerrar Legajo
          </button>
        </div>

      </div>
    </div>
  );
};
