import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  Layers, 
  Briefcase, 
  ShieldCheck, 
  GraduationCap, 
  AlertTriangle, 
  FileText, 
  Eye, 
  ArrowRightLeft, 
  UserX, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Activity,
  MoreVertical,
  ChevronRight,
  Download,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { Employee, EmployeeShift, MedicalFitnessStatus } from '../../types/tenant';
import { 
  CreateEditEmployeeModal, 
  AddPpeDeliveryModal, 
  AddTrainingModal, 
  AddAccidentModal, 
  TransferEmployeeModal, 
  TerminateEmployeeModal, 
  AddDocumentModal 
} from './EmployeeModals';
import { EmployeeLegajoDetailModal } from './EmployeeLegajoDetailModal';
import { EmployeesBulkUploadModal } from './EmployeesBulkUploadModal';

export const EmployeesScreen: React.FC = () => {
  const { 
    employees, 
    companies, 
    establishments, 
    sectors, 
    positions, 
    activeCompany, 
    activeCompanyId, 
    loading 
  } = useTenant();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>(activeCompanyId || '');
  const [selectedEstFilter, setSelectedEstFilter] = useState<string>('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedMedFilter, setSelectedMedFilter] = useState<string>('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');

  // Active Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<Employee | null>(null);
  
  const [ppeModalEmployee, setPpeModalEmployee] = useState<Employee | null>(null);
  const [trainingModalEmployee, setTrainingModalEmployee] = useState<Employee | null>(null);
  const [accidentModalEmployee, setAccidentModalEmployee] = useState<Employee | null>(null);
  const [transferModalEmployee, setTransferModalEmployee] = useState<Employee | null>(null);
  const [terminateModalEmployee, setTerminateModalEmployee] = useState<Employee | null>(null);
  const [documentModalEmployee, setDocumentModalEmployee] = useState<Employee | null>(null);

  // Sync with global activeCompanyId if changed
  React.useEffect(() => {
    if (activeCompanyId) {
      setSelectedCompanyFilter(activeCompanyId);
    }
  }, [activeCompanyId]);

  // Establishments filtered by selected company
  const availableEstablishments = useMemo(() => {
    if (!selectedCompanyFilter) return establishments;
    return establishments.filter(e => e.companyId === selectedCompanyFilter);
  }, [establishments, selectedCompanyFilter]);

  // Sectors filtered by selected establishment
  const availableSectors = useMemo(() => {
    if (!selectedEstFilter) return sectors;
    return sectors.filter(s => s.establishmentId === selectedEstFilter);
  }, [sectors, selectedEstFilter]);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // 1. Company filter
      if (selectedCompanyFilter && emp.companyId !== selectedCompanyFilter) return false;

      // 2. Establishment filter
      if (selectedEstFilter && emp.establishmentId !== selectedEstFilter) return false;

      // 3. Sector filter
      if (selectedSectorFilter && emp.sectorId !== selectedSectorFilter) return false;

      // 4. Status filter
      if (selectedStatusFilter === 'active' && !emp.active) return false;
      if (selectedStatusFilter === 'inactive' && emp.active) return false;

      // 5. Medical status filter
      if (selectedMedFilter !== 'all' && emp.medicalFitness?.status !== selectedMedFilter) return false;

      // 6. Shift filter
      if (selectedShiftFilter !== 'all' && emp.shift !== selectedShiftFilter) return false;

      // 7. Search text
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const cuil = (emp.cuil || '').toLowerCase();
        const dni = (emp.dni || '').toLowerCase();
        return fullName.includes(query) || cuil.includes(query) || dni.includes(query);
      }

      return true;
    });
  }, [
    employees, 
    selectedCompanyFilter, 
    selectedEstFilter, 
    selectedSectorFilter, 
    selectedStatusFilter, 
    selectedMedFilter, 
    selectedShiftFilter, 
    searchTerm
  ]);

  // Stats
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.active).length;
    const inactive = employees.filter(e => !e.active).length;
    const fitWithRestrictions = employees.filter(e => e.active && e.medicalFitness?.status === 'fit_with_restrictions').length;
    const pendingMed = employees.filter(e => e.active && (!e.medicalFitness?.status || e.medicalFitness?.status === 'pending')).length;
    return { total, active, inactive, fitWithRestrictions, pendingMed };
  }, [employees]);

  // Helpers to resolve names
  const getCompanyName = (cId: string) => companies.find(c => c.id === cId)?.legalName || cId;
  const getEstName = (eId: string) => establishments.find(e => e.id === eId)?.name || eId;
  const getSectorName = (sId?: string) => sId ? (sectors.find(s => s.id === sId)?.name || sId) : 'Sin sector';
  const getPositionTitle = (pId?: string) => pId ? (positions.find(p => p.id === pId)?.title || pId) : 'Sin puesto';

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Gestión Profesional de Trabajadores
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
              Legajos Digitales H&S
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Nómina auditable, trazabilidad de EPP (Res. SRT 299/11), capacitaciones, aptitud médica y siniestralidad
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsBulkUploadModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors active:scale-95 shadow-sm"
            title="Importación masiva mediante planilla CSV o Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Carga Masiva</span>
          </button>

          <button
            onClick={() => {
              setEditingEmployee(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-colors active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Alta de Trabajador</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Nómina Total</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{stats.active} activos / {stats.inactive} bajas</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-medium text-slate-400">Activos en Planta</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{stats.active}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">En nómina vigente</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-medium text-slate-400">Con Restricciones</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">{stats.fitWithRestrictions}</div>
          <div className="text-[11px] text-amber-500/80 mt-0.5">Apto médico condicionado</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-teal-400 mb-1">
            <span className="text-xs font-medium text-slate-400">Exámenes Pendientes</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-bold text-teal-400">{stats.pendingMed}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Apto por auditar</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-xs font-medium text-slate-400">Bajas Archivadas</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400">{stats.inactive}</div>
          <div className="text-[11px] text-rose-500/80 mt-0.5">Legajos en resguardo</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, CUIL o DNI..."
              className="w-full pl-10 pr-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Company Filter */}
          <div>
            <select
              value={selectedCompanyFilter}
              onChange={(e) => {
                setSelectedCompanyFilter(e.target.value);
                setSelectedEstFilter('');
                setSelectedSectorFilter('');
              }}
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas las Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.legalName}</option>
              ))}
            </select>
          </div>

          {/* Establishment Filter */}
          <div>
            <select
              value={selectedEstFilter}
              onChange={(e) => {
                setSelectedEstFilter(e.target.value);
                setSelectedSectorFilter('');
              }}
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos los Establecimientos</option>
              {availableEstablishments.map(est => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div>
            <select
              value={selectedSectorFilter}
              onChange={(e) => setSelectedSectorFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos los Sectores</option>
              {availableSectors.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedStatusFilter === 'all' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({employees.length})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('active')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedStatusFilter === 'active' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Activos ({stats.active})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('inactive')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedStatusFilter === 'inactive' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bajas ({stats.inactive})
              </button>
            </div>

            {/* Medical Fitness Filter */}
            <select
              value={selectedMedFilter}
              onChange={(e) => setSelectedMedFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white text-xs focus:outline-none"
            >
              <option value="all">Todas las Aptitudes Médicas</option>
              <option value="fit">Apto Laboral Total</option>
              <option value="fit_with_restrictions">Apto con Restricciones</option>
              <option value="pending">Examen Pendiente</option>
              <option value="unfit">No Apto</option>
            </select>

            {/* Shift Filter */}
            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white text-xs focus:outline-none"
            >
              <option value="all">Todos los Turnos</option>
              <option value="morning">Turno Mañana</option>
              <option value="afternoon">Turno Tarde</option>
              <option value="night">Turno Noche</option>
              <option value="rotating">Rotativo</option>
            </select>
          </div>

          <div className="text-slate-400 text-xs">
            Mostrando <strong className="text-white">{filteredEmployees.length}</strong> de {employees.length} trabajadores
          </div>
        </div>
      </div>

      {/* Main Workers Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-300 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Trabajador / Identificación</th>
                <th className="px-4 py-3.5">Empresa & Establecimiento</th>
                <th className="px-4 py-3.5">Sector / Puesto</th>
                <th className="px-4 py-3.5">Aptitud Médica</th>
                <th className="px-4 py-3.5">EPP / Capacitaciones</th>
                <th className="px-4 py-3.5">Estado Nómina</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {filteredEmployees.map((emp) => {
                const compName = getCompanyName(emp.companyId);
                const estName = getEstName(emp.establishmentId);
                const secName = getSectorName(emp.sectorId);
                const posTitle = getPositionTitle(emp.positionId);
                const ppeCount = emp.ppeDeliveries?.length || 0;
                const trainCount = emp.trainings?.length || 0;
                const accCount = emp.accidents?.length || 0;

                return (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors group">
                    {/* Worker Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                          {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedEmployeeForDetail(emp)}
                              className="hover:text-blue-400 transition-colors text-left font-bold"
                            >
                              {emp.firstName} {emp.lastName}
                            </button>
                            {emp.isContractorStaff && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/20 font-normal">
                                Contratista
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>CUIL: {emp.cuil}</span>
                            {emp.dni && <span>• DNI: {emp.dni}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Hierarchy Info */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-200">{compName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{estName}</span>
                      </div>
                    </td>

                    {/* Sector & Position */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-200">{posTitle}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span>{secName}</span>
                        <span className="text-slate-600">•</span>
                        <span className="capitalize text-slate-400">{emp.shift || 'Mañana'}</span>
                      </div>
                    </td>

                    {/* Medical Fitness */}
                    <td className="px-4 py-3.5">
                      {emp.medicalFitness?.status === 'fit' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Apto
                        </span>
                      )}
                      {emp.medicalFitness?.status === 'fit_with_restrictions' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300">
                          <AlertCircle className="w-3 h-3" /> Con Restricción
                        </span>
                      )}
                      {emp.medicalFitness?.status === 'unfit' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                          <AlertTriangle className="w-3 h-3" /> No Apto
                        </span>
                      )}
                      {(!emp.medicalFitness?.status || emp.medicalFitness?.status === 'pending') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-500/10 border border-slate-500/20 text-slate-400">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>

                    {/* EPP & Trainings */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700" title="Entregas de EPP">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> {ppeCount} EPP
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700" title="Capacitaciones">
                          <GraduationCap className="w-3 h-3 text-purple-400" /> {trainCount}
                        </span>
                        {accCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-[11px] text-red-300 border border-red-500/20" title="Siniestros registrados">
                            <AlertTriangle className="w-3 h-3 text-red-400" /> {accCount}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Payroll Status */}
                    <td className="px-4 py-3.5">
                      {emp.active ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400" title={emp.terminationReason || 'Baja'}>
                          Baja Lógica
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedEmployeeForDetail(emp)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-medium flex items-center gap-1 transition-all"
                          title="Ver Legajo Digital y Línea de Tiempo"
                        >
                          <Eye className="w-3.5 h-3.5" /> Legajo
                        </button>

                        <button
                          onClick={() => setPpeModalEmployee(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                          title="Entregar EPP (Res. SRT 299/11)"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setTrainingModalEmployee(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition-colors"
                          title="Registrar Capacitación"
                        >
                          <GraduationCap className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setIsCreateModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="Editar Datos"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span>Cargando nómina de trabajadores...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Users className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-slate-400 font-medium">No se encontraron trabajadores con los filtros aplicados.</p>
                        <p className="text-slate-500 text-[11px]">Haga clic en "Alta de Trabajador" para incorporar personal a la nómina.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL INSTANCES --- */}

      {/* 1. Create / Edit Employee Modal */}
      <CreateEditEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingEmployee(null);
        }}
        initialData={editingEmployee}
      />

      {/* 2. Full Legajo Detail Modal */}
      {selectedEmployeeForDetail && (
        <EmployeeLegajoDetailModal
          isOpen={!!selectedEmployeeForDetail}
          onClose={() => setSelectedEmployeeForDetail(null)}
          employee={selectedEmployeeForDetail}
          onOpenEdit={(emp) => {
            setEditingEmployee(emp);
            setIsCreateModalOpen(true);
          }}
          onOpenAddPpe={(emp) => setPpeModalEmployee(emp)}
          onOpenAddTraining={(emp) => setTrainingModalEmployee(emp)}
          onOpenAddAccident={(emp) => setAccidentModalEmployee(emp)}
          onOpenTransfer={(emp) => setTransferModalEmployee(emp)}
          onOpenAddDocument={(emp) => setDocumentModalEmployee(emp)}
          onOpenTerminate={(emp) => setTerminateModalEmployee(emp)}
        />
      )}

      {/* 3. Add PPE Delivery Modal */}
      {ppeModalEmployee && (
        <AddPpeDeliveryModal
          isOpen={!!ppeModalEmployee}
          onClose={() => setPpeModalEmployee(null)}
          employee={ppeModalEmployee}
        />
      )}

      {/* 4. Add Training Modal */}
      {trainingModalEmployee && (
        <AddTrainingModal
          isOpen={!!trainingModalEmployee}
          onClose={() => setTrainingModalEmployee(null)}
          employee={trainingModalEmployee}
        />
      )}

      {/* 5. Add Accident / Incident Modal */}
      {accidentModalEmployee && (
        <AddAccidentModal
          isOpen={!!accidentModalEmployee}
          onClose={() => setAccidentModalEmployee(null)}
          employee={accidentModalEmployee}
        />
      )}

      {/* 6. Transfer Employee Modal */}
      {transferModalEmployee && (
        <TransferEmployeeModal
          isOpen={!!transferModalEmployee}
          onClose={() => setTransferModalEmployee(null)}
          employee={transferModalEmployee}
        />
      )}

      {/* 7. Terminate Employee Modal */}
      {terminateModalEmployee && (
        <TerminateEmployeeModal
          isOpen={!!terminateModalEmployee}
          onClose={() => setTerminateModalEmployee(null)}
          employee={terminateModalEmployee}
        />
      )}

      {/* 8. Add Document Modal */}
      {documentModalEmployee && (
        <AddDocumentModal
          isOpen={!!documentModalEmployee}
          onClose={() => setDocumentModalEmployee(null)}
          employee={documentModalEmployee}
        />
      )}

      {/* 9. Bulk Upload Modal */}
      {isBulkUploadModalOpen && (
        <EmployeesBulkUploadModal
          isOpen={isBulkUploadModalOpen}
          onClose={() => setIsBulkUploadModalOpen(false)}
        />
      )}
    </div>
  );
};
