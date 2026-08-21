import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

// General API protection
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message: "Demasiadas peticiones al servidor. Por favor reintente en unos minutos.",
  },
});

// Stricter rate limiter specifically for AI Generative Endpoints
export const aiEndpointsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "AI_RATE_LIMIT_EXCEEDED",
    message: "Límite temporal de consultas a la IA alcanzado. Por favor aguarde un momento antes de continuar.",
  },
});

// In-memory active in-flight tracking to prevent simultaneous spamming
const activeUserRequests = new Map<string, number>();

export function concurrencyLimiter(maxConcurrent: number = 3) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const uid = req.userUid || req.ip || "anon";
    const current = activeUserRequests.get(uid) || 0;

    if (current >= maxConcurrent) {
      return res.status(429).json({
        error: "CONCURRENCY_LIMIT_EXCEEDED",
        message: "Ya tienes otra operación de IA en proceso. Espera a que finalice antes de enviar una nueva.",
      });
    }

    activeUserRequests.set(uid, current + 1);

    const cleanup = () => {
      const active = activeUserRequests.get(uid) || 1;
      if (active <= 1) {
        activeUserRequests.delete(uid);
      } else {
        activeUserRequests.set(uid, active - 1);
      }
    };

    res.on("finish", cleanup);
    res.on("close", cleanup);

    next();
  };
}
