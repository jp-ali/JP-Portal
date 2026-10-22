import { Router } from "express";
import { marketerVisitSummary, updateVisit } from "../controllers/visitController.js";
import { requireAuth } from "../middleware/auth.js";

export const visitRoutes = Router();
visitRoutes.get("/summary", requireAuth, marketerVisitSummary);
visitRoutes.patch("/:id", requireAuth, updateVisit);
