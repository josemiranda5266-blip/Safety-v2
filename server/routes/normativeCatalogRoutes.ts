import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import * as normativeCatalogService from "../services/normativeCatalogService";

const router = Router();
router.use(requireAuth);
router.use(requireTenantContext);

router.get("/protocols", requirePermission("hygiene:read"), async (req: TenantRequest, res: Response) => {
  const protocolType = typeof req.query.protocolType === "string" ? req.query.protocolType : undefined;
  const rawStatus = typeof req.query.status === "string" ? req.query.status : undefined;
  const validStatuses = ["draft", "active", "superseded", "repealed", "archived"] as const;
  const status = rawStatus && validStatuses.includes(rawStatus as typeof validStatuses[number]) ? rawStatus as typeof validStatuses[number] : undefined;
  const items = await normativeCatalogService.listNormativeProtocolVersions(protocolType, status);
  res.json({ normativeProtocolVersions: items });
});

router.get("/protocols/:id", requirePermission("hygiene:read"), async (req: TenantRequest, res: Response) => {
  const item = await normativeCatalogService.getNormativeProtocolVersion(req.params.id);
  if (!item) return res.status(404).json({ error: "Versión normativa no encontrada", code: "NORMATIVE_VERSION_NOT_FOUND" });
  res.json({ normativeProtocolVersion: item });
});

export default router;
