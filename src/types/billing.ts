export type AIOperation =
  | 'CHAT_RAG'
  | 'SUMMARY'
  | 'CHECKLIST'
  | 'DOCUMENT_COMPARISON'
  | 'OCR'
  | 'IMAGE_ANALYSIS'
  | 'INSPECTOR_IA'
  | 'COMPLIANCE_AUDIT';

export type AIPlanTier = 'free' | 'pro' | 'pro_plus' | 'enterprise';

export interface AIPlan {
  id: AIPlanTier;
  name: string;
  monthlyCredits: number;
  priceUSD: number;
  priceARS?: number;
  features: string[];
  maxDailyRequests?: number;
  priorityQueue: boolean;
  allowedOperations: AIOperation[];
}

export interface CreditLedgerEntry {
  id: string;
  orgId: string;
  userId: string;
  operationType: AIOperation;
  credits: number; // Monto descontado (positivo) o recargado
  requestId: string; // Idempotency key para prevenir cobros duplicados
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED';
  timestamp: string; // ISO 8601 UTC
  metadata?: {
    modelUsed?: string;
    tokenCount?: number;
    latencyMs?: number;
    errorMessage?: string;
    targetEntityId?: string;
    targetEntityType?: string;
  };
}

export interface CreditBalance {
  orgId: string;
  plan: AIPlanTier;
  monthlyAllowance: number;
  creditsUsedThisPeriod: number;
  availableCredits: number;
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
}
