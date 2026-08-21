import { Router, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { requireAuth } from "../authorization/middleware";
import {
  getOrCreateUserProfile,
  updateUserPlan,
  getUserTransactions,
} from "../services/creditService";
import { PLAN_CONFIG, UserPlan } from "../config/plans";

const router = Router();

/**
 * GET /api/user/plans - Public plan catalog (or /api/plans)
 */
router.get("/plans", (_req, res) => {
  res.json({
    plans: PLAN_CONFIG,
  });
});

/**
 * GET /api/user/profile - Current user profile & AI credit state (Protected)
 */
router.get("/profile", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.userUid!;
  const profile = getOrCreateUserProfile(uid);
  const planInfo = PLAN_CONFIG[profile.plan] || PLAN_CONFIG.free;

  const availableCredits = Math.max(0, profile.monthlyCredits - profile.creditsUsed);

  res.json({
    profile: {
      ...profile,
      availableCredits,
      planDetails: planInfo,
    },
  });
});

/**
 * POST /api/user/change-plan - Upgrade or switch user subscription plan (Protected)
 */
router.post("/change-plan", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.userUid!;
  const { plan } = req.body as { plan: UserPlan };

  if (!plan || !PLAN_CONFIG[plan]) {
    return res.status(400).json({
      error: "INVALID_PLAN",
      message: "Plan no válido. Opciones permitidas: 'free', 'pro', 'pro_plus'",
    });
  }

  const updatedProfile = updateUserPlan(uid, plan);
  const planInfo = PLAN_CONFIG[plan];
  const availableCredits = Math.max(0, updatedProfile.monthlyCredits - updatedProfile.creditsUsed);

  res.json({
    success: true,
    message: `Has actualizado tu suscripción a ${planInfo.name}.`,
    profile: {
      ...updatedProfile,
      availableCredits,
      planDetails: planInfo,
    },
  });
});

/**
 * GET /api/user/transactions - Audit history of AI credits usage (Protected)
 */
router.get("/transactions", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const uid = req.userUid!;
  const transactions = getUserTransactions(uid);
  res.json({ transactions });
});

export default router;

