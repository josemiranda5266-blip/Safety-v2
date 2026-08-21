import { Request, Response, NextFunction } from "express";
import { AuthenticatedIdentity } from "../auth/types";
import { getAuthVerifier } from "../auth/verifier";

export interface AuthenticatedRequest extends Request {
  identity?: AuthenticatedIdentity;
  userUid?: string;
  userEmail?: string;
  userDisplayName?: string;
}

/**
 * Extracts and cryptographically verifies Firebase ID Token from Authorization header.
 * Attaches verified AuthenticatedIdentity to request without resolving tenants or roles.
 * Fail-closed: No IP fallback, no anonymous default creation.
 */
export async function extractAuthUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const isProduction = process.env.NODE_ENV === "production";
  const authDevMode = process.env.AUTH_DEV_MODE === "true";

  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (!isProduction && authDevMode) {
    // Explicit opt-in for isolated local development/testing ONLY
    const customUid = req.headers["x-user-id"] as string;
    if (customUid && customUid.trim()) {
      token = `test_token_${customUid.trim()}`;
    }
  }

  if (!token) {
    req.identity = undefined;
    req.userUid = undefined;
    req.userEmail = undefined;
    req.userDisplayName = undefined;
    next();
    return;
  }

  try {
    const verifier = getAuthVerifier();
    const identity = await verifier.verifyIdToken(token);

    req.identity = identity;
    req.userUid = identity.uid;
    req.userEmail = identity.email;
    req.userDisplayName = identity.displayName;
  } catch (_err) {
    // Invalid/expired token: clear identity
    req.identity = undefined;
    req.userUid = undefined;
    req.userEmail = undefined;
    req.userDisplayName = undefined;
  }

  next();
}

/**
 * Strict authentication guard middleware.
 * Returns 401 UNAUTHENTICATED if request lacks a valid, verified identity.
 */
export function requireAuthentication(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.identity || !req.userUid) {
    res.status(401).json({
      error: "No autenticado",
      code: "UNAUTHENTICATED",
      message: "Se requiere un token de autenticación válido para acceder a este recurso.",
    });
    return;
  }
  next();
}
