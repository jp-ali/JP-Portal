import express from "express";
import "dotenv/config";
import { authRoutes } from "./routes/authRoutes.js";
import { marketerRoutes } from "./routes/marketerRoutes.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", "loopback");
app.use(express.json({ limit: "1mb" }));
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

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Invalid JSON request body" });
  }
  if (error.status === 400) return response.status(400).json({ error: error.message });
  if (error.status === 503) return response.status(503).json({ error: error.message });
  console.error("Unhandled API error", error);
  return response.status(500).json({ error: "Internal server error" });
});
