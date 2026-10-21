import { Router } from "express";
import { accessible, archive, create, deleteOwnPhoto, list, removeArchived, restore, saveOwnPhoto, update } from "../controllers/marketerController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const marketerRoutes = Router();
marketerRoutes.use(requireAuth);
marketerRoutes.get("/accessible", accessible);
marketerRoutes.put("/me/photo", saveOwnPhoto);
marketerRoutes.delete("/me/photo", deleteOwnPhoto);
marketerRoutes.use(requireAdmin);
marketerRoutes.get("/", list);
marketerRoutes.get("/deleted", list);
marketerRoutes.post("/", create);
marketerRoutes.patch("/:id", update);
marketerRoutes.delete("/:id", archive);
marketerRoutes.post("/deleted/:id/restore", restore);
marketerRoutes.delete("/deleted/:id", removeArchived);
