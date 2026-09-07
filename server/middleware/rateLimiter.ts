import rateLimit from "express-rate-limit";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest, isPersonalMode } from "./auth";

// General API protection
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Prevents ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and ERR_ERL_FORWARDED_HEADER validation errors behind proxy
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message: "Demasiadas peticiones al servidor. Por favor reintente en unos minutos.",
  },
});

// Stricter rate limiter specifically for AI Generative Endpoints
export const aiEndpointsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Prevents proxy validation errors behind Cloud Run and nginx
  message: {
    error: "AI_RATE_LIMIT_EXCEEDED",
    message: "Límite temporal de consultas a la IA alcanzado. Por favor aguarde un momento antes de continuar.",
  },
});

// In-memory active in-flight tracking to prevent simultaneous spamming
const activeUserRequests = new Map<string, number>();

export function concurrencyLimiter(maxConcurrent: number = 8) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // In personal mode, concurrency limits are unnecessary for single-user workflow
    if (isPersonalMode()) {
      next();
      return;
    }

    const uid = req.userUid || req.ip || "anon";
    const current = activeUserRequests.get(uid) || 0;

    if (current >= maxConcurrent) {
      return res.status(429).json({
        error: "CONCURRENCY_LIMIT_EXCEEDED",
        message: "Ya tienes otra operación de IA en proceso. Espera a que finalice antes de enviar una nueva.",
      });
    }

    activeUserRequests.set(uid, current + 1);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      const active = activeUserRequests.get(uid) || 1;
      if (active <= 1) {
        activeUserRequests.delete(uid);
      } else {
        activeUserRequests.set(uid, active - 1);
      }
    };

    // Auto-release after 90 seconds to avoid orphaned lockouts if client disconnects abruptly
    const autoReleaseTimer = setTimeout(cleanup, 90000);

    const finishHandler = () => {
      clearTimeout(autoReleaseTimer);
      cleanup();
    };

    res.on("finish", finishHandler);
    res.on("close", finishHandler);

    next();
  };
}
