import React from 'react';
import { 
  FileText, 
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Building2, 
  Layers, 
  ShieldCheck, 
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { DocumentDashboardMetrics, DocumentCategory, DOCUMENT_CATEGORIES } from '../../../types/documentManagement';

interface DocumentsDashboardProps {
  metrics: DocumentDashboardMetrics | null;
  isLoading: boolean;
  onFilterByCategory: (category: DocumentCategory) => void;
  onFilterByStatus: (alertLevel: string) => void;
}

export const DocumentsDashboard: React.FC<DocumentsDashboardProps> = ({
  metrics,
  isLoading,
  onFilterByCategory,
  onFilterByStatus,
}) => {
  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  const urgentTotal = metrics.expiredCount + metrics.critical7dCount + metrics.urgent15dCount + metrics.warning30dCount;
  const complianceRate = metrics.activeDocuments > 0
    ? Math.round(((metrics.validCount + metrics.noExpiryCount) / metrics.activeDocuments) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Documents */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalDocuments}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Documentos activos</p>
          </div>
        </div>

        {/* Expired */}
        <div 
          onClick={() => onFilterByStatus('expired')}
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-sm flex flex-col justify-between cursor-pointer hover:border-rose-500 transition-colors"
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vencidos</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {metrics.expiredCount}
            </span>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">Acción inmediata</p>
          </div>
        </div>

        {/* Critical ≤ 7 days */}
        <div 
          onClick={() => onFilterByStatus('critical_7d')}
          className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 shadow-sm flex flex-col justify-between cursor-pointer hover:border-orange-500 transition-colors"
        >
          <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">≤ 7 Días</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
              {metrics.critical7dCount}
            </span>
            <p className="text-[11px] text-orange-700 dark:text-orange-300 mt-0.5">Riesgo crítico</p>
          </div>
        </div>

        {/* Warning ≤ 30 days */}
        <div 
          onClick={() => onFilterByStatus('warning_30d')}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-500 transition-colors"
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">≤ 30 Días</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {metrics.warning30dCount + metrics.urgent15dCount}
            </span>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">En seguimiento</p>
          </div>
        </div>

        {/* Notice ≤ 90 days */}
        <div 
          onClick={() => onFilterByStatus('notice_90d')}
          className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 shadow-sm flex flex-col justify-between cursor-pointer hover:border-sky-500 transition-colors"
        >
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">≤ 90 Días</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
              {metrics.notice90dCount}
            </span>
            <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">Aviso preventivo</p>
          </div>
        </div>

        {/* Vigentes & No Expiry */}
        <div 
          onClick={() => onFilterByStatus('valid')}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vigentes</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.validCount + metrics.noExpiryCount}
            </span>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">Conformes</p>
          </div>
        </div>
      </div>

      {/* Compliance & Motor Status Bar */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Índice General de Conformidad Normativa
            </h3>
            <p className="text-xs text-slate-500">
              Porcentaje de documentación vigente y al día según el Motor de Vencimientos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {complianceRate}%
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              complianceRate >= 90
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : complianceRate >= 75
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
            }`}>
              {complianceRate >= 90 ? 'Excelente' : complianceRate >= 75 ? 'Precaución' : 'Crítico'}
            </span>
          </div>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="h-3.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
          {metrics.totalDocuments > 0 ? (
            <>
              <div 
                style={{ width: `${(metrics.expiredCount / metrics.totalDocuments) * 100}%` }} 
                className="bg-rose-500 transition-all"
                title={`Vencidos: ${metrics.expiredCount}`}
              />
              <div 
                style={{ width: `${(metrics.critical7dCount / metrics.totalDocuments) * 100}%` }} 
                className="bg-orange-500 transition-all"
                title={`Críticos ≤ 7d: ${metrics.critical7dCount}`}
              />
              <div 
                style={{ width: `${(metrics.urgent15dCount / metrics.totalDocuments) * 100}%` }} 
                className="bg-amber-500 transition-all"
                title={`Urgentes ≤ 15d: ${metrics.urgent15dCount}`}
              />
              <div 
                style={{ width: `${(metrics.warning30dCount / metrics.totalDocuments) * 100}%` }} 
                className="bg-yellow-400 transition-all"
                title={`Advertencia ≤ 30d: ${metrics.warning30dCount}`}
              />
              <div 
                style={{ width: `${(metrics.notice90dCount / metrics.totalDocuments) * 100}%` }} 
                className="bg-sky-400 transition-all"
                title={`Aviso ≤ 90d: ${metrics.notice90dCount}`}
              />
              <div 
                style={{ width: `${((metrics.validCount + metrics.noExpiryCount) / metrics.totalDocuments) * 100}%` }} 
                className="bg-emerald-500 transition-all"
                title={`Vigentes: ${metrics.validCount + metrics.noExpiryCount}`}
              />
            </>
          ) : (
            <div className="w-full bg-slate-200 dark:bg-slate-700" />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] font-medium text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Vencidos ({metrics.expiredCount})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> ≤ 7d ({metrics.critical7dCount})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> ≤ 15d ({metrics.urgent15dCount})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> ≤ 30d ({metrics.warning30dCount})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> ≤ 90d ({metrics.notice90dCount})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Vigentes ({metrics.validCount + metrics.noExpiryCount})</span>
        </div>
      </div>

      {/* Grid: Categories Breakdown (12 Categories) & Company Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Distribution */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            Distribución por Categorías Normativas H&S
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Total de documentos registrados en los 12 ejes reglamentarios
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {DOCUMENT_CATEGORIES.map((cat) => {
              const count = metrics.byCategory[cat] || 0;
              return (
                <div
                  key={cat}
                  onClick={() => onFilterByCategory(cat)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 leading-tight">
                      {cat}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-orange-500 transition-colors" />
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {count}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">docs</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scope and Company Compliance */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-orange-500" />
              Distribución por Alcance
            </h3>
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Empresa</span>
                <span className="font-bold text-slate-900 dark:text-white">{metrics.byScope.company}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Establecimiento</span>
                <span className="font-bold text-slate-900 dark:text-white">{metrics.byScope.establishment}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Trabajadores (Legajos)</span>
                <span className="font-bold text-slate-900 dark:text-white">{metrics.byScope.employee}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Organización General</span>
                <span className="font-bold text-slate-900 dark:text-white">{metrics.byScope.organization}</span>
              </div>
            </div>
          </div>

          {metrics.byCompany.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-500" /> Empresas con Alertas
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs">
                {metrics.byCompany.map((c) => (
                  <div key={c.companyId} className="p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-semibold truncate max-w-[120px]">{c.companyName}</span>
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      {c.expired > 0 && (
                        <span className="text-rose-600 px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 rounded">
                          {c.expired} venc.
                        </span>
                      )}
                      {c.expiringSoon > 0 && (
                        <span className="text-orange-600 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-950/40 rounded">
                          {c.expiringSoon} por vencer
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
