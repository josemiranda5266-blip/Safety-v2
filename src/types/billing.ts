// Temporal consistency: All timestamps are ISO 8601 strings (UTC) in this phase.
// The future persistence layer will convert between Firestore Timestamp <-> ISO string.

/**
 * ACCOUNTING & SECURITY RULES:
 * 1. CreditBalance belongs to the Organization (tenant root).
 * 2. CreditLedgerEntry identifies both the organization and the user who triggered the operation.
 * 3. The client CANNOT modify the ledger or increase its own balance.
 * 4. The backend is the SOLE authority to reserve, consume, release, or grant credits.
 * 5. All debits are idempotent using idempotencyKey / requestId.
 */

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

export type CreditLedgerStatus =
  | 'RESERVED'
  | 'CONSUMED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'GRANTED'
  | 'PURCHASED';

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
  operationId?: string; // ID de la entidad generada (InspectionReport, HazardAnalysisResult, etc.)
  credits: number; // Monto descontado (positivo) o acreditado
  idempotencyKey: string; // Clave única de idempotencia V2
  requestId: string; // Mantenido por compatibilidad conceptual
  status: CreditLedgerStatus;
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
  periodStart: string; // ISO 8601 string
  periodEnd: string; // ISO 8601 string
  lastUpdated: string; // ISO 8601 string
}

