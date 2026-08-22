import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import { createCorrectiveAction, listCorrectiveActions, updateCorrectiveAction } from "../services/capaService";

const router = Router();
router.use(requireAuth);
router.use(requireTenantContext);

router.post("/", requirePermission("document:create"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { companyId } = req.body;
    
    if (context.assignedCompanyIds && context.assignedCompanyIds.length > 0) {
      if (!companyId) {
        return res.status(403).json({ error: "Debe especificar una empresa", code: "FORBIDDEN" });
      }
      if (!context.assignedCompanyIds.includes(companyId)) {
        return res.status(403).json({ error: "No tiene permisos para esta empresa", code: "FORBIDDEN" });
      }
    }

    const newCapa = await createCorrectiveAction(context.orgId, req.userUid!, req.body);
    res.status(201).json({ capa: newCapa });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || "SERVER_ERROR" });
  }
});

router.get("/", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const companyId = req.query.companyId as string | undefined;
    const capas = await listCorrectiveActions(context.orgId, companyId, context.assignedCompanyIds);
    res.json({ capas });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || "SERVER_ERROR" });
  }
});

router.put("/:id", requirePermission("document:create"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { id } = req.params;
    const updated = await updateCorrectiveAction(context.orgId, id, req.userUid!, req.body, context.assignedCompanyIds);
    res.json({ capa: updated });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code || "SERVER_ERROR" });
  }
});

export default router;
