import { Response, NextFunction } from "express";
import { AuthorizationContext, Permission } from "./types";
import { resolveAuthorizationContext } from "./context";
import { hasPermission } from "./guards";
import { AuthenticatedRequest, isPersonalMode } from "../middleware/auth";

export interface TenantRequest extends AuthenticatedRequest {
  authContext?: AuthorizationContext;
}

/** Ensures request has an authenticated identity. Personal mode uses its local identity. */
export function requireAuth(req: TenantRequest, res: Response, next: NextFunction): void {
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

/**
 * Resolves the authoritative organization context.
 * In personal mode, a local organization context is synthesized and no membership lookup is required.
 */
export async function requireTenantContext(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
  if (isPersonalMode()) {
    req.authContext = {
      userId: req.userUid || "personal_local_user",
      userEmail: req.userEmail || "personal@safetyia.local",
      orgId: "org_personal_default",
      membershipId: "membership_personal_local",
      membershipRole: "owner",
      platformRole: "platform_admin",
      assignedCompanyIds: undefined,
    };
    next();
    return;
  }

  if (!req.identity || !req.userUid) {
    res.status(401).json({
      error: "No autenticado",
      code: "UNAUTHENTICATED",
      message: "Se requiere un token de autenticación válido.",
    });
    return;
  }

  const rawOrgHeader = req.headers ? req.headers["x-org-id"] : undefined;
  const requestedOrgId =
    (typeof rawOrgHeader === "string" ? rawOrgHeader : undefined) ||
    (req.query && typeof req.query.orgId === "string" ? (req.query.orgId as string) : undefined);

  const userEmail = req.identity.email || req.userEmail || "usuario@safetyia.com";
  const platformRole = req.identity.platformRole;

  const context = await resolveAuthorizationContext(req.userUid, userEmail, requestedOrgId, platformRole);

  if (!context) {
    res.status(403).json({
      error: "Acceso denegado a la Organización",
      code: "ORG_MEMBERSHIP_REQUIRED",
      message: "El usuario no posee una membresía activa en la organización solicitada.",
    });
    return;
  }

  req.authContext = context;
  next();
}

export function requirePermission(permission: Permission) {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    if (!req.authContext) {
      res.status(401).json({
        error: "Contexto de autorización no establecido",
        code: "NO_AUTH_CONTEXT",
      });
      return;
    }

    if (isPersonalMode()) {
      next();
      return;
    }

    if (!hasPermission(req.authContext, permission)) {
      res.status(403).json({
        error: "Permiso insuficiente",
        code: "FORBIDDEN_INSUFFICIENT_PERMISSIONS",
        requiredPermission: permission,
        currentRole: req.authContext.membershipRole,
      });
      return;
    }

    next();
  };
}
