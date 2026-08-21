import React from 'react';
import { 
  Users, 
  FileCheck, 
  AlertTriangle, 
  HardHat, 
  GraduationCap, 
  FileText, 
  Calendar, 
  BarChart3, 
  Construction,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

interface ModulePlaceholderProps {
  moduleKey: string;
  onNavigateHome: () => void;
  onOpenCreateCompany?: () => void;
}

const MODULE_DEFINITIONS: Record<string, { title: string; subtitle: string; icon: any; phase: string; summary: string }> = {
  employees: {
    title: 'Nómina de Trabajadores y Cuadrillas',
    subtitle: 'Control de CUIL, contratos, altas tempranas AFIP y asignación de puestos.',
    icon: Users,
    phase: 'Fase 2',
    summary: 'Los datos estructurales de Puestos y Sectores ya están vinculados en el backend.',
  },
  inspections: {
    title: 'Inspecciones de Campo y Auditorías',
    subtitle: 'Protocolos de verificación preventiva en establecimientos y obras en construcción.',
    icon: FileCheck,
    phase: 'Fase 3',
    summary: 'Listas de control según Dec. 351/79 y Res. SRT 911/96.',
  },
  corrective_actions: {
    title: 'Acciones Correctivas y Preventivas (CAPA)',
    subtitle: 'Seguimiento de hallazgos, desvíos, responsables y plazos de remediación.',
    icon: AlertTriangle,
    phase: 'Fase 3',
    summary: 'Plan de acción integral con cálculo automático de vencimientos.',
  },
  ppe: {
    title: 'Gestión y Entrega de EPP (Res. SRT 299/11)',
    subtitle: 'Constancias de entrega de elementos de protección personal con firma digital.',
    icon: HardHat,
    phase: 'Fase 4',
    summary: 'Control de stock, caducidades y matriz de EPP por puesto de trabajo.',
  },
  trainings: {
    title: 'Plan Anual de Capacitaciones',
    subtitle: 'Registro de cursos de inducción, uso de extintores, ergonomía y simulacros.',
    icon: GraduationCap,
    phase: 'Fase 4',
    summary: 'Control de asistencia y certificación de horas cátedra de formación.',
  },
  documentation: {
    title: 'Legajo Técnico y Documentación Legal',
    subtitle: 'Habilitaciones municipales, pólizas de ART, programas de seguridad aprobados.',
    icon: FileText,
    phase: 'Fase 5',
    summary: 'Repositorio documental centralizado por empresa y establecimiento.',
  },
  calendar: {
    title: 'Calendario y Vencimientos SG-SST',
    subtitle: 'Cronograma preventivo de mediciones (ruido, iluminación, PAT) y recarga de extintores.',
    icon: Calendar,
    phase: 'Fase 5',
    summary: 'Alertas automáticas a 30, 15 y 7 días previos al vencimiento legal.',
  },
  reports: {
    title: 'Informes Ejecutivos e Indicadores de Siniestralidad',
    subtitle: 'Índices de frecuencia, gravedad, incidencia y reportes consolidados para ART.',
    icon: BarChart3,
    phase: 'Fase 6',
    summary: 'Estadísticas de gestión y exportación de informes técnicos para la autoridad de aplicación.',
  },
};

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleKey,
  onNavigateHome,
}) => {
  const { activeCompany, establishments, sectors, positions } = useTenant();
  const config = MODULE_DEFINITIONS[moduleKey] || {
    title: 'Módulo del Sistema SG-SST',
    subtitle: 'Gestión técnica y administrativa de Higiene y Seguridad.',
    icon: Construction,
    phase: 'Próxima Fase',
    summary: 'Módulo en desarrollo según el roadmap de Safety IA V2.',
  };

  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Icon className="w-7 h-7 text-orange-500" />
            <span>{config.title}</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {config.subtitle}
          </p>
        </div>

        <span className="px-3 py-1 text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full">
          {config.phase} Roadmap
        </span>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
          <Icon className="w-8 h-8" />
        </div>

        <div className="max-w-lg mx-auto space-y-2">
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
            Estructura Base Lista para {config.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {config.summary}
          </p>
        </div>

        {/* Current Active Context Badge */}
        {activeCompany ? (
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left space-y-2">
            <div className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-orange-500" />
              <span>Empresa Activa Seleccionada</span>
            </div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {activeCompany.legalName}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>CUIT: {activeCompany.cuit}</span>
              <span>•</span>
              <span>{establishments.filter(e => e.companyId === activeCompany.id).length} establecimientos</span>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            Estás visualizando la consola en modo global. Selecciona una empresa en la barra superior para contextualizar este módulo.
          </div>
        )}

        <div>
          <button
            onClick={onNavigateHome}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all hover:scale-105"
          >
            Volver a la Consola Principal
          </button>
        </div>
      </div>
    </div>
  );
};
