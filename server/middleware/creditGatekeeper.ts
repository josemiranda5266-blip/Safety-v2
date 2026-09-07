import { Response, NextFunction } from "express";
import { OperationCostType, OPERATION_CREDIT_COSTS } from "../config/plans";
import { checkUserCredits, deductUserCredits, UserProfileServer } from "../services/creditService";
import { AuthenticatedRequest, isPersonalMode } from "./auth";

export interface CreditContext {
  operationType: OperationCostType;
  cost: number;
  uid: string;
  commit: (details?: string) => { success: boolean; remainingCredits: number; profile: UserProfileServer };
}

export interface CreditGuardedRequest extends AuthenticatedRequest {
  creditContext?: CreditContext;
}

export function requireAiCredits(operationType: OperationCostType) {
  return (req: CreditGuardedRequest, res: Response, next: NextFunction) => {
    if (isPersonalMode()) {
      const uid = req.userUid || "personal_local_user";
      const cost = OPERATION_CREDIT_COSTS[operationType] || 0;
      const now = new Date();
      const personalProfile: UserProfileServer = {
        uid,
        email: req.userEmail || "personal@safetyia.local",
        displayName: req.userDisplayName || "Usuario Personal Safety IA",
        role: "professional",
        plan: "free",
        monthlyCredits: 1000000,
        creditsUsed: 0,
        billingPeriodStart: now.toISOString(),
        billingPeriodEnd: new Date("2999-12-31T23:59:59.999Z").toISOString(),
        createdAt: now.toISOString(),
      };

      req.creditContext = {
        operationType,
        cost,
        uid,
        commit: () => ({
          success: true,
          remainingCredits: personalProfile.monthlyCredits,
          profile: personalProfile,
        }),
      };
      next();
      return;
    }

    if (!req.identity || !req.userUid) {
      return res.status(401).json({
        error: "No autenticado",
        code: "UNAUTHENTICATED",
        message: "Se requiere un token de autenticación válido para acceder a las operaciones de IA.",
      });
    }

    const uid = req.userUid;
    const { allowed, cost, availableCredits, profile } = checkUserCredits(uid, operationType);

    if (!allowed) {
      return res.status(402).json({
        error: "AI_CREDITS_EXHAUSTED",
        message: `Has alcanzado el límite mensual de créditos para tu ${profile.plan.toUpperCase()}. Necesitas ${cost} crédito(s) y tienes ${availableCredits} disponible(s).`,
        plan: profile.plan,
        creditsAvailable: availableCredits,
        requiredCredits: cost,
        totalMonthlyCredits: profile.monthlyCredits,
        renewalDate: profile.billingPeriodEnd,
      });
    }

    let committed = false;
    req.creditContext = {
      operationType,
      cost,
      uid,
      commit: (details?: string) => {
        if (!committed) {
          committed = true;
          return deductUserCredits(uid, operationType, details);
        }
        return { success: true, remainingCredits: availableCredits, profile };
      },
    };

    next();
  };
}
