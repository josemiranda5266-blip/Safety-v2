import { Request, Response, NextFunction } from "express";
import { AuthorizationContext, Permission } from "./types";
import { resolveAuthorizationContext } from "./context";
import { hasPermission } from "./guards";
import { AuthenticatedRequest } from "../middleware/auth";

export interface TenantRequest extends AuthenticatedRequest {
  authContext?: AuthorizationContext;
}

/**
 * Ensures request has an authenticated user UID.
 */
export function requireAuth(req: TenantRequest, res: Response, next: NextFunction): void {
  if (!req.userUid) {
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
 * Builds and attaches authoritative AuthorizationContext to the request.
 * If user lacks active membership in the target organization, returns 403.
 */
export function requireTenantContext(req: TenantRequest, res: Response, next: NextFunction): void {
  if (!req.userUid) {
    res.status(401).json({
      error: "No autenticado",
      code: "UNAUTHENTICATED",
      message: "Se requiere un token de autenticación válido.",
    });
    return;
  }

  const requestedOrgId = (req.headers["x-org-id"] as string) || (req.query.orgId as string) || undefined;
  const userEmail = req.userEmail || "usuario@safetyia.com";

  const context = resolveAuthorizationContext(req.userUid, userEmail, requestedOrgId);

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

/**
 * Middleware factory to enforce specific RBAC Permission on a route.
 */
export function requirePermission(permission: Permission) {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    if (!req.authContext) {
      res.status(401).json({
        error: "Contexto de autorización no establecido",
        code: "NO_AUTH_CONTEXT",
      });
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
