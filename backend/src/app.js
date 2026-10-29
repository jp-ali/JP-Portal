import express from "express";
import "dotenv/config";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { authRoutes } from "./routes/authRoutes.js";
import { marketerRoutes } from "./routes/marketerRoutes.js";
import { visitRoutes } from "./routes/visitRoutes.js";
import { customReportRoutes } from "./routes/customReportRoutes.js";
import { cardTemplateRoutes } from "./routes/cardTemplateRoutes.js";
import { cardRoutes } from "./routes/cardRoutes.js";
import { newsRoutes } from "./routes/newsRoutes.js";
import { dataRoutes } from "./routes/dataRoutes.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", "loopback");
app.use(express.json({ limit: "15mb" }));
app.use((request, response, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.get("origin");
    const host = request.get("host");
    if (origin) {
      try {
        const parsedOrigin = new URL(origin);
        const sameHost = parsedOrigin.host === host;
        const localFrontend = process.env.NODE_ENV !== "production"
          && origin === process.env.DEV_FRONTEND_ORIGIN;
        if (!sameHost && !localFrontend) {
          return response.status(403).json({ error: "Cross-origin request rejected" });
        }
      } catch (_) {
        return response.status(403).json({ error: "Cross-origin request rejected" });
      }
    }
  }
  next();
});
app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/marketers", marketerRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/custom-reports", customReportRoutes);
app.use("/api/card-template", cardTemplateRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/data", dataRoutes);

const frontendDirectory = fileURLToPath(new URL("../../dist/", import.meta.url));
const frontendIndex = fileURLToPath(new URL("../../dist/index.html", import.meta.url));
if (existsSync(frontendIndex)) {
  app.use(express.static(frontendDirectory));
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path === "/api" || request.path.startsWith("/api/")) return next();
    return response.sendFile(frontendIndex);
  });
}

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Invalid JSON request body" });
  }
  if (error.status === 400) return response.status(400).json({ error: error.message });
  if (error.status === 413) return response.status(413).json({ error: "File or image is too large for one request" });
  if (error.status === 404) return response.status(404).json({ error: error.message });
  if (error.status === 503) return response.status(503).json({ error: error.message });
  console.error("Unhandled API error", error);
  return response.status(500).json({ error: "Internal server error" });
});
