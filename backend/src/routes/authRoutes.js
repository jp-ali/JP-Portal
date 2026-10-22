import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { deleteAdminPhoto, login, logout, me, readAdminPhoto, saveAdminPhoto } from "../controllers/authController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const authRoutes = Router();
authRoutes.post("/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (request) => {
    const identifier = request.body?.identifier;
    return typeof identifier === "string" && identifier.trim()
      ? `login:${identifier.trim().toLowerCase()}:${ipKeyGenerator(request.ip)}`
      : `ip:${ipKeyGenerator(request.ip)}`;
  },
  message: { error: "Too many login attempts for this account. Please try again in 15 minutes." }
}), login);
authRoutes.get("/me", requireAuth, me);
authRoutes.get("/me/photo", requireAuth, requireAdmin, readAdminPhoto);
authRoutes.put("/me/photo", requireAuth, requireAdmin, saveAdminPhoto);
authRoutes.delete("/me/photo", requireAuth, requireAdmin, deleteAdminPhoto);
authRoutes.post("/logout", logout);
