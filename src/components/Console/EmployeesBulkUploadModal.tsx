import React, { useState, useMemo } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Sparkles, 
  AlertTriangle, 
  Trash2, 
  Building2, 
  MapPin, 
  Layers, 
  Briefcase,
  HelpCircle,
  Eye,
  Check,
  RefreshCw
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { Employee, EmployeeShift, MedicalFitnessStatus } from '../../types/tenant';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedEmployeeRow {
  rowNum: number;
  cuil: string;
  dni: string;
  firstName: string;
  lastName: string;
  hireDate: string;
  shift: EmployeeShift;
  category: string;
  sectorName?: string;
  positionTitle?: string;
  isContractorStaff: boolean;
  contractorName?: string;
  medicalFitnessStatus: MedicalFitnessStatus;
  associatedRisks: string[];
  notes?: string;
  // Validation status
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const EmployeesBulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose }) => {
  const { 
    companies, 
    establishments, 
    sectors, 
    positions, 
    activeCompanyId, 
    bulkCreateEmployees,
    employees: existingEmployees
  } = useTenant();

  // Selected scope
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(activeCompanyId || (companies[0]?.id || ''));
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>('');

  // Mode: 'file' | 'paste' | 'preview' | 'result'
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [step, setStep] = useState<'input' | 'preview' | 'results'>('input');
  const [filterValid, setFilterValid] = useState<'all' | 'valid' | 'invalid'>('all');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; cuil?: string; error: string }>;
  } | null>(null);

  // Available establishments for chosen company
  const availableEstablishments = useMemo(() => {
    return establishments.filter(e => e.companyId === selectedCompanyId);
  }, [establishments, selectedCompanyId]);

  // Set default establishment when company changes
  React.useEffect(() => {
    if (availableEstablishments.length > 0 && (!selectedEstablishmentId || !availableEstablishments.some(e => e.id === selectedEstablishmentId))) {
      setSelectedEstablishmentId(availableEstablishments[0].id);
    }
  }, [selectedCompanyId, availableEstablishments, selectedEstablishmentId]);

  if (!isOpen) return null;

  // Helper to validate and clean Argentine CUIL
  const cleanAndValidateCuil = (rawCuil: string): { isValid: boolean; cleanCuil: string; error?: string } => {
    const digits = (rawCuil || '').replace(/\D/g, '');
    if (digits.length !== 11) {
      return { 
        isValid: false, 
        cleanCuil: rawCuil, 
        error: 'El CUIL debe tener exactamente 11 dígitos numéricos.' 
      };
    }
    // Formato con guiones XX-XXXXXXXX-X
    const formatted = `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
    return { isValid: true, cleanCuil: formatted };
  };

  // Helper to parse CSV lines
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return [];
    }

    // Determine delimiter (, or ;)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const existingCuilsSet = new Set(existingEmployees.map(e => e.cuil.replace(/\D/g, '')));
    const seenInBatch = new Set<string>();

    const rows: ParsedEmployeeRow[] = [];

    // Check if first row is header
    const hasHeader = firstLine.toLowerCase().includes('cuil') || firstLine.toLowerCase().includes('nombre') || firstLine.toLowerCase().includes('apellido');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line, index) => {
      const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) return;

      const rowNum = hasHeader ? index + 2 : index + 1;
      const rawCuil = parts[0] || '';
      const lastName = parts[1] || '';
      const firstName = parts[2] || '';
      const hireDate = parts[3] || new Date().toISOString().slice(0, 10);
      const category = parts[4] || 'Operario';
      const shiftRaw = (parts[5] || 'morning').toLowerCase();
      const sectorName = parts[6] || '';
      const positionTitle = parts[7] || '';
      const isContractorRaw = parts[8] || 'NO';
      const medStatusRaw = parts[9] || 'fit';
      const risksRaw = parts[10] || '';
      const notes = parts[11] || '';

      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate CUIL
      const cuilVal = cleanAndValidateCuil(rawCuil);
      const cleanCuil = cuilVal.cleanCuil;
      if (!cuilVal.isValid) {
        errors.push(cuilVal.error || 'CUIL inválido');
      }

      // Check duplicates
      const pureDigits = rawCuil.replace(/\D/g, '');
      if (seenInBatch.has(pureDigits)) {
        errors.push('CUIL duplicado dentro del mismo lote de carga.');
      } else if (pureDigits) {
        seenInBatch.add(pureDigits);
      }

      if (existingCuilsSet.has(pureDigits)) {
        warnings.push('Este CUIL ya existe registrado en la nómina del sistema.');
      }

      // Validate Names
      if (!lastName) errors.push('Falta Apellido');
      if (!firstName) errors.push('Falta Nombre');

      // Validate Shift
      let shift: EmployeeShift = 'morning';
      if (shiftRaw.includes('tard') || shiftRaw === 'afternoon') shift = 'afternoon';
      else if (shiftRaw.includes('noch') || shiftRaw === 'night') shift = 'night';
      else if (shiftRaw.includes('rotat') || shiftRaw === 'rotating') shift = 'rotating';

      // Validate Medical Fitness
      let medicalFitnessStatus: MedicalFitnessStatus = 'fit';
      if (medStatusRaw.includes('restr') || medStatusRaw === 'fit_with_restrictions') medicalFitnessStatus = 'fit_with_restrictions';
      else if (medStatusRaw.includes('pend') || medStatusRaw === 'pending') medicalFitnessStatus = 'pending';
      else if (medStatusRaw.includes('no') || medStatusRaw === 'unfit') medicalFitnessStatus = 'unfit';

      // Parse Associated Risks
      const associatedRisks = risksRaw ? risksRaw.split(/[|,/]/).map(r => r.trim()).filter(Boolean) : [];

      const isContractorStaff = ['si', 'yes', 'true', '1', 'contratista'].includes(isContractorRaw.toLowerCase());
      const dni = pureDigits.length >= 10 ? pureDigits.slice(2, -1) : pureDigits;

      rows.push({
        rowNum,
        cuil: cleanCuil,
        dni,
        firstName,
        lastName,
        hireDate,
        shift,
        category,
        sectorName,
        positionTitle,
        isContractorStaff,
        medicalFitnessStatus,
        associatedRisks,
        notes,
        isValid: errors.length === 0,
        errors,
        warnings,
      });
    });

    return rows;
  };

  // Handle file drop/selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);
      const parsed = parseCSV(text);
      setParsedRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleProcessPastedText = () => {
    if (!csvRawText.trim()) return;
    const parsed = parseCSV(csvRawText);
    setParsedRows(parsed);
    setStep('preview');
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const sampleHeader = 'CUIL;Apellido;Nombre;FechaIngreso;Categoria;Turno;Sector;Puesto;EsContratista;AptitudMedica;RiesgosAsociados;Observaciones\n';
    const sampleRows = [
      '20-35489123-4;González;Martín;2026-03-01;Oficial Tornero;morning;Mecanizado;Tornero CNC;NO;fit;Ruido continuo > 85 dBA|Riesgo ergonómico;Inducción pendiente',
      '27-38912456-8;Pérez;Luciana;2026-03-01;Analista;morning;Calidad;Inspector de Calidad;NO;fit;Uso de PVD;Calzado de seguridad entregado',
      '20-40123987-9;Rodríguez;Lucas;2026-03-15;Operario de Depósito;afternoon;Logística;Autoelevadorista;NO;fit_with_restrictions;Tránsito de maquinaria|Carga manual;Requiere faja lumbar y examen visual',
      '20-33445566-2;Fernández;Diego;2026-03-10;Electricista de Mantenimiento;rotating;Mantenimiento;Técnico Electricista;SI;fit;Riesgo eléctrico|Trabajo en altura;Personal contratista asignado a parada de planta'
    ].join('\n');

    const fullContent = sampleHeader + sampleRows;
    const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_carga_masiva_trabajadores_safetyia.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Submit to Backend
  const handleSubmitBatch = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    if (!selectedCompanyId || !selectedEstablishmentId) {
      alert('Debe seleccionar una empresa y un establecimiento destino.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Map rows into Employee objects matching sectors & positions where possible
      const availableSectorsInEst = sectors.filter(s => s.establishmentId === selectedEstablishmentId);
      const availablePositionsInEst = positions.filter(p => p.establishmentId === selectedEstablishmentId);

      const employeesPayload = validRows.map(row => {
        // Try match sector
        const matchedSector = availableSectorsInEst.find(s => 
          row.sectorName && s.name.toLowerCase().includes(row.sectorName.toLowerCase())
        );
        // Try match position
        const matchedPosition = availablePositionsInEst.find(p => 
          row.positionTitle && p.title.toLowerCase().includes(row.positionTitle.toLowerCase())
        );

        return {
          companyId: selectedCompanyId,
          establishmentId: selectedEstablishmentId,
          sectorId: matchedSector?.id,
          positionId: matchedPosition?.id,
          cuil: row.cuil,
          dni: row.dni,
          firstName: row.firstName,
          lastName: row.lastName,
          hireDate: row.hireDate,
          shift: row.shift,
          category: row.category,
          isContractorStaff: row.isContractorStaff,
          associatedRisks: row.associatedRisks,
          notes: row.notes,
          medicalFitness: {
            status: row.medicalFitnessStatus,
            examType: 'pre_occupational' as const,
            examDate: row.hireDate,
          }
        };
      });

      const res = await bulkCreateEmployees({
        companyId: selectedCompanyId,
        establishmentId: selectedEstablishmentId,
        employees: employeesPayload,
      });

      setUploadResult({
        successCount: res.createdCount,
        errorCount: res.errorCount,
        errors: res.errors || [],
      });
      setStep('results');
    } catch (err: any) {
      alert(err.message || 'Error durante la carga masiva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  const displayRows = parsedRows.filter(r => {
    if (filterValid === 'valid') return r.isValid;
    if (filterValid === 'invalid') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Carga Masiva de Nómina de Trabajadores
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  CSV / Excel
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Incorporación acelerada con validación automática de CUIL, asignación de turnos y perfil de riesgos
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Step 1: Input (Upload or Paste) */}
          {step === 'input' && (
            <div className="space-y-6">
              {/* Scope Selector: Company & Establishment */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  1. Seleccione la Empresa y Establecimiento de Destino
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Empresa Principal</label>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.legalName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Establecimiento / Planta</label>
                    <select
                      value={selectedEstablishmentId}
                      onChange={(e) => setSelectedEstablishmentId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      {availableEstablishments.map(est => (
                        <option key={est.id} value={est.id}>{est.name} ({est.city || 'Principal'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Template Download Banner */}
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-blue-300">Descargar Plantilla Oficial CSV</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Descargue el modelo con las columnas requeridas (CUIL, Apellido, Nombre, Categoría, Turno, Riesgos, etc.) para evitar errores de formato.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Plantilla (.csv)</span>
                </button>
              </div>

              {/* Input Mode Selector */}
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setInputMode('upload')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      inputMode === 'upload'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Subir Archivo (.csv / .txt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      inputMode === 'paste'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pegar Datos de Portapapeles (Copiar de Excel)
                  </button>
                </div>

                {inputMode === 'upload' ? (
                  <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-8 text-center transition-all bg-slate-950/30">
                    <UploadCloud className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-white mb-1">
                      Arrastre y suelte su archivo CSV aquí
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-4">
                      Soporta delimitadores por coma (,) o punto y coma (;)
                    </p>
                    <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer shadow-lg shadow-blue-600/20 inline-flex items-center gap-2">
                      <span>Seleccionar Archivo</span>
                      <input
                        type="file"
                        accept=".csv, .txt"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={8}
                      value={csvRawText}
                      onChange={(e) => setCsvRawText(e.target.value)}
                      placeholder="Pegue aquí el contenido copiado desde Excel o CSV (ej: 20-35489123-4;González;Martín;2026-03-01;Operario...)"
                      className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-[11px] focus:outline-none focus:border-blue-500 resize-y"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleProcessPastedText}
                        disabled={!csvRawText.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Validar y Procesar Datos</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Preview & Validation Table */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Validation Summary Bar */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{validCount} Válidos para importar</span>
                  </div>
                  {invalidCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
                      <AlertCircle className="w-4 h-4" />
                      <span>{invalidCount} Con Errores</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterValid('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      filterValid === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterValid('valid')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      filterValid === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Válidos ({validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterValid('invalid')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      filterValid === 'invalid' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Con Errores ({invalidCount})
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-slate-400 font-bold sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        <th className="px-3 py-2.5">Fila</th>
                        <th className="px-3 py-2.5">Estado</th>
                        <th className="px-3 py-2.5">CUIL</th>
                        <th className="px-3 py-2.5">Nombre Completo</th>
                        <th className="px-3 py-2.5">Categoría / Puesto</th>
                        <th className="px-3 py-2.5">Turno</th>
                        <th className="px-3 py-2.5">Apto Médico</th>
                        <th className="px-3 py-2.5">Riesgos</th>
                        <th className="px-3 py-2.5">Observaciones / Errores</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {displayRows.map((row) => (
                        <tr
                          key={row.rowNum}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            !row.isValid ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-slate-500 font-mono">#{row.rowNum}</td>
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                                <AlertCircle className="w-3.5 h-3.5" /> Error
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-white">{row.cuil}</td>
                          <td className="px-3 py-2 font-semibold">
                            {row.lastName}, {row.firstName}
                            {row.isContractorStaff && (
                              <span className="ml-1.5 px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 text-[9px] border border-amber-500/20">
                                Contratista
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div>{row.category}</div>
                            {row.positionTitle && (
                              <div className="text-[10px] text-slate-400">{row.positionTitle}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 capitalize">{row.shift}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.medicalFitnessStatus === 'fit' ? 'bg-emerald-500/10 text-emerald-400' :
                              row.medicalFitnessStatus === 'fit_with_restrictions' ? 'bg-amber-500/10 text-amber-300' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {row.medicalFitnessStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {row.associatedRisks.length > 0 ? (
                              <span className="text-[10px] text-slate-400">
                                {row.associatedRisks.join(', ')}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {row.errors.length > 0 && (
                              <div className="text-rose-400 font-bold space-y-0.5">
                                {row.errors.map((err, i) => (
                                  <div key={i}>• {err}</div>
                                ))}
                              </div>
                            )}
                            {row.warnings.length > 0 && (
                              <div className="text-amber-400 space-y-0.5">
                                {row.warnings.map((warn, i) => (
                                  <div key={i}>⚠ {warn}</div>
                                ))}
                              </div>
                            )}
                            {row.errors.length === 0 && row.warnings.length === 0 && (
                              <span className="text-slate-500">Correcto</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Results Summary */}
          {step === 'results' && uploadResult && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  ¡Carga Masiva Completada!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Se crearon e integraron exitosamente los legajos de seguridad y salud en la nómina activa.
                </p>
              </div>

              <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-2xl font-bold text-emerald-400">{uploadResult.successCount}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Trabajadores Incorporados</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-2xl font-bold text-rose-400">{uploadResult.errorCount}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Filas con Error Omitidas</div>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="text-left max-w-lg mx-auto p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 space-y-1">
                  <div className="font-bold mb-1">Detalle de errores durante la persistencia:</div>
                  {uploadResult.errors.map((e, idx) => (
                    <div key={idx} className="text-[11px]">
                      • Fila {e.row} (CUIL: {e.cuil || 'N/A'}): {e.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          {step === 'input' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-semibold text-xs"
              >
                Cancelar
              </button>
              <div className="text-[11px] text-slate-500">
                Paso 1 de 2: Selección y carga de archivo
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-semibold text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Volver a Cargar</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmitBatch}
                  disabled={validCount === 0 || isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando {validCount} legajos...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar e Importar {validCount} Trabajadores</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'results' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20"
              >
                Cerrar y Ver Nómina Actualizada
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
