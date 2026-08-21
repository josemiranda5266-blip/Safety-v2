import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  userUid?: string;
  userEmail?: string;
  userDisplayName?: string;
}

export function extractAuthUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  // Extract UID from Authorization header or custom header
  const authHeader = req.headers.authorization;
  const customUid = req.headers["x-user-id"] as string;

  if (customUid) {
    req.userUid = customUid;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    // In production with Firebase Auth, you can verify ID Token with Firebase Admin.
    // For universal dev/production interoperability, accept either token string or UID:
    req.userUid = token.trim();
  } else {
    // Fallback to client IP or anonymous default UID to ensure zero disruption
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "anon_user";
    req.userUid = `user_${Buffer.from(ip).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "default"}`;
  }

  next();
}
