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

/**
 * Safety IA is a personal-use application.
 * The legacy plan model is kept only for backwards-compatible data structures;
 * the active `free` profile is now the Personal profile and exposes the complete
 * application without registration, subscription or feature gating.
 */
export const PLAN_CONFIG: Record<UserPlan, PlanDetails> = {
  free: {
    name: 'Uso personal',
    code: 'free',
    // Effectively unlimited for a personal installation while retaining the
    // existing credit accounting infrastructure as a safety guard.
    monthlyCredits: 1000000,
    priceUSD: 0,
    features: [
      'Acceso completo a todas las funciones de Safety IA',
      'Biblioteca documental personal',
      'Consultas RAG de normativa',
      'OCR de documentos e imágenes',
      'Comparación analítica entre documentos',
      'Análisis fotográfico de riesgos',
      'Inspector IA',
      'Checklists y planificación',
      'Informes y exportación PDF, Word y Excel',
      'Gestión de empresas, establecimientos, sectores, puestos y legajos',
    ],
    maxPayloadMB: 50,
    concurrencyLimit: 5,
  },
  // Legacy values retained so existing persisted records remain deserializable.
  // Personal mode never exposes a registration/subscription flow for these plans.
  pro: {
    name: 'Legacy / no utilizado',
    code: 'pro',
    monthlyCredits: 1000000,
    priceUSD: 0,
    features: ['Todas las funciones'],
    maxPayloadMB: 50,
    concurrencyLimit: 5,
  },
  pro_plus: {
    name: 'Legacy / no utilizado',
    code: 'pro_plus',
    monthlyCredits: 1000000,
    priceUSD: 0,
    features: ['Todas las funciones'],
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
