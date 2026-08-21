import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import helmet from "helmet";
import { generalApiLimiter } from "./server/middleware/rateLimiter";
import { extractAuthUser } from "./server/middleware/auth";
import aiRoutes from "./server/routes/aiRoutes";
import userRoutes from "./server/routes/userRoutes";

dotenv.config();

const app = express();
const PORT = 3000;

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite Dev Compatibility
    crossOriginEmbedderPolicy: false,
  })
);

// General Rate Limiter for all API routes
app.use("/api/", generalApiLimiter);

// Body parser with secure limits
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// User identity extractor middleware
app.use(extractAuthUser);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Safety IA",
    engine: "Gemini Pro / Flash",
    freemium: "Active",
    time: new Date().toISOString(),
  });
});

// Modular Routes
app.use("/api", aiRoutes);
app.use("/api/user", userRoutes);

// Vite Middleware for dev or static server in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Safety IA] Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();
