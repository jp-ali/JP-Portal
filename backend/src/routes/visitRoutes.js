import { Router } from "express";
import { marketerVisitSummary, updateVisit } from "../controllers/visitController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/auth.js";
import { importVisitsForMarketer } from "../services/visitImportService.js";

export const visitRoutes = Router();
visitRoutes.get("/summary", requireAuth, marketerVisitSummary);
visitRoutes.patch("/:id", requireAuth, updateVisit);
visitRoutes.post("/import/:marketerId", requireAuth, requireAdmin, async (request, response, next) => {
  try {
    const { created, skipped } = await importVisitsForMarketer(request.params.marketerId, request.body?.rows);
    response.json({ created, skipped });
  } catch (error) {
    next(error);
  }
});
