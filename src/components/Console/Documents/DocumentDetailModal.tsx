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
  FileCheck,
  Sparkles,
  Loader2,
  Award,
  AlertOctagon
} from 'lucide-react';
import { ProfessionalDocument } from '../../../types/documentManagement';
import { getAlertLevelStyle } from '../../../utils/expirationEngine';
import { documentManagementService } from '../../../services/documentManagementService';
import { DocumentRenewModal } from './DocumentRenewModal';

interface AuditReport {
  complianceScore: number;
  complianceStatus: string;
  executiveAuditVerdict: string;
  legalBasis: string[];
  conformities: string[];
  findingsAndGaps: Array<{
    finding: string;
    severity: 'Alta' | 'Media' | 'Baja';
    normativeImpact: string;
  }>;
  actionPlanRecommendations: string[];
}

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
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'audit'>('info');
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Audit State
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  if (!isOpen) return null;

  const alertStyle = getAlertLevelStyle(document.expirationAlertLevel);

  const handleRunAudit = async () => {
    setIsLoadingAudit(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('auth_token') || 'dev-token';
      const res = await fetch('/api/audit-document-compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentTitle: document.title,
          category: document.category,
          documentNumber: document.documentNumber,
          issueDate: document.issueDate,
          expirationDate: document.expirationDate,
          responsibleName: document.responsibleName,
          issuingOrganism: document.issuingOrganism,
          notes: document.notes,
          tags: document.tags,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al ejecutar la auditoría con IA.');
      }

      const data = await res.json();
      setAuditReport(data);
    } catch (err: any) {
      console.error('Error running audit:', err);
      setErrorMsg(err.message || 'No se pudo completar la auditoría con IA.');
    } finally {
      setIsLoadingAudit(false);
    }
  };

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
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'audit'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" /> Auditoría Técnica con IA
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
            ) : activeTab === 'history' ? (
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
            ) : (
              /* AI Technical & Legal Compliance Audit */
              <div className="space-y-5">
                {!auditReport && !isLoadingAudit && (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-slate-50 dark:to-slate-800/40 border border-orange-500/20 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Auditoría Automática de Validez y Cumplimiento SRT
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      Evalúa si este documento ({document.category}) cumple con las formalidades legales, periodicidades reglamentarias, firmas habilitantes y cláusulas obligatorias bajo la normativa argentina.
                    </p>
                    <button
                      onClick={handleRunAudit}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 mx-auto active:scale-95 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Ejecutar Auditoría con IA</span>
                    </button>
                  </div>
                )}

                {isLoadingAudit && (
                  <div className="p-10 text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Auditando documento contra resoluciones SRT y marco legal...
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Verificando validez formal, firmas con matrícula, vigencia y anexos requeridos.
                    </p>
                  </div>
                )}

                {auditReport && !isLoadingAudit && (
                  <div className="space-y-4">
                    {/* Score & Verdict Card */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Dictamen del Auditor IA
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {auditReport.complianceStatus}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {auditReport.executiveAuditVerdict}
                        </p>
                      </div>

                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
                        <span className={`text-2xl font-black ${
                          auditReport.complianceScore >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : auditReport.complianceScore >= 60
                            ? 'text-amber-500'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {auditReport.complianceScore}%
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Conformidad
                        </span>
                      </div>
                    </div>

                    {/* Re-audit Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleRunAudit}
                        className="text-xs text-orange-600 dark:text-orange-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-auditar
                      </button>
                    </div>

                    {/* Legal Bases */}
                    {auditReport.legalBasis && auditReport.legalBasis.length > 0 && (
                      <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1 mb-1.5">
                          <Award className="w-3.5 h-3.5" /> Marco Legal y Resoluciones Aplicables
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {auditReport.legalBasis.map((base, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 font-medium">
                              {base}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conformities */}
                    {auditReport.conformities && auditReport.conformities.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Puntos Conformes Identificados
                        </span>
                        <ul className="space-y-1">
                          {auditReport.conformities.map((c, idx) => (
                            <li key={idx} className="text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-1.5">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Findings & Gaps */}
                    {auditReport.findingsAndGaps && auditReport.findingsAndGaps.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                          <AlertOctagon className="w-3.5 h-3.5" /> Hallazgos y Omisiones Técnicas
                        </span>
                        <div className="space-y-2">
                          {auditReport.findingsAndGaps.map((f, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/60 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900 dark:text-white">{f.finding}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  f.severity === 'Alta'
                                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                                }`}>
                                  Severidad {f.severity}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">{f.normativeImpact}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Plan */}
                    {auditReport.actionPlanRecommendations && auditReport.actionPlanRecommendations.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Acciones Correctivas Recomendadas
                        </span>
                        <ul className="space-y-1">
                          {auditReport.actionPlanRecommendations.map((action, idx) => (
                            <li key={idx} className="text-xs text-amber-950 dark:text-amber-200 flex items-start gap-1.5">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
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
