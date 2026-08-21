import React, { useState } from 'react';
import { 
  X, 
  Download, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  FileText, 
  Calendar, 
  Building2, 
  MapPin, 
  User, 
  Tag, 
  Clock, 
  ShieldCheck, 
  History, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { ProfessionalDocument } from '../../../types/documentManagement';
import { getAlertLevelStyle } from '../../../utils/expirationEngine';
import { documentManagementService } from '../../../services/documentManagementService';
import { DocumentRenewModal } from './DocumentRenewModal';

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ProfessionalDocument;
  onDocumentUpdated: (updated: ProfessionalDocument) => void;
  onDocumentDeleted: (deletedId: string) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  isOpen,
  onClose,
  document,
  onDocumentUpdated,
  onDocumentDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const alertStyle = getAlertLevelStyle(document.expirationAlertLevel);

  const handleDownload = async (version?: number) => {
    setIsDownloading(true);
    try {
      await documentManagementService.downloadDocument(document.id, document.filename, version);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al descargar el archivo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      await documentManagementService.deleteDocument(document.id);
      onDocumentDeleted(document.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al dar de baja el documento.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
        <div 
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {document.category}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${alertStyle.badgeClass}`}>
                    {alertStyle.label}
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    v{document.version || 1}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {document.title}
                </h2>
                {document.documentNumber && (
                  <p className="text-xs text-slate-500">N° / Póliza: {document.documentNumber}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/30">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'info'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileCheck className="w-4 h-4" /> Metadatos y Estado
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <History className="w-4 h-4" /> Historial de Versiones ({(document.versionHistory || []).length || 1})
            </button>
          </div>

          {errorMsg && (
            <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Content Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'info' ? (
              <div className="space-y-5">
                {/* Expiration Status Card */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${alertStyle.bgSubtle} ${alertStyle.borderClass}/30`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${alertStyle.dotClass}`} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Estado de Vigencia: {alertStyle.label}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {document.daysUntilExpiration !== null && document.daysUntilExpiration !== undefined ? (
                          document.daysUntilExpiration < 0 ? (
                            `Vencido hace ${Math.abs(document.daysUntilExpiration)} días`
                          ) : (
                            `Faltan ${document.daysUntilExpiration} días para su vencimiento`
                          )
                        ) : (
                          'Documento de vigencia permanente o sin fecha de vencimiento especificada'
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsRenewOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Renovar
                  </button>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Alcance
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {document.scope === 'company' && 'Empresa'}
                      {document.scope === 'establishment' && 'Establecimiento'}
                      {document.scope === 'employee' && 'Trabajador'}
                      {document.scope === 'organization' && 'Organización General'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Empresa
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {document.companyName || 'No asignada'}
                    </p>
                  </div>

                  {document.establishmentName && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Establecimiento
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {document.establishmentName}
                      </p>
                    </div>
                  )}

                  {document.employeeName && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3" /> Trabajador
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {document.employeeName} {document.employeeCuil && `(CUIL: ${document.employeeCuil})`}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Fecha de Emisión
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {document.issueDate || 'No informada'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Fecha de Vencimiento
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {document.expirationDate || 'Permanente'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> Responsable / Emisor
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {document.responsibleName}
                    </p>
                  </div>

                  {document.issuingOrganism && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Organismo / ART
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {document.issuingOrganism}
                      </p>
                    </div>
                  )}
                </div>

                {/* File information */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {document.filename}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(document.fileSize / (1024 * 1024)).toFixed(2)} MB • {document.mimeType}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload()}
                    disabled={isDownloading}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar</span>
                  </button>
                </div>

                {/* Tags & Notes */}
                {document.tags && document.tags.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Etiquetas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {document.tags.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-300">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {document.notes && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                      Observaciones Técnicas
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      {document.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Version History Chain */
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Trazabilidad inmutable de todas las versiones publicadas y renovadas de este documento.
                </p>

                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6">
                  {(document.versionHistory || []).map((ver) => (
                    <div key={ver.version} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-orange-500 border-2 border-white dark:border-slate-900" />
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Versión v{ver.version} {ver.version === document.version && '(Vigente)'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(ver.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          {ver.changeNotes || 'Actualización de versión'}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span>Subido por: {ver.uploadedByName || 'Profesional'}</span>
                          <button
                            onClick={() => handleDownload(ver.version)}
                            className="text-orange-600 dark:text-orange-400 font-bold hover:underline flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Descargar v{ver.version}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                confirmDelete
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{confirmDelete ? '¿Confirmar Baja Lógica?' : 'Dar de Baja'}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {isRenewOpen && (
        <DocumentRenewModal
          isOpen={isRenewOpen}
          onClose={() => setIsRenewOpen(false)}
          document={document}
          onSuccess={(updated) => {
            onDocumentUpdated(updated);
            setIsRenewOpen(false);
          }}
        />
      )}
    </>
  );
};
