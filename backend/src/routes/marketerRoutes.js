import { Router } from "express";
import { accessible, archive, create, list, removeArchived, restore, update } from "../controllers/marketerController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const marketerRoutes = Router();
marketerRoutes.use(requireAuth);
marketerRoutes.get("/accessible", accessible);
marketerRoutes.use(requireAdmin);
marketerRoutes.get("/", list);
marketerRoutes.get("/deleted", list);
marketerRoutes.post("/", create);
marketerRoutes.patch("/:id", update);
marketerRoutes.delete("/:id", archive);
marketerRoutes.post("/deleted/:id/restore", restore);
marketerRoutes.delete("/deleted/:id", removeArchived);
