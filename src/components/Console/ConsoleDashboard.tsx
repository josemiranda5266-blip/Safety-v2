import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileCheck, 
  Calendar, 
  TrendingUp, 
  ShieldAlert, 
  Plus, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

interface ConsoleDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenCreateCompany: () => void;
  onOpenCreateEstablishment: () => void;
  onOpenCreateSector: () => void;
  onOpenCreatePosition: () => void;
}

export const ConsoleDashboard: React.FC<ConsoleDashboardProps> = ({
  onNavigateTab,
  onOpenCreateCompany,
  onOpenCreateEstablishment,
  onOpenCreateSector,
  onOpenCreatePosition,
}) => {
  const { 
    companies, 
    activeCompany, 
    activeCompanyId, 
    establishments, 
    sectors, 
    positions,
    loading 
  } = useTenant();

  const [searchFilter, setSearchFilter] = useState('');

  // Scoped data based on active company
  const scopedCompanies = activeCompany ? [activeCompany] : companies;
  const scopedEstablishments = establishments.filter((e) => !activeCompanyId || e.companyId === activeCompanyId);
  const scopedSectors = sectors.filter((s) => !activeCompanyId || s.companyId === activeCompanyId);
  const scopedPositions = positions.filter((p) => !activeCompanyId || p.companyId === activeCompanyId);

  // Aggregated indicators
  const totalWorkers = scopedEstablishments.reduce((acc, curr) => acc + (curr.totalWorkers || 0), 0);
  const overallCompliance = activeCompany ? 92 : 88; // Percentage
  const pendingExpirations = activeCompany ? 2 : 7; // Inspections / EPP / Medicals
  const openCorrectiveActions = activeCompany ? 3 : 11;
  const pendingInspections = activeCompany ? 1 : 4;
  const pendingTrainings = activeCompany ? 2 : 6;
  const criticalRisksCount = activeCompany ? 1 : 3;

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Context */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Consola Profesional SG-SST • Ley 19.587 / Dec. 351/79</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {activeCompany ? activeCompany.legalName : 'Panel General Multiempresa'}
            </h1>
            <p className="text-sm text-slate-300">
              {activeCompany ? (
                <span>
                  Supervisión técnica de <strong className="text-white">{scopedEstablishments.length}</strong> establecimientos,{' '}
                  <strong className="text-white">{scopedSectors.length}</strong> sectores y{' '}
                  <strong className="text-white">{scopedPositions.length}</strong> puestos de trabajo.
                </span>
              ) : (
                <span>
                  Gestión integral de <strong className="text-white">{companies.length}</strong> empresas clientes,{' '}
                  <strong className="text-white">{establishments.length}</strong> plantas operativas y{' '}
                  <strong className="text-white">{totalWorkers}</strong> trabajadores activos bajo nómina.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Direct Inspector IA CTA */}
            <button
              id="hero-inspector-ia-btn"
              onClick={() => onNavigateTab('inspector_ia')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Abrir Inspector IA</span>
            </button>

            {!activeCompanyId ? (
              <button
                id="hero-create-company-btn"
                onClick={onOpenCreateCompany}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Empresa</span>
              </button>
            ) : (
              <>
                <button
                  id="hero-create-est-btn"
                  onClick={onOpenCreateEstablishment}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Establecimiento</span>
                </button>
                <button
                  id="hero-create-sector-btn"
                  onClick={onOpenCreateSector}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sector</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Featured AI Tools Banner Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Inspector IA */}
        <div 
          onClick={() => onNavigateTab('inspector_ia')}
          className="group relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-amber-500/5"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
              Visión Artificial • PRO
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="font-extrabold text-base text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
              <span>Inspector IA</span>
              <ArrowUpRight className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-400 line-clamp-2">
              Detección de actos y condiciones inseguras con cámara o fotos, citando Ley 19.587 y Dec. 351/79 con reportes en PDF/Word.
            </p>
          </div>
        </div>

        {/* Card 2: Asistente Normativo IA */}
        <div 
          onClick={() => onNavigateTab('chat')}
          className="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-900 border border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-500/5"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full">
              Asistente Jurídico
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="font-extrabold text-base text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
              <span>Asistente Normativo IA</span>
              <ArrowUpRight className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-400 line-clamp-2">
              Consultas especializadas en legislación laboral de SySO argentina, decretos sectoriales y resoluciones de la SRT.
            </p>
          </div>
        </div>

        {/* Card 3: Matriz IPER & Higiene */}
        <div 
          onClick={() => onNavigateTab('iper')}
          className="group relative overflow-hidden bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-900 border border-rose-500/30 hover:border-rose-500/60 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-rose-500/5"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full">
              Riesgos & Higiene
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="font-extrabold text-base text-white group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
              <span>Matriz IPER & Mediciones</span>
              <ArrowUpRight className="w-4 h-4 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-400 line-clamp-2">
              Evaluación de riesgos PxS, jerarquía de control y protocolos de medición SRT (Ruido, Iluminación, PAT Res. 900/15).
            </p>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid (Req 5 & Req 6) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1: Empresas / Cumplimiento */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {activeCompany ? 'Estado Cumplimiento' : 'Empresas Activas'}
            </span>
            {activeCompany ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Building2 className="w-5 h-5 text-orange-500" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {activeCompany ? `${overallCompliance}%` : companies.length}
            </span>
            {activeCompany && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Auditoría OK
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {activeCompany ? 'Resoluciones SRT vigentes' : `${establishments.length} plantas asignadas`}
          </p>
        </div>

        {/* Metric 2: Establecimientos / Trabajadores */}
        <div 
          onClick={() => onNavigateTab('employees')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm cursor-pointer hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {activeCompany ? 'Nómina de Personal' : 'Trabajadores / Plantas'}
            </span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {activeCompany ? totalWorkers : establishments.length}
            </span>
            <span className="text-xs text-slate-400">
              {activeCompany ? 'operarios' : 'locales'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {activeCompany ? `${scopedPositions.length} puestos definidos` : `${totalWorkers} operarios en total`}
          </p>
        </div>

        {/* Metric 3: Vencimientos & Acciones Correctivas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Acciones Abiertas
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {openCorrectiveActions}
            </span>
            <span className="text-xs font-medium text-slate-400">pendientes</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {pendingExpirations} vencimientos próximos (&lt;30d)
          </p>
        </div>

        {/* Metric 4: Inspecciones & Capacitaciones */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Inspecciones / Cap.
            </span>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {pendingInspections}
            </span>
            <span className="text-xs text-slate-400">/ {pendingTrainings} cursos</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Plan Anual de Capacitación
          </p>
        </div>
      </div>

      {/* Main Hierarchy Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Establishments & Sectors Structure */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Establishments List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <span>Establecimientos y Plantas</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeCompany ? `Sedes de ${activeCompany.legalName}` : 'Todas las locaciones declaradas'}
                </p>
              </div>
              <button
                id="btn-navigate-establishments"
                onClick={() => onNavigateTab('establishments')}
                className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                <span>Ver Todos ({scopedEstablishments.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {scopedEstablishments.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <MapPin className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No hay establecimientos registrados.
                </p>
                <button
                  onClick={onOpenCreateEstablishment}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                >
                  Registrar Establecimiento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scopedEstablishments.slice(0, 4).map((est) => {
                  const estSectors = sectors.filter((s) => s.establishmentId === est.id);
                  const parentComp = companies.find((c) => c.id === est.companyId);
                  return (
                    <div
                      key={est.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-orange-500/40 transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-orange-500 transition-colors">
                            {est.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {est.address}, {est.city} ({est.province})
                          </p>
                        </div>
                        {est.isConstructionSite && (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded">
                            OBRA
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <span>{estSectors.length} sectores</span>
                        <span>{est.totalWorkers || 0} trabajadores</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card: Sectors & Positions Quick Structure */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <span>Sectores y Puestos de Trabajo</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estructura de riesgos higiénicos y requerimientos de EPP
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab('sectors')}
                  className="text-xs font-bold text-amber-500 hover:text-amber-600"
                >
                  Sectores ({scopedSectors.length})
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  onClick={() => onNavigateTab('positions')}
                  className="text-xs font-bold text-amber-500 hover:text-amber-600"
                >
                  Puestos ({scopedPositions.length})
                </button>
              </div>
            </div>

            {scopedSectors.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <p className="text-xs text-slate-400">No hay sectores configurados.</p>
                <button
                  onClick={onOpenCreateSector}
                  className="text-xs text-orange-500 font-bold hover:underline"
                >
                  + Crear primer sector
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {scopedSectors.slice(0, 5).map((sec) => {
                  const secPositions = positions.filter((p) => p.sectorId === sec.id);
                  const parentEst = establishments.find((e) => e.id === sec.establishmentId);
                  return (
                    <div
                      key={sec.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                          {sec.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {sec.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            Establecimiento: {parentEst?.name || 'General'} • {secPositions.length} puestos
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {sec.noiseLevelEstimatedDBA && sec.noiseLevelEstimatedDBA >= 85 && (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded">
                            {sec.noiseLevelEstimatedDBA} dBA (Ruido)
                          </span>
                        )}
                        {sec.requiresSpecificPPE && (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded">
                            EPP Especial
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Compliance Alerts & Quick Actions */}
        <div className="space-y-6">
          {/* Card: Urgent Compliance Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>Vencimientos y Riesgos Críticos</span>
            </h3>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold text-xs">
                  <span>Prueba Hidráulica Extintores</span>
                  <span>Vence en 12d</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Planta Principal • Batería de 14 extintores triclase ABC.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <span>Medición Protocolo PAT (Res. 900/15)</span>
                  <span>Vence en 24d</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Verificación de telurímetro en tablero general y jabalinas.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold text-xs">
                  <span>Capacitación Evacuación e Incendio</span>
                  <span>Planificado</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  18 trabajadores convocados para rol de emergencia.
                </p>
              </div>
            </div>
          </div>

          {/* Card: Direct SG-SST Navigation Links */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Módulos del Programa de Seguridad
            </h3>

            <div className="space-y-1">
              <button
                onClick={() => onNavigateTab('companies')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  <span>Padrón de Empresas</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('establishments')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <span>Establecimientos</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('sectors')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span>Sectores y Puestos</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('employees')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>Nómina de Trabajadores</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('inspections')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-purple-500" />
                  <span>Inspecciones de Campo</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
