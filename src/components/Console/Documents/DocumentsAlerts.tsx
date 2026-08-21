import React from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  FileText, 
  Building2, 
  Calendar, 
  User, 
  Download,
  ArrowRight
} from 'lucide-react';
import { ProfessionalDocument } from '../../../types/documentManagement';
import { getAlertLevelStyle } from '../../../utils/expirationEngine';

interface DocumentsAlertsProps {
  alerts: ProfessionalDocument[];
  isLoading: boolean;
  onRenewDocument: (doc: ProfessionalDocument) => void;
  onSelectDocument: (doc: ProfessionalDocument) => void;
  onDownloadDocument: (doc: ProfessionalDocument) => void;
}

export const DocumentsAlerts: React.FC<DocumentsAlertsProps> = ({
  alerts,
  isLoading,
  onRenewDocument,
  onSelectDocument,
  onDownloadDocument,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          No hay alertas de vencimiento pendientes
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Toda la documentación técnica y legal de tus empresas, establecimientos y trabajadores se encuentra vigente y al día según el Motor de Vencimientos.
        </p>
      </div>
    );
  }

  // Sort alerts by urgency (expired first, then 7d, 15d, 30d, 90d)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const aDays = a.daysUntilExpiration ?? 9999;
    const bDays = b.daysUntilExpiration ?? 9999;
    return aDays - bDays;
  });

  return (
    <div className="space-y-4">
      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Centro de Alertas de Vencimiento Normativo
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Se detectaron {alerts.length} documentos vencidos o con fecha próxima de renovación.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sortedAlerts.map((doc) => {
          const alertStyle = getAlertLevelStyle(doc.expirationAlertLevel);
          return (
            <div
              key={doc.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 ${alertStyle.borderClass}/40 hover:shadow-md`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2.5 rounded-xl ${alertStyle.badgeClass} shrink-0 mt-0.5`}>
                  {doc.expirationAlertLevel === 'expired' ? (
                    <AlertOctagon className="w-5 h-5" />
                  ) : doc.expirationAlertLevel === 'critical_7d' ? (
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${alertStyle.badgeClass}`}>
                      {alertStyle.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700">
                      {doc.category}
                    </span>
                    <span className="text-xs text-slate-400">v{doc.version || 1}</span>
                  </div>

                  <h4 
                    onClick={() => onSelectDocument(doc)}
                    className="text-sm font-bold text-slate-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
                  >
                    {doc.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {doc.companyName || 'Empresa General'}
                    </span>
                    {doc.establishmentName && (
                      <span>• {doc.establishmentName}</span>
                    )}
                    {doc.employeeName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {doc.employeeName}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Vence: {doc.expirationDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  onClick={() => onDownloadDocument(doc)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Descargar versión vigente"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onSelectDocument(doc)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Ver Detalle
                </button>

                <button
                  onClick={() => onRenewDocument(doc)}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/20 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Renovar Versión</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
