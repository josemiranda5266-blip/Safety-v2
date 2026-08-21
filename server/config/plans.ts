export type UserPlan = 'free' | 'pro' | 'pro_plus';

export interface PlanDetails {
  name: string;
  code: UserPlan;
  monthlyCredits: number;
  priceUSD: number;
  features: string[];
  maxPayloadMB: number;
  concurrencyLimit: number;
}

export const PLAN_CONFIG: Record<UserPlan, PlanDetails> = {
  free: {
    name: 'Plan Gratuito (Estudiante / Inicial)',
    code: 'free',
    monthlyCredits: 20,
    priceUSD: 0,
    features: [
      '20 créditos mensuales de IA',
      'Acceso a biblioteca legal básica (Ley 19.587, Dec. 351/79)',
      'Consultas RAG de normativa',
      'Generación de checklists básicos',
      'Exportación en PDF',
    ],
    maxPayloadMB: 10,
    concurrencyLimit: 1,
  },
  pro: {
    name: 'Plan Profesional (Técnicos y Licenciados)',
    code: 'pro',
    monthlyCredits: 300,
    priceUSD: 19,
    features: [
      '300 créditos mensuales de IA',
      'Todas las funciones del Plan Free',
      'OCR ilimitado de documentos escaneados',
      'Comparación analítica entre normas',
      'Análisis fotográfico de riesgos en campo',
      'Informes Inspector IA con respaldo legal',
      'Exportación en Word (.docx) y Excel (.xlsx)',
    ],
    maxPayloadMB: 25,
    concurrencyLimit: 3,
  },
  pro_plus: {
    name: 'Plan Pro Plus / Empresas',
    code: 'pro_plus',
    monthlyCredits: 1000,
    priceUSD: 49,
    features: [
      '1.000 créditos mensuales de IA',
      'Prioridad máxima de procesamiento',
      'Carga masiva de normativas empresariales',
      'Múltiples inspectores simultáneos',
      'Auditoría y trazabilidad avanzada de consultas',
      'Soporte técnico preferencial',
    ],
    maxPayloadMB: 50,
    concurrencyLimit: 5,
  },
};

export type OperationCostType =
  | 'CHAT_RAG'
  | 'DOCUMENT_COMPARISON'
  | 'OCR'
  | 'IMAGE_ANALYSIS'
  | 'INSPECTOR_IA'
  | 'SUMMARY'
  | 'CHECKLIST'
  | 'SUGGESTIONS'
  | 'DRAFTING'
  | 'PLANNING';

export const OPERATION_CREDIT_COSTS: Record<OperationCostType, number> = {
  CHAT_RAG: 1,
  SUMMARY: 2,
  CHECKLIST: 2,
  DOCUMENT_COMPARISON: 2,
  OCR: 3,
  IMAGE_ANALYSIS: 4,
  INSPECTOR_IA: 5,
  SUGGESTIONS: 2,
  DRAFTING: 2,
  PLANNING: 2,
};
