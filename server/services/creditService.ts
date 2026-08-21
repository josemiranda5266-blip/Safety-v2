import { PLAN_CONFIG, UserPlan, OperationCostType, OPERATION_CREDIT_COSTS } from "../config/plans";

export interface UserProfileServer {
  uid: string;
  email?: string;
  displayName?: string;
  role: "professional" | "admin";
  plan: UserPlan;
  monthlyCredits: number;
  creditsUsed: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreditTransactionRecord {
  id: string;
  userId: string;
  operationType: OperationCostType;
  creditsDeducted: number;
  timestamp: string;
  success: boolean;
  details?: string;
}

// In-memory store for server runtime (retained across requests, authoritative on backend)
const userProfilesStore = new Map<string, UserProfileServer>();
const transactionLogs: CreditTransactionRecord[] = [];

// Helper to compute 30 days window
function calculateBillingWindow(startDate: Date = new Date()): { start: string; end: string } {
  const start = startDate.toISOString();
  const end = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return { start, end };
}

/**
 * Retrieves or initializes a user profile with default free tier credits and 30-day period.
 */
export function getOrCreateUserProfile(uid: string, email?: string, displayName?: string): UserProfileServer {
  let profile = userProfilesStore.get(uid);

  const now = new Date();

  if (!profile) {
    const { start, end } = calculateBillingWindow(now);
    profile = {
      uid,
      email: email || "usuario@safetyia.com",
      displayName: displayName || "Profesional H&S",
      role: "professional",
      plan: "free",
      monthlyCredits: PLAN_CONFIG.free.monthlyCredits,
      creditsUsed: 0,
      billingPeriodStart: start,
      billingPeriodEnd: end,
      createdAt: now.toISOString(),
    };
    userProfilesStore.set(uid, profile);
  } else {
    // Check if billing period has expired -> auto-reset monthly credits
    const periodEnd = new Date(profile.billingPeriodEnd);
    if (now >= periodEnd) {
      const { start, end } = calculateBillingWindow(now);
      profile.billingPeriodStart = start;
      profile.billingPeriodEnd = end;
      profile.creditsUsed = 0;
      profile.updatedAt = now.toISOString();
      console.log(`[Credits Engine] Período mensual renovado automáticamente para UID: ${uid}`);
    }
  }

  return profile;
}

/**
 * Checks if the user has sufficient credits for an operation.
 */
export function checkUserCredits(uid: string, operationType: OperationCostType): {
  allowed: boolean;
  cost: number;
  availableCredits: number;
  profile: UserProfileServer;
} {
  const profile = getOrCreateUserProfile(uid);
  const cost = OPERATION_CREDIT_COSTS[operationType] || 1;
  const availableCredits = Math.max(0, profile.monthlyCredits - profile.creditsUsed);

  return {
    allowed: availableCredits >= cost,
    cost,
    availableCredits,
    profile,
  };
}

/**
 * Deducts credits for a completed AI operation and logs the transaction.
 */
export function deductUserCredits(
  uid: string,
  operationType: OperationCostType,
  details?: string
): { success: boolean; remainingCredits: number; profile: UserProfileServer } {
  const profile = getOrCreateUserProfile(uid);
  const cost = OPERATION_CREDIT_COSTS[operationType] || 1;

  profile.creditsUsed += cost;
  profile.updatedAt = new Date().toISOString();

  const transaction: CreditTransactionRecord = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: uid,
    operationType,
    creditsDeducted: cost,
    timestamp: new Date().toISOString(),
    success: true,
    details,
  };

  transactionLogs.push(transaction);

  console.log(
    `[Credit Gatekeeper] Descontados ${cost} créditos para UID ${uid} (${operationType}). Restantes: ${profile.monthlyCredits - profile.creditsUsed}/${profile.monthlyCredits}`
  );

  return {
    success: true,
    remainingCredits: Math.max(0, profile.monthlyCredits - profile.creditsUsed),
    profile,
  };
}

/**
 * Changes a user's subscription plan.
 */
export function updateUserPlan(uid: string, newPlan: UserPlan): UserProfileServer {
  const profile = getOrCreateUserProfile(uid);
  const planInfo = PLAN_CONFIG[newPlan] || PLAN_CONFIG.free;

  profile.plan = newPlan;
  profile.monthlyCredits = planInfo.monthlyCredits;
  // If upgrading, keep existing usage or reset if plan upgraded to larger tier
  profile.updatedAt = new Date().toISOString();

  console.log(`[Subscription Engine] Plan actualizado para UID ${uid} a: ${newPlan} (${planInfo.monthlyCredits} créditos/mes)`);

  return profile;
}

export function getUserTransactions(uid: string): CreditTransactionRecord[] {
  return transactionLogs.filter((t) => t.userId === uid);
}
