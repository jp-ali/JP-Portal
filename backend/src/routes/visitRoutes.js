import { Router } from "express";
import { updateVisit } from "../controllers/visitController.js";
import { requireAuth } from "../middleware/auth.js";

export const visitRoutes = Router();
visitRoutes.patch("/:id", requireAuth, updateVisit);
