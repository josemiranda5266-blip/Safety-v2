import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  FileText, 
  Eye, 
  ArrowRight,
  Send,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { useTenant } from '../../../context/TenantContext';
import { DocumentCategory } from '../../../types/documentManagement';

interface TemplateItem {
  id: string;
  title: string;
  category: DocumentCategory;
  resolution: string;
  frequency: string;
  description: string;
  fieldsIncluded: string[];
  generateContent: (companyName: string, cuit: string, establishment: string, activity: string) => string;
}

const TEMPLATES_CATALOG: TemplateItem[] = [
  {
    id: 'epp-srt-299-11',
    title: 'Constancia de Entrega de Ropa de Trabajo y EPP',
    category: 'EPP',
    resolution: 'Resolución SRT 299/11 (Anexo I)',
    frequency: 'Periódica / Por desgaste o reposición',
    description: 'Planilla oficial obligatoria de entrega de Elementos de Protección Personal con acreditación de certificación IRAM / Sello S y firma del trabajador.',
    fieldsIncluded: ['Razón Social y CUIT', 'Datos del Trabajador y CUIL', 'Puesto y Sector', 'Tipología de EPP', 'Marca y Certificación IRAM/S', 'Firma y Fecha'],
    generateContent: (comp, cuit, est, act) => `================================================================================
CONSTANCIA DE ENTREGA DE ROPA DE TRABAJO Y ELEMENTOS DE PROTECCIÓN PERSONAL
(Conforme Resolución SRT N° 299/11 - Anexo I)
================================================================================

1. DATOS DE LA EMPRESA Y ESTABLECIMIENTO
--------------------------------------------------------------------------------
Razón Social: ${comp || '____________________________________________'}
CUIT: ${cuit || '__-________-_'}
Actividad Principal: ${act || '____________________________________________'}
Establecimiento / Planta: ${est || 'Planta Principal'}
Dirección: ____________________________________________________________________

2. DATOS DEL TRABAJADOR
--------------------------------------------------------------------------------
Apellido y Nombre: ___________________________________________________________
DNI / CUIL: ________________________   Fecha de Ingreso: ____/____/________
Sector / Área: _____________________   Puesto / Tarea: ________________________

3. REGISTRO DE ELEMENTOS ENTREGADOS
--------------------------------------------------------------------------------
N° | Elemento de Protección / Prenda | Marca / Modelo | Sello IRAM/S | Cant | Fecha Entrega | Firma Trabajador
---|---------------------------------|----------------|--------------|------|---------------|------------------
01 | Calzado de Seguridad con puntera|                |              |  1   |   /  /2026    | 
02 | Casco de Seguridad Industrial   |                |              |  1   |   /  /2026    | 
03 | Gafas de Seguridad Anti-impacto |                |              |  1   |   /  /2026    | 
04 | Protector Auditivo tipo Copa/End|                |              |  1   |   /  /2026    | 
05 | Guantes de Protección Mecánica  |                |              |  2   |   /  /2026    | 
06 | Ropa de Trabajo (Pantalón/Camisa|                |              |  2   |   /  /2026    | 

4. DECLARACIÓN JURADA DEL TRABAJADOR
--------------------------------------------------------------------------------
El trabajador declara haber recibido los Elementos de Protección Personal detallados en perfecto estado de conservación y uso, comprometiéndose a utilizarlos obligatoriamente durante su jornada laboral y conservarlos conforme las instrucciones recibidas (Art. 10 Ley 19.587).

Firma del Trabajador: ______________________  Aclaración: ______________________
Firma Responsable H&S / Empleador: _________  Matrícula: _______________________
`
  },
  {
    id: 'capacitacion-dec-351',
    title: 'Registro Oficial de Capacitación Interna de CySAT',
    category: 'Capacitaciones',
    resolution: 'Decreto 351/79 Cap. 21 / Ley 19.587 Art. 9',
    frequency: 'Mensual / Anual según Programa',
    description: 'Acta formal de capacitación técnica y entrenamiento a trabajadores con temario, metodología de evaluación y registro de firmas.',
    fieldsIncluded: ['Tema de Capacitación', 'Objetivos Pedagógicos', 'Duración en Horas', 'Material Didáctico', 'Nómina con Firma y DNI', 'Firma del Capacitador'],
    generateContent: (comp, cuit, est, act) => `================================================================================
ACTA OFICIAL DE CAPACITACIÓN EN HIGIENE Y SEGURIDAD EN EL TRABAJO
(Decreto 351/79 Capítulo 21 - Formación y Entrenamiento)
================================================================================

1. DATOS GENERALES
--------------------------------------------------------------------------------
Empresa: ${comp || '____________________________________________'}
CUIT: ${cuit || '__-________-_'}   Establecimiento: ${est || 'Planta Principal'}
Fecha de Dictado: ____/____/2026   Horario: ____:____ a ____:____ (Total: ___ hs)
Lugar / Aula / Sector: ________________________________________________________

2. INFORMACIÓN TÉCNICA DE LA CAPACITACIÓN
--------------------------------------------------------------------------------
Tema / Módulo: ________________________________________________________________
Marco Normativo de Referencia: Ley 19.587 / Dec. Reglamentario ___________
Objetivo: Entrenar al personal en identificación de riesgos y adopción de prácticas seguras.
Metodología: Teórico - Práctico con Evaluación de Comprensión.
Material Entregado: [ ] Folletería  [ ] Manual  [ ] Presentación Digital

3. NÓMINA DE TRABAJADORES ASISTENTES
--------------------------------------------------------------------------------
N° | Apellido y Nombre | DNI / CUIL | Puesto de Trabajo | Calificación | Firma Asistencia
---|-------------------|------------|-------------------|--------------|-----------------
01 |                   |            |                   |              | 
02 |                   |            |                   |              | 
03 |                   |            |                   |              | 
04 |                   |            |                   |              | 
05 |                   |            |                   |              | 
06 |                   |            |                   |              | 
07 |                   |            |                   |              | 
08 |                   |            |                   |              | 

4. ACREDITACIÓN DEL PROFESIONAL CAPACITADOR
--------------------------------------------------------------------------------
Nombre del Instructor / Profesional: __________________________________________
Título Habilitante: Lic. / Esp. en Higiene y Seguridad Laboral
Matrícula Profesional / Registro N°: __________________________________________
Firma y Sello: ________________________________________________________________
`
  },
  {
    id: 'puesta-a-tierra-900-15',
    title: 'Protocolo de Medición de Puesta a Tierra (Res. 900/15)',
    category: 'Mediciones',
    resolution: 'Resolución SRT 900/15 (Anexo I)',
    frequency: 'Anual Obligatoria',
    description: 'Protocolo unificado para la verificación de puesta a tierra y continuidad de las masas según la reglamentación técnica de la SRT.',
    fieldsIncluded: ['Datos de Instrumento y Calibración INTI/IRAM', 'Estado de Jabalinas', 'Valores de Resistencia en Ohms', 'Continuidad de Masas', 'Dictamen del Profesional'],
    generateContent: (comp, cuit, est, act) => `================================================================================
PROTOCOLO DE MEDICIÓN DE PUESTA A TIERRA Y CONTINUIDAD DE LAS MASAS
(Resolución SRT N° 900/15 - Anexo I)
================================================================================

1. DATOS DEL ESTABLECIMIENTO
--------------------------------------------------------------------------------
Razón Social: ${comp || '____________________________________________'}
CUIT: ${cuit || '__-________-_'}
Establecimiento: ${est || 'Planta Principal'}
Actividad: ${act || '____________________________________________'}
Dirección: ____________________________________________________________________

2. DATOS DEL INSTRUMENTO UTILIZADO
--------------------------------------------------------------------------------
Tipo de Instrumento: Telurímetro Digital de 3/4 Jabalinas
Marca: ________________________   Modelo: ________________________
N° de Serie: __________________   Fecha de Calibración Vigente: ____/____/2026
Certificado de Calibración N°: ________________ (Adjunto con trazabilidad)

3. TABLA DE MEDICIONES DE ELECTRODOS DE PUESTA A TIERRA
--------------------------------------------------------------------------------
Punto | Ubicación / Sector | Tipo Electrodo | Valor Medido (Ω) | Valor Máx Permisible | Estado
------|--------------------|----------------|------------------|----------------------|-------
T01   | Tablero Principal  | Jabalina Cu    |                  | ≤ 10 Ω (Dec. 351/79) | 
T02   | Sala de Máquinas   | Jabalina Cu    |                  | ≤ 10 Ω (Dec. 351/79) | 
T03   | Tablero Seccional 1| Jabalina Cu    |                  | ≤ 10 Ω (Dec. 351/79) | 
T04   | Línea de Producción| Malla / Jabal. |                  | ≤ 10 Ω (Dec. 351/79) | 

4. VERIFICACIÓN DE CONTINUIDAD DE LAS MASAS Y DISPOSITIVOS DIFERENCIALES
--------------------------------------------------------------------------------
- Continuidad de conductor de protección (PE): [ ] Conforme  [ ] No Conforme
- Dispositivos diferenciales (30mA):           [ ] Verificados en tiempo y corriente de disparo

5. CONCLUSIÓN Y DICTAMEN TÉCNICO
--------------------------------------------------------------------------------
El profesional firmante dictamina que la instalación eléctrica del establecimiento [ ] CUMPLE / [ ] NO CUMPLE con las condiciones de seguridad requeridas por la Res. SRT 900/15.

Firma del Profesional Habilitado: _______________________
Aclaración: _____________________________________________
Matrícula Colegio de Ingenieros / Especialistas: ________
Fecha de Emisión: ____/____/2026   Fecha de Vencimiento: ____/____/2027
`
  },
  {
    id: 'iluminacion-84-12',
    title: 'Protocolo de Medición de Iluminación Laboral (Res. 84/12)',
    category: 'Mediciones',
    resolution: 'Resolución SRT 84/12 (Anexo I)',
    frequency: 'Anual Obligatoria',
    description: 'Protocolo unificado para el relevamiento de iluminación en puestos de trabajo según tabla de valores mínimos de la Ley 19.587.',
    fieldsIncluded: ['Puntos de Muestreo', 'Tipo de Tarea Visual', 'Valor Medido (Lux)', 'Valor Requerido s/ Dec 351', 'Conformidad'],
    generateContent: (comp, cuit, est, act) => `================================================================================
PROTOCOLO DE MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL
(Resolución SRT N° 84/12)
================================================================================

1. DATOS DE LA EMPRESA
--------------------------------------------------------------------------------
Empresa: ${comp || '____________________________________________'}
CUIT: ${cuit || '__-________-_'}   Establecimiento: ${est || 'Planta Principal'}

2. INSTRUMENTAL
--------------------------------------------------------------------------------
Luxómetro Digital Marca: ________________ Modelo: ________________
N° Serie: ________________ Certificado de Calibración N°: ________________

3. PLANILLA DE MEDICIONES
--------------------------------------------------------------------------------
Punto | Puesto / Área | Tipo Iluminación | Tarea Visual | Lux Medido | Lux Exigido | Estado
------|---------------|------------------|--------------|------------|-------------|-------
01    | Puesto Op. 1  | Artificial / LED | Mecanizado   |            | 300 Lux     | 
02    | Administración| Artificial       | Pantalla PVD |            | 500 Lux     | 
03    | Depósito      | Mixta            | Tránsito/Carg|            | 100 Lux     | 

4. DICTAMEN TÉCNICO
--------------------------------------------------------------------------------
Firma Profesional H&S: ___________________  Matrícula: __________________
Fecha: ____/____/2026   Próxima Renovación: ____/____/2027
`
  },
  {
    id: 'plan-evacuacion-emergencias',
    title: 'Plan de Contingencias y Rol de Evacuación Anual',
    category: 'Emergencias',
    resolution: 'Decreto 351/79 Cap. 18 / Norma IRAM 3597',
    frequency: 'Actualización Anual / Con Simulacro',
    description: 'Estructura integral para la organización de la brigada de emergencias, asignación de roles de evacuación, medios de escape y simulacros.',
    fieldsIncluded: ['Director de Emergencias', 'Líderes de Piso y Sector', 'Roles de Corte de Suministros', 'Punto de Encuentro', 'Planilla de Simulacro'],
    generateContent: (comp, cuit, est, act) => `================================================================================
PLAN DE CONTINGENCIAS, EMERGENCIA Y ROL DE EVACUACIÓN
(Conforme Decreto 351/79 Capítulo 18 - Protección Contra Incendios)
================================================================================

1. IDENTIFICACIÓN DEL ESTABLECIMIENTO
--------------------------------------------------------------------------------
Razón Social: ${comp || '____________________________________________'}
CUIT: ${cuit || '__-________-_'}
Establecimiento: ${est || 'Planta Principal'}
Superficie Total: _______ m²   Población Ocupante: _______ personas

2. ORGANIZACIÓN DEL ROL DE EVACUACIÓN (BRIGADA INTERNA)
--------------------------------------------------------------------------------
- Director de la Emergencia (Titular): ____________________ Tel: ________________
- Director de la Emergencia (Suplente): ___________________ Tel: ________________
- Encargado de Comunicación / Alerta: ____________________
- Encargado de Corte de Energía / Gas: ___________________
- Líder de Evacuación Sector A: __________________________
- Líder de Evacuación Sector B: __________________________
- Encargados de Primeros Auxilios: _______________________

3. PAUTAS Y CONSIGNAS DE EVACUACIÓN
--------------------------------------------------------------------------------
1. Ante la señal de alarma continua, suspender tareas inmediatamente.
2. Mantener la calma, no correr, no retroceder a buscar pertenencias personales.
3. Seguir las instrucciones de los Líderes de Sector hacia las salidas de emergencia.
4. Concentrarse ordenadamente en el PUNTO DE ENCUENTRO EXTERNO asignado.
5. Realizar el recuento de personal y reportar al Director de Emergencia.

PUNTO DE ENCUENTRO SEGURO: ____________________________________________________

4. PROGRAMA ANUAL DE SIMULACROS
--------------------------------------------------------------------------------
Simulacro Previsto: ____/____/2026   Hipótesis: Incendio en Sector Producción.

Responsable de HyST: ___________________________ Matrícula: ___________________
`
  },
  {
    id: 'acta-inspeccion-seguridad',
    title: 'Acta de Inspección Periódica de Seguridad y Hallazgos',
    category: 'Inspecciones',
    resolution: 'Sistema de Gestión SG-SST / Res. SRT 905/15',
    frequency: 'Mensual / Quincenal',
    description: 'Checklist y acta de relevamiento en campo para registrar condiciones subestándar, actos inseguros y planes de acción correctivos.',
    fieldsIncluded: ['Sector Inspeccionado', 'Peligro / Desvío Detectado', 'Nivel de Riesgo', 'Medida Correctiva Inmediata', 'Responsable y Fecha Límite'],
    generateContent: (comp, cuit, est, act) => `================================================================================
ACTA DE INSPECCIÓN TÉCNICA DE SEGURIDAD Y CONDICIONES DE TRABAJO
================================================================================

Empresa: ${comp || '____________________________________________'}
CUIT: ${cuit || '__-________-_'}   Establecimiento: ${est || 'Planta Principal'}
Fecha de Inspección: ____/____/2026   Inspector: _______________________________

REGISTRO DE HALLAZGOS Y PLAN DE ACCIÓN
--------------------------------------------------------------------------------
N° | Sector / Máquina | Condición / Acto Desvío | Riesgo (A/M/B) | Acción Correctiva | Responsable | Fecha Límite
---|------------------|-------------------------|----------------|-------------------|-------------|-------------
01 |                  |                         |                |                   |             | 
02 |                  |                         |                |                   |             | 
03 |                  |                         |                |                   |             | 
04 |                  |                         |                |                   |             | 
05 |                  |                         |                |                   |             | 

Firma del Auditor / Inspector: ____________________
Firma del Responsable del Sector: __________________
`
  }
];

export const DocumentsTemplates: React.FC = () => {
  const { companies, activeCompanyId, establishments } = useTenant();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(TEMPLATES_CATALOG[0]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(activeCompanyId || (companies[0]?.id || ''));
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSendingToDocs, setIsSendingToDocs] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const selectedComp = companies.find((c) => c.id === selectedCompanyId);
  const companyName = selectedComp ? (selectedComp.tradeName || selectedComp.legalName) : '';
  const companyCuit = selectedComp?.cuit || '';
  const companyActivity = selectedComp?.activityDescription || '';

  const companyEstablishments = establishments.filter((e) => !selectedCompanyId || e.companyId === selectedCompanyId);
  const activeEst = companyEstablishments.find((e) => e.id === selectedEstablishmentId) || companyEstablishments[0];
  const establishmentName = activeEst ? activeEst.name : 'Planta Principal';

  const previewText = selectedTemplate.generateContent(
    companyName,
    companyCuit,
    establishmentName,
    companyActivity
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([previewText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.id}_${companyName ? companyName.replace(/\s+/g, '_') : 'modelo'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-50 dark:to-slate-900 border border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Biblioteca de Modelos y Plantillas Oficiales SRT / CySAT
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wider">
                Argentina
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Descarga o genera documentos con formato oficial ajustado a la normativa vigente, listos para imprimir o personalizar con los datos de tu empresa.
            </p>
          </div>
        </div>

        {/* Company Selector for Auto-population */}
        <div className="flex items-center gap-2 shrink-0">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName || c.legalName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Grid: Templates List (Left) & Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Templates Catalog */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            Plantillas Reglamentarias ({TEMPLATES_CATALOG.length})
          </span>

          <div className="space-y-2.5">
            {TEMPLATES_CATALOG.map((tmpl) => {
              const isSelected = selectedTemplate.id === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 shadow-md ring-1 ring-orange-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {tmpl.category}
                    </span>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                      {tmpl.frequency}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {tmpl.title}
                  </h3>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {tmpl.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">{tmpl.resolution}</span>
                    <span className={`font-bold flex items-center gap-1 ${isSelected ? 'text-orange-600' : 'text-slate-400'}`}>
                      <span>Ver Modelo</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Formatted Preview & Export Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
            {/* Preview Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  {selectedTemplate.resolution}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTemplate.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                  title="Copiar texto formateado"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>

                <button
                  onClick={handleDownloadTxt}
                  className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  title="Descargar archivo .txt"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>
            </div>

            {/* Checklist of included fields */}
            <div className="py-3 flex flex-wrap gap-1.5 border-b border-slate-100 dark:border-slate-800">
              {selectedTemplate.fieldsIncluded.map((field, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700/60 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  {field}
                </span>
              ))}
            </div>

            {/* Preview Box */}
            <div className="mt-4 flex-1">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[480px] select-all border border-slate-800">
                {previewText}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
