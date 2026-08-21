import { Response, NextFunction } from "express";
import { OperationCostType, OPERATION_CREDIT_COSTS } from "../config/plans";
import { checkUserCredits, deductUserCredits, UserProfileServer } from "../services/creditService";
import { AuthenticatedRequest } from "./auth";

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
    const uid = req.userUid || "anonymous_user";
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

    // Attach commit helper so credits are only deducted upon successful AI completion
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
