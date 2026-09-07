import { Request, Response, NextFunction } from "express";
import { AuthenticatedIdentity } from "../auth/types";
import { getAuthVerifier } from "../auth/verifier";

export interface AuthenticatedRequest extends Request {
  identity?: AuthenticatedIdentity;
  userUid?: string;
  userEmail?: string;
  userDisplayName?: string;
}

/** Personal mode is the default for this single-user application. */
export function isPersonalMode(): boolean {
  return process.env.SAFETY_PERSONAL_MODE !== "false";
}

/**
 * Extracts and cryptographically verifies Firebase ID Token from Authorization header.
 * In personal mode, a local synthetic identity is used so no registration/login is required.
 */
export async function extractAuthUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (isPersonalMode()) {
    const uid = "personal_local_user";
    req.identity = {
      uid,
      email: "personal@safetyia.local",
      displayName: "Usuario Personal Safety IA",
      platformRole: "platform_admin",
    } as AuthenticatedIdentity;
    req.userUid = uid;
    req.userEmail = req.identity.email;
    req.userDisplayName = req.identity.displayName;
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const isProduction = process.env.NODE_ENV === "production";
  const authDevMode = process.env.AUTH_DEV_MODE === "true";

  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (!isProduction && authDevMode) {
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
    req.identity = undefined;
    req.userUid = undefined;
    req.userEmail = undefined;
    req.userDisplayName = undefined;
  }

  next();
}

export function requireAuthentication(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (isPersonalMode()) {
    next();
    return;
  }

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
