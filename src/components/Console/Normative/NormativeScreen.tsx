import React, { useState, useEffect } from 'react';
import { normativeService } from '../../../services/normativeService';
import { Norma, LegalRequirement, ComplianceStatus } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';
import { db } from '../../../services/db';
import { 
  Scale, 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Plus, 
  Database, 
  Clock, 
  Sparkles, 
  Search, 
  Bot, 
  X, 
  ShieldAlert, 
  ListChecks, 
  Lightbulb, 
  ArrowRight,
  ExternalLink,
  Edit3,
  Building2
} from 'lucide-react';

interface AIConsultationData {
  norma: string;
  officialSummary: string;
  keyObligations: Array<{
    article: string;
    obligation: string;
    mandatoryEvidence: string;
  }>;
  applicableSectors: string[];
  sanctionsForNonCompliance: string;
  auditChecklist: Array<{
    checkItem: string;
    standard: string;
  }>;
  expertTips: string[];
}

interface AIAuditApplicabilityResult {
  companyProfile: string;
  applicableNorms: Array<{
    norma: string;
    type: string;
    topic: string;
    articleAnexo: string;
    applicability: string;
    reason: string;
    obligation: string;
    evidenceRequired: string;
    frequency: string;
    priority: string;
    selected?: boolean;
  }>;
  recommendations: string[];
}

export const NormativeScreen: React.FC = () => {
  const { activeCompany, establishments, sectors, positions, employees } = useTenant();
  const [normas, setNormas] = useState<Norma[]>([]);
  const [matrix, setMatrix] = useState<LegalRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // AI Modal States
  const [selectedNormaForAI, setSelectedNormaForAI] = useState<Norma | null>(null);
  const [aiConsultationLoading, setAiConsultationLoading] = useState(false);
  const [aiConsultationData, setAiConsultationData] = useState<AIConsultationData | null>(null);
  const [customAIQuestion, setCustomAIQuestion] = useState('');

  // AI Matrix Audit State
  const [showAIAuditModal, setShowAIAuditModal] = useState(false);
  const [aiAuditLoading, setAiAuditLoading] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<AIAuditApplicabilityResult | null>(null);
  const [importingRequirements, setImportingRequirements] = useState(false);

  // Status Edit Modal State
  const [editingReq, setEditingReq] = useState<LegalRequirement | null>(null);
  const [editStatus, setEditStatus] = useState<ComplianceStatus>('PENDIENTE');
  const [editNotes, setEditNotes] = useState('');
  const [editEvidenceUrl, setEditEvidenceUrl] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedNormas = await normativeService.getNormas();
      setNormas(fetchedNormas);
      const fetchedMatrix = await normativeService.getLegalMatrix(activeCompany?.id);
      setMatrix(fetchedMatrix);
    } catch (err) {
      console.error('Error loading normative data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await normativeService.seedDefaultNormas();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const handleConsultAI = async (norma: Norma, specificQuestion?: string) => {
    setSelectedNormaForAI(norma);
    setAiConsultationLoading(true);
    setAiConsultationData(null);
    try {
      const companyDisplayName = activeCompany?.tradeName || activeCompany?.legalName;
      const companyContext = activeCompany ? {
        companyName: companyDisplayName || 'Empresa',
        activity: activeCompany.activityDescription,
        sectors: sectors.map(s => s.name).join(', '),
      } : undefined;

      const result = await db.callAiApi<AIConsultationData>('/api/normative-consultation', {
        normaTitle: norma.norma,
        topic: norma.topic,
        companyContext,
        specificQuestion: specificQuestion || customAIQuestion || undefined,
      });

      setAiConsultationData(result);
    } catch (err: any) {
      console.error('Error in AI consultation:', err);
    } finally {
      setAiConsultationLoading(false);
    }
  };

  const handleRunAIAudit = async () => {
    if (!activeCompany) return;
    setShowAIAuditModal(true);
    setAiAuditLoading(true);
    setAiAuditResult(null);

    try {
      const companyDisplayName = activeCompany.tradeName || activeCompany.legalName;
      const result = await db.callAiApi<AIAuditApplicabilityResult>('/api/audit-normative-applicability', {
        companyName: companyDisplayName,
        activity: activeCompany.activityDescription || 'Industrial / Comercial',
        establishments: establishments.map(e => e.name),
        sectors: sectors.map(s => s.name),
        positions: positions.map(p => p.title),
        employeeCount: employees.length || 15,
      });

      // Mark all as selected by default
      if (result && result.applicableNorms) {
        result.applicableNorms = result.applicableNorms.map(n => ({ ...n, selected: true }));
      }

      setAiAuditResult(result);
    } catch (err: any) {
      console.error('Error running AI audit:', err);
    } finally {
      setAiAuditLoading(false);
    }
  };

  const handleImportAIAuditRequirements = async () => {
    if (!activeCompany || !aiAuditResult) return;
    setImportingRequirements(true);
    try {
      const selectedNorms = aiAuditResult.applicableNorms.filter(n => n.selected !== false);
      
      for (const item of selectedNorms) {
        // Find or create norma in library
        let matchedNorma = normas.find(n => n.norma.toLowerCase() === item.norma.toLowerCase());
        let normaId = matchedNorma?.id;

        if (!normaId) {
          normaId = await normativeService.addNorma({
            norma: item.norma,
            type: (item.type as any) || 'Resolución SRT',
            number: item.norma.split(' ')[1] || 'S/N',
            articleAnexo: item.articleAnexo || 'Art. 1',
            topic: item.topic || 'Seguridad Laboral',
            activity: activeCompany.activityDescription || 'General',
            risk: item.reason || 'Riesgos Laborales',
            obligation: item.obligation,
            validity: 'Vigente',
            modifications: '',
            source: 'SRT / MTEySS',
            evidenceRequired: item.evidenceRequired,
            lastVerified: new Date().toISOString(),
            isVerified: true,
          });
        }

        // Add to company's legal requirements matrix
        await normativeService.createRequirement({
          companyId: activeCompany.id,
          normaId: normaId,
          status: 'PENDIENTE',
          notes: `Generado por Auditoría IA: ${item.reason}. Periodicidad: ${item.frequency || 'Anual'}`,
          evidenceUrl: '',
          lastChecked: new Date().toISOString(),
        });
      }

      setShowAIAuditModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Error importing requirements:', err);
    } finally {
      setImportingRequirements(false);
    }
  };

  const handleAddToMatrix = async (norma: Norma) => {
    if (!activeCompany) return;
    try {
      await normativeService.createRequirement({
        companyId: activeCompany.id,
        normaId: norma.id,
        status: 'PENDIENTE',
        notes: `Agregado desde biblioteca: ${norma.obligation}`,
        evidenceUrl: '',
        lastChecked: new Date().toISOString(),
      });
      await loadData();
    } catch (err: any) {
      console.error('Error adding to matrix:', err);
    }
  };

  const handleSaveCompliance = async () => {
    if (!editingReq) return;
    setUpdatingStatus(true);
    try {
      await normativeService.updateCompliance(
        editingReq.id,
        editStatus,
        editNotes,
        editEvidenceUrl || undefined
      );
      setEditingReq(null);
      await loadData();
    } catch (err: any) {
      console.error('Error updating compliance:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'CUMPLE':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Cumple
          </span>
        );
      case 'NO CUMPLE':
        return (
          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> No Cumple
          </span>
        );
      case 'PENDIENTE':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Pendiente
          </span>
        );
      case 'REVISAR':
        return (
          <span className="px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit border border-purple-200 dark:border-purple-800">
            <AlertCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Revisar
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 rounded-lg text-xs font-bold w-fit">
            No Aplica
          </span>
        );
    }
  };

  const filteredNormas = normas.filter(n =>
    searchTerm ? (
      n.norma.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.obligation.toLowerCase().includes(searchTerm.toLowerCase())
    ) : true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-indigo-500" />
            <span>Motor Normativo Legal & Asistente IA</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión de obligaciones legales y auditoría automatizada con IA (SRT, Ley 19.587, Dec. 351/79).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeCompany && (
            <button
              onClick={handleRunAIAudit}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Auditar Matriz Legal con IA</span>
            </button>
          )}

          {normas.length === 0 && (
            <button 
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Database className="w-4 h-4" /> 
              {seeding ? 'Cargando Base...' : 'Cargar Base Normativa Inicial'}
            </button>
          )}
        </div>
      </div>

      {/* Active Company Context Banner */}
      {!activeCompany ? (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-2xl border border-blue-200 dark:border-blue-800 text-sm flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-semibold mb-0.5">Modo de Biblioteca Global</p>
            <p className="text-xs text-blue-700 dark:text-blue-300/90 leading-relaxed">
              Estás visualizando el catálogo normativo general. Para auditar requerimientos legales, evaluar estado de cumplimiento (Cumple/No Cumple) y generar matrices automáticas, <strong>selecciona una empresa en la barra superior</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {activeCompany.tradeName || activeCompany.legalName}
                </h4>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  {activeCompany.activityDescription || 'Actividad Industrial'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                CUIT: {activeCompany.cuit || 'Sin registrar'} • {establishments.length} Establecimientos • {matrix.length} Requisitos en Matriz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Cumplimiento:
            </span>
            <span className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
              {matrix.length > 0
                ? `${Math.round((matrix.filter(m => m.status === 'CUMPLE').length / matrix.length) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center p-12 text-slate-500 font-medium">Cargando base normativa y matriz legal...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Col 1: Base Normativa Library */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" /> Biblioteca de Normas
              </h3>
              <span className="text-xs text-slate-500 font-medium">{filteredNormas.length} normas</span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por norma, tema o artículo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {filteredNormas.length === 0 ? (
                <div className="text-sm text-slate-500 p-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-2">
                  <p>No se encontraron normas con el término ingresado.</p>
                  {normas.length === 0 && (
                    <button
                      onClick={handleSeed}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Cargar normas predeterminadas
                    </button>
                  )}
                </div>
              ) : (
                filteredNormas.map((norma) => (
                  <div 
                    key={norma.id} 
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all space-y-2.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{norma.norma}</h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {norma.type} • {norma.articleAnexo}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md shrink-0">
                        {norma.topic}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {norma.obligation}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleConsultAI(norma)}
                        className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Consultar IA</span>
                      </button>

                      {activeCompany && (
                        <button 
                          onClick={() => handleAddToMatrix(norma)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold text-xs flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Col 2 & 3: Matriz de Cumplimiento (Company specific) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" /> Matriz de Cumplimiento Legal
              </h3>
              {activeCompany && (
                <span className="text-xs text-slate-500 font-medium">
                  {matrix.length} obligaciones registradas
                </span>
              )}
            </div>
            
            {!activeCompany ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
                <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Matriz Inactiva</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                  Selecciona una empresa en el selector superior para gestionar y auditar su matriz de cumplimiento normativo.
                </p>
              </div>
            ) : matrix.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm space-y-4">
                <Database className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <div>
                  <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-1">Matriz Legal Vacía</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                    Aún no hay requisitos cargados para <strong>{activeCompany.tradeName || activeCompany.legalName}</strong>. Puedes generarlos automáticamente con nuestro asistente de IA o agregarlos manualmente desde la biblioteca.
                  </p>
                </div>
                <button
                  onClick={handleRunAIAudit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Auditar y Generar Matriz con IA</span>
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3.5">Requisito / Norma</th>
                        <th className="px-4 py-3.5">Estado</th>
                        <th className="px-4 py-3.5">Observaciones</th>
                        <th className="px-4 py-3.5">Evidencia</th>
                        <th className="px-4 py-3.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {matrix.map((req) => {
                        const norma = normas.find((n) => n.id === req.normaId);
                        return (
                          <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3.5 max-w-xs">
                              <div className="font-bold text-slate-900 dark:text-white text-sm mb-0.5">
                                {norma?.norma || 'Norma Desconocida'}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                {norma?.obligation}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {getStatusBadge(req.status)}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {req.notes || 'Sin notas registradas'}
                            </td>
                            <td className="px-4 py-3.5">
                              {req.evidenceUrl ? (
                                <a 
                                  href={req.evidenceUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-semibold flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5"/> Ver adjunto
                                </a>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Sin evidencia</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => {
                                  setEditingReq(req);
                                  setEditStatus(req.status);
                                  setEditNotes(req.notes || '');
                                  setEditEvidenceUrl(req.evidenceUrl || '');
                                }}
                                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors"
                                title="Actualizar estado de cumplimiento"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Normative Consultation Modal */}
      {selectedNormaForAI && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/20 text-violet-500 flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Consulta Técnica con Asistente IA
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Norma: <strong className="text-violet-600 dark:text-violet-400">{selectedNormaForAI.norma}</strong> ({selectedNormaForAI.topic})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedNormaForAI(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiConsultationLoading ? (
              <div className="py-12 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Analizando el marco legal y exigencias técnicas de la norma...
                </p>
              </div>
            ) : aiConsultationData ? (
              <div className="space-y-6 text-sm">
                {/* Official Summary */}
                <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 space-y-1.5">
                  <h4 className="font-bold text-violet-900 dark:text-violet-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Resumen y Marco Regulatorio
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {aiConsultationData.officialSummary}
                  </p>
                </div>

                {/* Key Obligations & Mandatory Evidence */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-emerald-500" /> Obligaciones Principales & Evidencia Exigida
                  </h4>

                  <div className="space-y-2">
                    {aiConsultationData.keyObligations.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span>{item.article}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{item.obligation}</p>
                        <div className="pt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Evidencia: {item.mandatoryEvidence}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sanctions & Penalties */}
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-1 text-xs">
                  <h4 className="font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Riesgo Legal por Incumplimiento
                  </h4>
                  <p className="text-rose-800 dark:text-rose-300/90 leading-relaxed">
                    {aiConsultationData.sanctionsForNonCompliance}
                  </p>
                </div>

                {/* Expert Tips */}
                {aiConsultationData.expertTips && aiConsultationData.expertTips.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
                    <h4 className="font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" /> Recomendaciones del Profesional de CySAT
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-amber-950 dark:text-amber-200">
                      {aiConsultationData.expertTips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            {/* Custom Question input */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Hacer otra consulta sobre esta norma..."
                value={customAIQuestion}
                onChange={(e) => setCustomAIQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customAIQuestion.trim()) {
                    handleConsultAI(selectedNormaForAI, customAIQuestion);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={() => handleConsultAI(selectedNormaForAI, customAIQuestion)}
                disabled={aiConsultationLoading || !customAIQuestion.trim()}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <span>Preguntar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Matrix Audit Modal */}
      {showAIAuditModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Auditoría IA de Matriz Legal
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Evaluación para: <strong className="text-indigo-600 dark:text-indigo-400">{activeCompany ? (activeCompany.tradeName || activeCompany.legalName) : ''}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAIAuditModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiAuditLoading ? (
              <div className="py-16 text-center space-y-3">
                <Sparkles className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Evaluando rubro, puestos, sectores y normativa argentina aplicable...
                </p>
                <p className="text-xs text-slate-500">
                  Cruzando Ley 19.587, Decretos Reglamentarios y Resoluciones SRT
                </p>
              </div>
            ) : aiAuditResult ? (
              <div className="space-y-6 text-sm">
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-xs uppercase tracking-wider">
                    Perfil de Riesgo y Operación Detectado
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {aiAuditResult.companyProfile}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Normas Obligatorias & Exigencias Sugeridas ({aiAuditResult.applicableNorms.length})
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Selecciona los requisitos que deseas incorporar a la matriz
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {aiAuditResult.applicableNorms.map((item, idx) => (
                      <label 
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                          item.selected !== false
                            ? 'bg-white dark:bg-slate-800/80 border-indigo-300 dark:border-indigo-700 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected !== false}
                          onChange={(e) => {
                            const updated = [...aiAuditResult.applicableNorms];
                            updated[idx].selected = e.target.checked;
                            setAiAuditResult({ ...aiAuditResult, applicableNorms: updated });
                          }}
                          className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="space-y-1 flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {item.norma}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.priority === 'Crítica' || item.priority === 'Alta'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              Prioridad: {item.priority}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{item.obligation}</p>
                          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>📌 Motivo: {item.reason}</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">📋 Evidencia: {item.evidenceRequired}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowAIAuditModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImportAIAuditRequirements}
                    disabled={importingRequirements}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {importingRequirements
                        ? 'Importando a Matriz...'
                        : `Importar Requisitos Seleccionados (${aiAuditResult.applicableNorms.filter(n => n.selected !== false).length})`}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Compliance Edit Modal */}
      {editingReq && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Actualizar Estado de Cumplimiento
              </h3>
              <button
                onClick={() => setEditingReq(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Estado de Conformidad
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ComplianceStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="CUMPLE">Cumple con la norma</option>
                  <option value="NO CUMPLE">No Cumple (Desvío detectado)</option>
                  <option value="PENDIENTE">Pendiente de evaluación</option>
                  <option value="REVISAR">En revisión técnica</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Observaciones / Hallazgo
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Detallar condiciones observadas, fecha de inspección o acción correctiva..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  URL o Enlace de Evidencia Documental
                </label>
                <input
                  type="text"
                  value={editEvidenceUrl}
                  onChange={(e) => setEditEvidenceUrl(e.target.value)}
                  placeholder="https://... o referencia al legajo documental"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setEditingReq(null)}
                className="px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCompliance}
                disabled={updatingStatus}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {updatingStatus ? 'Guardando...' : 'Guardar Estado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
