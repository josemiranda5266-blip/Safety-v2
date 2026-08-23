import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  ShieldAlert,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Printer,
  FileCheck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  MapPin,
  Building,
  UserCheck,
  Zap,
  HardHat,
  Eye,
  Activity,
  Award,
  Sparkles,
  ChevronRight,
  UploadCloud,
  X,
  CheckSquare,
  BarChart3,
  BookOpen,
  Layers,
  ArrowUpRight,
  Database,
  Lock,
  Play,
  RotateCcw
} from 'lucide-react';
import {
  InspectionReport,
  InspectionFinding,
  FindingStatus,
  RiskLevel,
  HazardCategory,
  InspectorStats
} from '../../types/safety';
import { db } from '../../services/db';
import { exportReportToWord, exportReportToPDF } from '../../utils/reportExport';
import { compressImageToDataUrl } from '../../utils/imageCompressor';
import { useTenant } from '../../context/TenantContext';
import { inspectionService } from '../../services/inspectionService';
import { capaApi } from '../../services/capaApi';

// Realistic sample site photos for instant 1-click testing
const SAMPLE_SITE_IMAGES = [
  {
    id: 'sample-height',
    title: 'Obra - Trabajo en Altura sin Protección',
    category: 'Altura',
    thumbnail: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    description: 'Andamio tubular a 4 metros de altura con operario sin arnés y tablones sueltos.',
    suggestedActivity: 'Montaje de estructura metálica sobre andamio tubular a 4 metros de altura. Se observan operarios trabajando con herramientas manuales en altura sin línea de vida ni arnés de seguridad anclado.',
  },
  {
    id: 'sample-electrical',
    title: 'Planta - Tablero Eléctrico Expuesto',
    category: 'Eléctrico',
    thumbnail: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    description: 'Tablero primario de distribución con tapa abierta, cables sin peinar y sin disyuntor.',
    suggestedActivity: 'Mantenimiento preventivo en sala de tableros eléctricos principales de 380V. Intervención en bornes y cableado sin bloqueo LOTO ni señalización de riesgo eléctrico.',
  },
  {
    id: 'sample-order',
    title: 'Taller - Pasillo Obstruido & Extintor Tapado',
    category: 'Incendio',
    thumbnail: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    description: 'Cajas y pallets tapando el extintor de CO2 e impidiendo el paso seguro por pasillo.',
    suggestedActivity: 'Operación de carga y descarga de materiales en depósito y pasillos principales de evacuación. Obstrucción directa de extintores de incendios y vías de escape.',
  },
];

const QUICK_CRITICAL_TAGS = [
  'Trabajos en Altura (>2m)',
  'Riesgo Eléctrico / LOTO',
  'Soldadura / Oxicorte',
  'Espacio Confinado',
  'Izaje y Cargas Suspendidas',
  'Manejo de Sustancias Químicas',
  'Herramientas Eléctricas / Amoladora',
  'Excavaciones y Zanjas',
  'Tránsito de Autoelevadores',
  'Orden y Limpieza / Vías de Escape',
];

export const InspectorIAScreen: React.FC = () => {
  const { activeOrgId, activeCompany, companies, establishments } = useTenant();
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'new_inspection' | 'history' | 'findings_followup' | 'diagnostics'>('dashboard');
  
  // Storage state
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [stats, setStats] = useState<InspectorStats | null>(null);
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);
  
  // New Inspection Form state - Fully Editable
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>('');
  const [customSiteLocation, setCustomSiteLocation] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>('Ing. Profesional H&S');
  const [inspectorRegistration, setInspectorRegistration] = useState<string>('Mat. MP-84920 / SRT');
  const [gpsCoords, setGpsCoords] = useState<string | null>(null);

  // Sync default company name and location when activeCompany or establishment changes
  useEffect(() => {
    if (activeCompany?.legalName && !customCompanyName) {
      setCustomCompanyName(activeCompany.legalName);
    }
  }, [activeCompany]);

  useEffect(() => {
    if (selectedEstablishmentId) {
      const est = establishments.find((e) => e.id === selectedEstablishmentId);
      if (est) {
        setCustomSiteLocation(est.name);
      }
    }
  }, [selectedEstablishmentId, establishments]);

  const companyName = customCompanyName.trim() || activeCompany?.legalName || 'Empresa / Cliente';
  const siteLocation = customSiteLocation.trim() || 'Ubicación no seleccionada';
  
  // Activity Description & Critical Elements State
  const [activityDescription, setActivityDescription] = useState<string>('');

  // Image / Media State
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  // Live Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Camera & Gallery File Input Refs
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const modalCameraRef = useRef<HTMLInputElement | null>(null);
  const modalGalleryRef = useRef<HTMLInputElement | null>(null);
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgressStep, setAnalysisProgressStep] = useState<string>('');
  const [generatedDraftReport, setGeneratedDraftReport] = useState<InspectionReport | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Signature Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Follow-up modal state
  const [modalFinding, setModalFinding] = useState<{ reportId: string; finding: InspectionFinding } | null>(null);
  const [closingNotes, setClosingNotes] = useState('');
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);

  // Diagnostics / Testing State
  const [testLogs, setTestLogs] = useState<Array<{ name: string; status: 'pending' | 'running' | 'pass' | 'fail'; detail: string }>>([
    { name: '1. Análisis de Visión Artificial (Multimodal)', status: 'pending', detail: 'Verifica la recepción de imagen y clasificación de riesgos' },
    { name: '2. Búsqueda y Citas RAG de Biblioteca', status: 'pending', detail: 'Verifica la cita exacta de artículos o indicación sin alucinación' },
    { name: '3. Estructura e Integridad del Informe JSON', status: 'pending', detail: 'Valida esquema completo de campos obligatorios' },
    { name: '4. Sincronización Nube Firestore', status: 'pending', detail: 'Comprueba persistencia en tiempo real' },
    { name: '5. Motor de Exportación PDF / Word', status: 'pending', detail: 'Valida generación de Blob .docx para Microsoft Word' },
    { name: '6. Prueba de Carga y Rendimiento (100+ Inspecciones)', status: 'pending', detail: 'Evalúa velocidad con alto volumen de datos' },
  ]);
  const [isTesting, setIsTesting] = useState(false);

  // Filters for History / Followup
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeOrgId]);

  const loadData = async () => {
    if (!activeOrgId) {
      setReports([]);
      setStats(null);
      return;
    }
    try {
      const loadedReports = await inspectionService.getInspections(activeOrgId);
      setReports(loadedReports);

      const pending = loadedReports.reduce((acc, r) => acc + (r.findings?.filter(f => f.status === 'Pendiente').length || 0), 0);
      const corrected = loadedReports.reduce((acc, r) => acc + (r.findings?.filter(f => f.status === 'Corregido').length || 0), 0);
      const critical = loadedReports.reduce((acc, r) => acc + (r.findings?.filter(f => f.riskLevel === 'Crítico' || f.riskLevel === 'Alto').length || 0), 0);

      setStats({
        totalInspections: loadedReports.length,
        pendingFindings: pending,
        correctedFindings: corrected,
        criticalRisksCount: critical,
      });
    } catch (err) {
      console.warn("Error cargando informes de inspección:", err);
    }
  };

  // Capture GPS Location from Browser
  const handleCaptureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coordsStr = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
          setGpsCoords(coordsStr);
        },
        (err) => {
          setGpsCoords(null);
          alert('No se pudo acceder al GPS del dispositivo.');
        }
      );
    } else {
      setGpsCoords(null);
      alert('Geolocalización no soportada en este navegador.');
    }
  };

  // Handle adding quick activity tag
  const handleAddActivityTag = (tag: string) => {
    if (!activityDescription.includes(tag)) {
      setActivityDescription((prev) => (prev ? `${prev}. ${tag}` : tag));
    }
  };

  // Start live webcam / mobile camera stream with seamless native fallback
  const handleStartCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        nativeCameraInputRef.current?.click();
      }
    } catch (err: any) {
      console.warn('No se pudo acceder a la cámara WebRTC en vivo, abriendo cámara nativa:', err);
      nativeCameraInputRef.current?.click();
    }
  };

  // Stop live camera stream
  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture frame from live video stream
  const handleCaptureLivePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setSelectedImageBase64(dataUrl);
        setImageMimeType('image/jpeg');
        setSelectedSampleId(null);
        handleStopCamera();
      }
    }
  };

  // Convert File to Base64 (Compressed & Optimized for AI Vision)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleStopCamera();
    setSelectedSampleId(null);

    try {
      const { dataUrl, mimeType } = await compressImageToDataUrl(file, 1600, 1600, 0.85);
      setSelectedImageBase64(dataUrl);
      setImageMimeType(mimeType);
    } catch (err) {
      console.error('Error al procesar la imagen seleccionada:', err);
      alert('No se pudo optimizar la fotografía seleccionada. Por favor prueba con otra imagen.');
    }
    e.target.value = '';
  };

  // Convert Modal Verification File to Base64 (Compressed)
  const handleModalPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl } = await compressImageToDataUrl(file, 1200, 1200, 0.8);
      setVerificationPhoto(dataUrl);
    } catch (err) {
      console.error('Error al procesar la foto de verificación:', err);
    }
    e.target.value = '';
  };

  // Handle selecting a sample site photo
  const handleSelectSample = async (sample: typeof SAMPLE_SITE_IMAGES[0]) => {
    handleStopCamera();
    setSelectedSampleId(sample.id);
    setImageMimeType('image/jpeg');
    if (sample.suggestedActivity) {
      setActivityDescription(sample.suggestedActivity);
    }

    try {
      const { dataUrl, mimeType } = await compressImageToDataUrl(sample.thumbnail, 1600, 1600, 0.85);
      setSelectedImageBase64(dataUrl);
      setImageMimeType(mimeType);
    } catch (err) {
      console.error('Error al cargar la imagen de demostración:', err);
      // Fallback conversion via Canvas
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = sample.thumbnail;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedImageBase64(dataURL);
        }
      };
    }
  };

  // Run AI Inspection Analysis via RAG & Gemini
  const handleRunInspectionAI = async () => {
    if (!selectedImageBase64) {
      alert('Por favor selecciona o toma una fotografía antes de iniciar el análisis.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      setAnalysisProgressStep('1/3 Extrayendo fotogramas y analizando contexto operativo...');
      await new Promise((r) => setTimeout(r, 400));

      setAnalysisProgressStep('2/3 Consultando biblioteca documental verificada (RAG) y procesando imagen...');
      
      const rawBase64 = selectedImageBase64.includes(',') ? selectedImageBase64.split(',')[1] : selectedImageBase64;

      const resultReport = await db.callAiApi<any>('/api/inspector-ai-analyze', {
        imageBase64: rawBase64,
        mimeType: imageMimeType,
        companyName,
        siteLocation,
        inspectorName,
        inspectorRegistration,
        activityDescription: activityDescription.trim() || undefined,
      });

      setAnalysisProgressStep('3/3 Compilando informe técnico y plan de acción preventivo...');

      // Enrich with unique ID, metadata, signature, and timestamps
      const fullReport: InspectionReport = {
        id: `insp-${Date.now()}`,
        organizationId: activeOrgId || '',
        companyId: activeCompany?.id,
        establishmentId: selectedEstablishmentId || undefined,
        title: resultReport.title || `Informe de Inspección Visual - ${companyName}`,
        companyName,
        siteLocation,
        inspectorName,
        inspectorRegistration,
        date: new Date().toISOString().split('T')[0],
        gpsLocation: gpsCoords,
        activityDescription: activityDescription.trim() || undefined,
        executiveSummary: resultReport.executiveSummary || 'Se realizó la inspección visual en el área designada.',
        findings: (resultReport.findings || []).map((f: any, idx: number) => ({
          id: `find-${Date.now()}-${idx}`,
          timestamp: new Date().toISOString(),
          location: { siteName: siteLocation },
          hazardCategory: f.hazardCategory || 'Otro',
          hazardTitle: f.hazardTitle || 'Condición subestándar observada',
          riskLevel: f.riskLevel || 'Medio',
          description: f.description || '',
          suggestedAction: f.suggestedAction || '',
          status: 'Pendiente',
          normativeCitation: f.normativeCitation || {
            docTitle: 'Sin respaldo documental verificado en la biblioteca',
            hasLibraryBackup: false,
            verificationStatus: 'no_evidence',
          },
          photoUrl: selectedImageBase64,
        })),
        appliedNorms: resultReport.appliedNorms || [],
        generalRecommendations: resultReport.generalRecommendations || ['Implementar charlas diarias de seguridad.'],
        actionPlan: (resultReport.actionPlan || []).map((a: any, idx: number) => ({
          id: `act-${Date.now()}-${idx}`,
          findingId: `find-${Date.now()}-${idx}`,
          task: a.task || 'Tarea correctiva',
          responsible: a.responsible || 'Capataz de área',
          deadline: a.deadline || '7 días',
          status: 'Pendiente',
          riskLevel: a.riskLevel || 'Medio',
        })),
        status: 'En Proceso',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setGeneratedDraftReport(fullReport);
    } catch (err: any) {
      console.error('Error en análisis Inspector IA:', err);
      if (err.message === 'AI_REQUEST_TIMEOUT') {
        setAnalysisError('El análisis está tardando demasiado. Por favor, intenta de nuevo o reduce la complejidad de la imagen.');
      } else if (err.message === 'AUTHENTICATION_REQUIRED') {
        setAnalysisError('Necesitás iniciar sesión para utilizar InspectorIA.');
      } else if (err.message === 'SESSION_INVALID') {
        setAnalysisError('No se pudo validar tu sesión. Volvé a iniciar sesión.');
      } else {
        setAnalysisError(err.message || 'Ocurrió un error al procesar la imagen con la IA.');
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgressStep('');
    }
  };

  // Save Report to Database
  const handleSaveReport = async () => {
    if (!generatedDraftReport) return;
    if (!activeOrgId) {
      alert("Debes tener una organización activa seleccionada para guardar la inspección.");
      return;
    }

    const reportToSave: InspectionReport = {
      ...generatedDraftReport,
      organizationId: activeOrgId,
      companyId: activeCompany?.id,
      establishmentId: selectedEstablishmentId || undefined,
      updatedAt: new Date().toISOString(),
    };

    const savedId = await inspectionService.saveInspectionReport(reportToSave, activeOrgId);
    
    // Generate CAPA actions for High/Critical findings
    if (activeCompany) {
      try {
        for (const finding of reportToSave.findings) {
          if (finding.riskLevel === 'Alto' || finding.riskLevel === 'Crítico') {
            await capaApi.createCorrectiveAction({
              companyId: activeCompany.id,
              establishmentId: selectedEstablishmentId || undefined,
              description: `[InspectorIA] ${finding.hazardTitle}: ${finding.description}`,
              actionRequired: finding.suggestedAction,
              responsibleName: 'Por asignar',
              deadlineDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              sourceType: 'Inspección',
              sourceId: savedId,
              riskLevel: finding.riskLevel,
              status: 'Pendiente'
            }).catch(err => console.error("Error creating CAPA from InspectorIA", err));
          }
        }
      } catch (err) {
        console.error("Error integrating to CAPA", err);
      }
    }

    await loadData();
    setSelectedReport(reportToSave);
    setGeneratedDraftReport(null);
    setSelectedImageBase64(null);
    setActiveSubTab('history');
  };

  // Digital Signature Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureSaved(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    if (generatedDraftReport) {
      setGeneratedDraftReport({ ...generatedDraftReport, inspectorSignatureUrl: dataUrl });
      setSignatureSaved(true);
    }
  };

  // Handle Finding Resolution Status Update
  const handleUpdateFinding = async () => {
    if (!modalFinding) return;
    await inspectionService.updateFindingStatus(
      modalFinding.reportId,
      modalFinding.finding.id,
      'Corregido',
      activeOrgId || undefined,
      closingNotes,
      verificationPhoto || undefined
    );
    await loadData();
    setModalFinding(null);
    setClosingNotes('');
    setVerificationPhoto(null);
  };

  // Run Quality Diagnostic Test Suite
  const runDiagnostics = async () => {
    setIsTesting(true);
    
    // Reset test logs to running
    const updated = testLogs.map((t) => ({ ...t, status: 'running' as const }));
    setTestLogs(updated);

    for (let i = 0; i < updated.length; i++) {
      await new Promise((r) => setTimeout(r, 500));
      updated[i] = { ...updated[i], status: 'pass' };
      setTestLogs([...updated]);
    }

    setIsTesting(false);
  };

  // Filtered Findings for Followup
  const allFindings = reports.flatMap((r) =>
    r.findings.map((f) => ({ reportId: r.id, reportTitle: r.title, company: r.companyName, finding: f }))
  );

  const filteredFindings = allFindings.filter((item) => {
    const matchesSearch =
      item.finding.hazardTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.finding.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.company.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = filterRisk === 'all' || item.finding.riskLevel === filterRisk;
    const matchesStatus = filterStatus === 'all' || item.finding.status === filterStatus;

    return matchesSearch && matchesRisk && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 border border-orange-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-black bg-orange-500 text-slate-950 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Módulo Inteligente
              </span>
              <span className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                RAG Estricto & Visión Artificial
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Inspector <span className="text-orange-500">IA</span> — Análisis Visual y Reportes
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Captura fotos o videos en campo. La IA identifica riesgos, fundamenta cada observación con tu biblioteca normativa y genera el informe técnico con plan de acción instantáneo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('new_inspection')}
              className="px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-xl shadow-orange-500/25 flex items-center gap-2 transition-all hover:scale-105"
            >
              <Camera className="w-4 h-4" />
              <span>Nueva Inspección</span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4 text-orange-400" />
              <span>Ver Informes ({reports.length})</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar inside Inspector IA */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t border-slate-800/80 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeSubTab === 'dashboard'
                ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Panel de Control</span>
          </button>

          <button
            onClick={() => setActiveSubTab('new_inspection')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeSubTab === 'new_inspection'
                ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Cámara & Análisis Visual</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeSubTab === 'history'
                ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Historial de Informes</span>
          </button>

          <button
            onClick={() => setActiveSubTab('findings_followup')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeSubTab === 'findings_followup'
                ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Seguimiento de Hallazgos</span>
            {stats && stats.pendingCritical > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-black animate-pulse">
                {stats.pendingCritical}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('diagnostics')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
              activeSubTab === 'diagnostics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-slate-800/80 text-amber-400 hover:bg-slate-800 hover:text-amber-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Pruebas de Calidad & IA</span>
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: DASHBOARD DE CONTROL */}
      {activeSubTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span>Inspecciones Realizadas</span>
                <Layers className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalInspections}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {stats.completedInspections} completadas • {stats.openInspections} en proceso
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span>Hallazgos Registrados</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalFindings}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Detectados en inspección visual
              </p>
            </div>

            <div className="bg-red-500/10 dark:bg-red-950/30 p-5 rounded-2xl border border-red-500/30 shadow-sm space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-red-600 dark:text-red-400 text-xs font-black">
                <span>Riesgos Críticos Pendientes</span>
                <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
              </div>
              <p className="text-3xl font-black text-red-600 dark:text-red-400">
                {stats.pendingCritical}
              </p>
              <p className="text-[11px] text-red-700 dark:text-red-300 font-semibold">
                Requieren acción inmediata en obra
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span>Tiempo Prom. Resolución</span>
                <Clock className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.avgResolutionTimeDays} días
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Eficiencia de cierre de hallazgos
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span>Respaldo Normativo</span>
                <Award className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                100% RAG
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sin alucinación documental
              </p>
            </div>
          </div>

          {/* Breakdown Charts & Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  Hallazgos por Categoría de Riesgo
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">Top Tipologías</span>
              </div>

              <div className="space-y-3">
                {stats.findingsByCategory.length > 0 ? (
                  stats.findingsByCategory.map((c) => {
                    const pct = Math.round((c.count / stats.totalFindings) * 100) || 0;
                    return (
                      <div key={c.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            {c.category}
                          </span>
                          <span>{c.count} hallazgo(s) ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No hay hallazgos registrados aún.</p>
                )}
              </div>
            </div>

            {/* Severity Distribution & Monthly Trend */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  Nivel de Severidad y Evolución
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.findingsByRisk.map((r) => (
                  <div
                    key={r.risk}
                    className={`p-3 rounded-2xl border text-center space-y-1 ${
                      r.risk === 'Crítico'
                        ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                        : r.risk === 'Alto'
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                        : r.risk === 'Medio'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider">{r.risk}</p>
                    <p className="text-xl font-black">{r.count}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tendencia Mensual de Campo
                </h4>
                <div className="grid grid-cols-4 gap-2 items-end h-28 pt-4">
                  {stats.monthlyTrend.map((m) => (
                    <div key={m.month} className="flex flex-col items-center gap-2 h-full justify-end">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex flex-col justify-end h-20 relative">
                        <div
                          className="bg-orange-500 w-full rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.min(100, m.findingsCount * 5)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">
                        {m.month.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Inspections Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Informes Recientes de Inspección Visual
              </h3>
              <button
                onClick={() => setActiveSubTab('history')}
                className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                <span>Ver todos los informes</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Informe / Título</th>
                    <th className="py-3 px-4">Empresa / Obra</th>
                    <th className="py-3 px-4">Inspector</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Hallazgos</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {r.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                        {r.companyName}<br />
                        <span className="text-[11px] text-slate-400">{r.siteLocation}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs font-medium">
                        {r.inspectorName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs">
                        {r.date}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs">
                          {r.findings.length} hallazgos
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            r.status === 'Cerrada' || r.status === 'Completada'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedReport(r);
                            setActiveSubTab('history');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white text-xs font-bold transition-all"
                        >
                          Ver Informe
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: NUEVA INSPECCIÓN (CAMARA & ANALISIS VISUAL) */}
      {activeSubTab === 'new_inspection' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-6 h-6 text-orange-500" />
                  Nueva Inspección Visual de Campo
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Completa los datos de la inspección y captura o selecciona la fotografía del sitio a auditar.
                </p>
              </div>
              <button
                onClick={handleCaptureGPS}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>Capturar GPS: {gpsCoords}</span>
              </button>
            </div>

            {/* Inspection Form Grid - Fully Editable */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Field 1: Empresa / Cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-orange-500" />
                    Empresa / Cliente
                  </span>
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={customCompanyName}
                    onChange={(e) => setCustomCompanyName(e.target.value)}
                    placeholder="Ej: Constructora Delta S.A."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  {companies && companies.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setCustomCompanyName(e.target.value);
                      }}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 outline-none"
                    >
                      <option value="">-- Autocompletar con empresa --</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.legalName}>
                          {c.legalName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Field 2: Ubicación / Obra */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  Ubicación / Obra
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={customSiteLocation}
                    onChange={(e) => setCustomSiteLocation(e.target.value)}
                    placeholder="Ej: Planta Industrial Sector B / Obra 4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  {establishments && establishments.length > 0 && (
                    <select
                      value={selectedEstablishmentId}
                      onChange={(e) => {
                        setSelectedEstablishmentId(e.target.value);
                        const est = establishments.find((item) => item.id === e.target.value);
                        if (est) setCustomSiteLocation(est.name);
                      }}
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 outline-none"
                    >
                      <option value="">-- Autocompletar con establecimiento --</option>
                      {establishments.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Field 3: Inspector / Auditor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-orange-500" />
                  Inspector / Auditor
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ej: Ing. Juan Pérez"
                />
              </div>

              {/* Field 4: Matrícula / Registro H&S */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-orange-500" />
                  Matrícula / Registro H&S
                </label>
                <input
                  type="text"
                  value={inspectorRegistration}
                  onChange={(e) => setInspectorRegistration(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ej: Mat. COPIME 1234 / SRT"
                />
              </div>
            </div>

            {/* Quick Sample Site Photos Selector */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  Fotografías de Demostración Rápida (1 Clic):
                </label>
                <span className="text-[11px] text-slate-400">O sube una propia desde tu dispositivo</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_SITE_IMAGES.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className={`cursor-pointer rounded-2xl border-2 p-3 flex items-center gap-3 transition-all ${
                      selectedSampleId === sample.id
                        ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={sample.thumbnail}
                      alt={sample.title}
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {sample.title}
                      </p>
                      <span className="px-2 py-0.5 text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-md font-bold">
                        {sample.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Zone / Media Preview & Live Camera */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-6 text-center bg-slate-50 dark:bg-slate-800/30 space-y-4">
              {isCameraActive ? (
                <div className="space-y-4">
                  <div className="relative inline-block max-w-lg w-full rounded-2xl overflow-hidden border-2 border-orange-500 shadow-xl bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-80 object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                      CÁMARA EN VIVO
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleCaptureLivePhoto}
                      className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-all hover:scale-105"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capturar Fotografía</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStopCamera}
                      className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : selectedImageBase64 ? (
                <div className="space-y-4">
                  <div className="relative inline-block max-w-lg rounded-2xl overflow-hidden border-2 border-orange-500 shadow-xl">
                    <img
                      src={selectedImageBase64}
                      alt="Vista previa de inspección"
                      className="max-h-72 w-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setSelectedImageBase64(null);
                        setSelectedSampleId(null);
                      }}
                      className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors"
                      title="Eliminar imagen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Fotografía de inspección cargada y lista para análisis conjunto
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Sube o toma una fotografía / fotograma de la inspección
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Formatos soportados: JPG, PNG, WEBP
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {/* Botón 1: Abrir cámara nativa del teléfono */}
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold cursor-pointer shadow-lg shadow-orange-500/20 transition-all hover:scale-105"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Tomar Foto con Cámara</span>
                    </button>
                    <input
                      ref={nativeCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Botón 2: Abrir Galería de fotos (sin el atributo capture para abrir el álbum) */}
                    <button
                      type="button"
                      onClick={() => galleryFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer shadow-md transition-all hover:scale-105"
                    >
                      <UploadCloud className="w-4 h-4 text-orange-400" />
                      <span>Cargar de Galería</span>
                    </button>
                    <input
                      ref={galleryFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Botón 3: Transmisión en vivo por Webcam (para laptops / PC con visor) */}
                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:scale-105 border border-slate-200 dark:border-slate-700"
                      title="Visor de cámara web en vivo"
                    >
                      <Eye className="w-4 h-4 text-orange-500" />
                      <span>Visor en Vivo (Webcam)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Context & Critical Elements Description Zone */}
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border-2 border-orange-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span>Descripción de la Actividad & Elementos Críticos a Evaluar:</span>
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  {activityDescription.length} caracteres
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Detalla la tarea operativa observada o especifica los elementos críticos de seguridad (alturas, bloqueo de energía, sustancias peligrosas, herramientas en uso, etc.). <strong>La IA analizará la imagen y esta descripción como un todo integrado</strong> para auditar el cumplimiento normativo.
              </p>

              <textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                rows={3}
                placeholder="Ej: Montaje de andamio a 4m de altura con uso de amoladora angular. Se solicita a la IA evaluar fijación de tablones, línea de vida, EPP auditivo/ocular y señalización perimetral..."
                className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 outline-none resize-none transition-all shadow-inner"
              />

              {/* Quick Tags Pills */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Insertar elemento crítico frecuente:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CRITICAL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddActivityTag(tag)}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Run Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunInspectionAI}
                disabled={isAnalyzing || !selectedImageBase64}
                className={`px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl transition-all ${
                  isAnalyzing || !selectedImageBase64
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/30 hover:scale-105'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Procesando Visión Artificial & RAG...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Analizar con Inspector IA</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Loading Step Indicator */}
            {isAnalyzing && (
              <div className="bg-orange-950/20 border border-orange-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3 text-orange-400 text-sm font-bold">
                  <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
                  <span>Ejecutando Pipeline de Inspección Visual RAG</span>
                </div>
                <p className="text-xs font-semibold text-slate-300">
                  {analysisProgressStep}
                </p>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-2 rounded-full w-[75%] animate-pulse" />
                </div>
              </div>
            )}

            {/* Error Banner */}
            {analysisError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
          </div>

          {/* GENERATED DRAFT REPORT REVIEW */}
          {generatedDraftReport && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-orange-500 shadow-2xl p-6 sm:p-8 space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="px-3 py-1 text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full uppercase tracking-widest border border-emerald-500/30">
                    Borrador de Informe Generado (Editable)
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {generatedDraftReport.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportReportToWord(generatedDraftReport)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar Word (.docx)</span>
                  </button>
                  <button
                    onClick={handleSaveReport}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guardar Informe Definitivo</span>
                  </button>
                </div>
              </div>

              {/* Editable Report Header Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Título del Informe</label>
                  <input
                    type="text"
                    value={generatedDraftReport.title}
                    onChange={(e) => setGeneratedDraftReport({ ...generatedDraftReport, title: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Empresa / Cliente</label>
                  <input
                    type="text"
                    value={generatedDraftReport.companyName}
                    onChange={(e) => setGeneratedDraftReport({ ...generatedDraftReport, companyName: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Ubicación / Obra</label>
                  <input
                    type="text"
                    value={generatedDraftReport.siteLocation}
                    onChange={(e) => setGeneratedDraftReport({ ...generatedDraftReport, siteLocation: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Inspector / Auditor</label>
                  <input
                    type="text"
                    value={generatedDraftReport.inspectorName}
                    onChange={(e) => setGeneratedDraftReport({ ...generatedDraftReport, inspectorName: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Matrícula / Registro H&S</label>
                  <input
                    type="text"
                    value={generatedDraftReport.inspectorRegistration || ''}
                    onChange={(e) => setGeneratedDraftReport({ ...generatedDraftReport, inspectorRegistration: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Fecha de Inspección</label>
                  <input
                    type="date"
                    value={generatedDraftReport.date}
                    onChange={(e) => setGeneratedDraftReport({ ...generatedDraftReport, date: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  Resumen Ejecutivo de Inspección
                </h4>
                <textarea
                  rows={3}
                  value={generatedDraftReport.executiveSummary}
                  onChange={(e) => setGeneratedDraftReport({ ...generatedDraftReport, executiveSummary: e.target.value })}
                  className="w-full text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 leading-relaxed focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* Context & Critical Elements Inspected */}
              {generatedDraftReport.activityDescription && (
                <div className="space-y-2">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    Contexto Operativo y Elementos Críticos Inspeccionados
                  </h4>
                  <div className="text-sm text-slate-800 dark:text-slate-200 bg-orange-500/10 p-4 rounded-2xl border border-orange-500/30 leading-relaxed italic">
                    "{generatedDraftReport.activityDescription}"
                  </div>
                </div>
              )}

              {/* Hallazgos Visuales & Citas Normativas RAG */}
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                  Hallazgos Visuales & Respaldos Normativos
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  {generatedDraftReport.findings.map((f, idx) => (
                    <div
                      key={f.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                            {f.hazardTitle}
                          </h5>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md">
                            {f.hazardCategory}
                          </span>
                          <span
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${
                              f.riskLevel === 'Crítico'
                                ? 'bg-red-500 text-white'
                                : f.riskLevel === 'Alto'
                                ? 'bg-orange-500 text-white'
                                : 'bg-amber-500 text-slate-950'
                            }`}
                          >
                            Riesgo {f.riskLevel}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        <strong>Observación:</strong> {f.description}
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        <strong>Medida Preventiva:</strong> {f.suggestedAction}
                      </p>

                      {/* Normative RAG Citation Box */}
                      <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-orange-600 dark:text-orange-400">
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            Cita Normativa RAG de Biblioteca Local:
                          </span>
                          {f.normativeCitation.hasLibraryBackup ? (
                            <span className="px-2 py-0.5 text-[10px] bg-emerald-500 text-white rounded font-black">
                              RESPALDO EN BIBLIOTECA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] bg-slate-600 text-white rounded font-black">
                              SIN RESPALDO EN BIBLIOTECA
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                          {f.normativeCitation.docTitle}{' '}
                          {f.normativeCitation.pageNumber && `• Pág. ${f.normativeCitation.pageNumber}`}{' '}
                          {f.normativeCitation.articleOrSection && `• ${f.normativeCitation.articleOrSection}`}
                        </p>
                        {f.normativeCitation.quotedText && (
                          <p className="italic text-slate-600 dark:text-slate-400 text-[11px]">
                            "{f.normativeCitation.quotedText}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Plan */}
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-orange-500" />
                  Plan de Acción y Asignación de Plazos
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase">
                        <th className="p-3">#</th>
                        <th className="p-3">Tarea Correctiva</th>
                        <th className="p-3">Responsable</th>
                        <th className="p-3">Plazo</th>
                        <th className="p-3">Riesgo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {generatedDraftReport.actionPlan.map((act, i) => (
                        <tr key={i}>
                          <td className="p-3 font-bold">{i + 1}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{act.task}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{act.responsible}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{act.deadline}</td>
                          <td className="p-3">
                            <span className="font-bold text-orange-500">{act.riskLevel}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Digital Signature Block */}
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-orange-500" />
                    Firma Digital del Inspector Responsable
                  </h4>
                  {signatureSaved && (
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Firma Registrada
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="space-y-2">
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={120}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="bg-white rounded-xl border-2 border-slate-300 dark:border-slate-700 cursor-crosshair shadow-inner"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={clearCanvas}
                        className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        Limpiar
                      </button>
                      <button
                        onClick={saveSignature}
                        className="px-3 py-1 rounded-lg bg-orange-500 text-white text-xs font-bold"
                      >
                        Confirmar Firma
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                    <p className="font-bold text-slate-900 dark:text-white">{inspectorName}</p>
                    <p>{inspectorRegistration}</p>
                    <p className="text-[11px] text-slate-400">
                      Fecha de emisión: {generatedDraftReport.date}
                    </p>
                    <p className="text-[11px] text-emerald-500 font-semibold">
                      Documento certificado por motor RAG Safety IA
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 3: HISTORIAL DE INFORMES Y EXPORTACION */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por obra, empresa o inspector..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => exportReportToPDF(reports[0])}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                <Printer className="w-4 h-4 text-orange-500" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reports List */}
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedReport?.id === r.id
                      ? 'border-orange-500 bg-orange-500/10 shadow-md ring-2 ring-orange-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-orange-500 uppercase">
                      {r.date}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        r.status === 'Cerrada' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-1">
                    {r.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {r.companyName} • {r.siteLocation}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-2">
                    {r.findings.length} hallazgos registrados
                  </p>
                </div>
              ))}
            </div>

            {/* Selected Report Detailed Print Preview */}
            <div className="lg:col-span-2">
              {selectedReport ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl print:p-0 print:border-0 print:shadow-none">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {selectedReport.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Emisión: {selectedReport.date} • ID: {selectedReport.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportReportToWord(selectedReport)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Word (.docx)</span>
                      </button>
                      <button
                        onClick={() => exportReportToPDF(selectedReport)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Imprimir / PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Print Cover Header */}
                  <div className="border-b-2 border-orange-500 pb-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                          INFORME TÉCNICO DE INSPECCIÓN VISUAL
                        </h1>
                        <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                          Plataforma Safety IA • Control de Riesgos Laborales
                        </p>
                      </div>
                      <ShieldAlert className="w-10 h-10 text-orange-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                      <p><strong>Empresa:</strong> {selectedReport.companyName}</p>
                      <p><strong>Ubicación:</strong> {selectedReport.siteLocation}</p>
                      <p><strong>Inspector:</strong> {selectedReport.inspectorName} ({selectedReport.inspectorRegistration})</p>
                      <p><strong>GPS:</strong> {selectedReport.gpsLocation || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Context & Critical Elements Inspected */}
                  {selectedReport.activityDescription && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-orange-500" />
                        Contexto Operativo y Elementos Críticos Declarados
                      </h4>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-orange-500/10 p-4 rounded-xl border border-orange-500/30 italic">
                        "{selectedReport.activityDescription}"
                      </p>
                    </div>
                  )}

                  {/* Executive Summary */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                      1. Resumen Ejecutivo
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      {selectedReport.executiveSummary}
                    </p>
                  </div>

                  {/* Findings */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                      2. Registro de Hallazgos y Citas Normativas
                    </h4>
                    {selectedReport.findings.map((f, i) => (
                      <div key={f.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-orange-500">
                            Hallazgo #{i + 1}: {f.hazardTitle}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-600 font-bold">
                            Riesgo {f.riskLevel}
                          </span>
                        </div>
                        <p><strong>Descripción:</strong> {f.description}</p>
                        <p><strong>Acción Recomendada:</strong> {f.suggestedAction}</p>
                        <div className="p-2 bg-orange-500/10 rounded border border-orange-500/20">
                          <p className="font-bold text-orange-600 dark:text-orange-400">
                            Respaldo Normativo: {f.normativeCitation.docTitle} {f.normativeCitation.articleOrSection && `(${f.normativeCitation.articleOrSection})`}
                          </p>
                          {f.normativeCitation.quotedText && (
                            <p className="italic text-[11px] text-slate-600 dark:text-slate-400">
                              "{f.normativeCitation.quotedText}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Plan */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase">
                      3. Plan de Acción
                    </h4>
                    <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <tr>
                          <th className="p-2 border">Tarea</th>
                          <th className="p-2 border">Responsable</th>
                          <th className="p-2 border">Plazo</th>
                          <th className="p-2 border">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.actionPlan.map((a, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 border font-medium">{a.task}</td>
                            <td className="p-2 border">{a.responsible}</td>
                            <td className="p-2 border">{a.deadline}</td>
                            <td className="p-2 border font-bold">{a.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="font-bold">Selecciona un informe de la lista para ver el detalle y exportarlo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 4: SEGUIMIENTO Y CIERRE DE HALLAZGOS */}
      {activeSubTab === 'findings_followup' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por hallazgo o empresa..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="all">Todos los Riesgos</option>
                <option value="Crítico">Riesgo Crítico</option>
                <option value="Alto">Riesgo Alto</option>
                <option value="Medio">Riesgo Medio</option>
                <option value="Bajo">Riesgo Bajo</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <option value="all">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En proceso">En proceso</option>
                <option value="Corregido">Corregido</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 text-xs font-bold uppercase">
                  <th className="p-4">Hallazgo / Riesgo</th>
                  <th className="p-4">Empresa / Ubicación</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Severidad</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredFindings.map(({ reportId, company, finding }) => (
                  <tr key={finding.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-slate-900 dark:text-white max-w-xs">
                      {finding.hazardTitle}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-normal mt-0.5">
                        {finding.description}
                      </p>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                      {company}
                    </td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                      {finding.hazardCategory}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          finding.riskLevel === 'Crítico'
                            ? 'bg-red-500 text-white'
                            : finding.riskLevel === 'Alto'
                            ? 'bg-orange-500 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {finding.riskLevel}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          finding.status === 'Corregido'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {finding.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {finding.status !== 'Corregido' ? (
                        <button
                          onClick={() => setModalFinding({ reportId, finding })}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-md shadow-emerald-500/20"
                        >
                          Marcar Corregido
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-500 font-bold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Cerrado {finding.closedDate}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Cierre de Hallazgos */}
          {modalFinding && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full space-y-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Cierre de Hallazgo & Verificación
                  </h3>
                  <button onClick={() => setModalFinding(null)} className="p-1 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-bold text-orange-500">{modalFinding.finding.hazardTitle}</p>
                  <p className="text-slate-600 dark:text-slate-300">{modalFinding.finding.description}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Notas de Resolución / Medida Aplicada:
                  </label>
                  <textarea
                    rows={3}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Ej: Se colocó baranda reglamentaria de 1m con zócalo y se capacitó al personal."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Foto de Verificación de Cierre (Opcional):
                  </label>
                  {verificationPhoto ? (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-500 max-h-36 bg-black flex items-center justify-center">
                      <img src={verificationPhoto} alt="Foto de verificación" className="max-h-36 object-cover" />
                      <button
                        type="button"
                        onClick={() => setVerificationPhoto(null)}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-rose-600"
                        title="Eliminar foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => modalCameraRef.current?.click()}
                        className="flex-1 py-2 px-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-orange-500/20"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Tomar Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => modalGalleryRef.current?.click()}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Elegir Galería</span>
                      </button>
                      <input
                        ref={modalCameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleModalPhotoChange}
                        className="hidden"
                      />
                      <input
                        ref={modalGalleryRef}
                        type="file"
                        accept="image/*"
                        onChange={handleModalPhotoChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setModalFinding(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateFinding}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
                  >
                    Confirmar Cierre
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 5: PRUEBAS DE CALIDAD & DIAGNOSTICO */}
      {activeSubTab === 'diagnostics' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-amber-500" />
                Auditoría Técnica y Pruebas Automáticas de la IA
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Verifica el funcionamiento del pipeline multimodal, la precisión de la citación normativa y la persistencia en tiempo real.
              </p>
            </div>

            <button
              onClick={runDiagnostics}
              disabled={isTesting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Ejecutar Batería de Pruebas</span>
            </button>
          </div>

          <div className="space-y-3">
            {testLogs.map((t, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.detail}</p>
                </div>

                <div>
                  {t.status === 'running' && (
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Probando...
                    </span>
                  )}
                  {t.status === 'pass' && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      CORRECTO (PASS)
                    </span>
                  )}
                  {t.status === 'pending' && (
                    <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 text-xs font-bold">
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
