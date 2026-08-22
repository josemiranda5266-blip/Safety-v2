import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import helmet from "helmet";
import { generalApiLimiter } from "./server/middleware/rateLimiter";
import { extractAuthUser } from "./server/middleware/auth";
import aiRoutes from "./server/routes/aiRoutes";
import userRoutes from "./server/routes/userRoutes";
import companyRoutes from "./server/routes/companyRoutes";
import establishmentRoutes from "./server/routes/establishmentRoutes";
import sectorRoutes from "./server/routes/sectorRoutes";
import positionRoutes from "./server/routes/positionRoutes";
import employeeRoutes from "./server/routes/employeeRoutes";
import capaRoutes from "./server/routes/capaRoutes";
import documentRoutes from "./server/routes/documentRoutes";
import tenantContextRoutes from "./server/routes/tenantContextRoutes";
import {
  initializeAuthorizationRepository,
  getAuthorizationRepository,
} from "./server/authorization/store";
import { InMemoryAuthorizationRepository } from "./server/authorization/repository";
import { logStructured } from "./server/utils/logger";

dotenv.config();

const app = express();
const PORT = 3000;

// Security Middlewares (H-03 Hardening)
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://*.google.com",
            "https://*.googleapis.com",
            "https://*.googleusercontent.com",
            "https://*.gstatic.com",
          ],
          connectSrc: [
            "'self'",
            "https://*.googleapis.com",
            "https://*.firebaseio.com",
            "https://identitytoolkit.googleapis.com",
            "https://securetoken.googleapis.com",
          ],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      xContentTypeOptions: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      crossOriginEmbedderPolicy: false,
    })
  );
} else {
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite Dev Mode Compatibility
      crossOriginEmbedderPolicy: false,
    })
  );
}

// Structured request logging middleware (never logs auth tokens, credentials or PII)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logStructured("info", "http_request", {
      method: req.method,
      route: req.path,
      statusCode: res.statusCode,
      durationMs,
    });
  });
  next();
});

// General Rate Limiter for all API routes
app.use("/api/", generalApiLimiter);

// Body parser with secure limits
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// User identity extractor middleware
app.use(extractAuthUser);

// Liveness check (independent of Firestore)
app.get("/api/health/liveness", (_req, res) => {
  res.json({ status: "ok" });
});

// Readiness check (verifies active authorization repository)
const checkReadiness = async (_req: express.Request, res: express.Response) => {
  try {
    const repo = getAuthorizationRepository();
    if (!repo) {
      return res.status(503).json({
        status: "error",
        error: "Authorization repository unavailable",
      });
    }
    const isHealthy = repo.healthCheck ? await repo.healthCheck() : true;
    if (!isHealthy) {
      return res.status(503).json({
        status: "error",
        error: "Authorization repository unavailable",
      });
    }
    return res.json({
      status: "ok",
      app: "Safety IA",
      engine: "Gemini Pro / Flash",
      freemium: "Active",
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(503).json({
      status: "error",
      error: "Authorization repository unavailable",
    });
  }
};

app.get("/api/health/readiness", checkReadiness);
app.get("/api/health", checkReadiness);

// Modular Routes
app.use("/api", aiRoutes);
app.use("/api/user", userRoutes);

// Safety IA V2 Multi-tenant Routes
app.use("/api/v2/companies", companyRoutes);
app.use("/api/v2/establishments", establishmentRoutes);
app.use("/api/v2/sectors", sectorRoutes);
app.use("/api/v2/positions", positionRoutes);
app.use("/api/v2/employees", employeeRoutes);
app.use("/api/v2/capa", capaRoutes);
app.use("/api/v2/documents", documentRoutes);
app.use("/api/v2/tenant", tenantContextRoutes);

// Vite Middleware for dev or static server in prod
async function startServer() {
  try {
    // 1. Initialize Authorization Repository (Validates config, Firestore Admin, Health Check & Fail-Closed rules)
    await initializeAuthorizationRepository();

    // 2. Explicit production check: ensure active repository is NOT InMemory
    if (
      process.env.NODE_ENV === "production" &&
      getAuthorizationRepository() instanceof InMemoryAuthorizationRepository
    ) {
      throw new Error(
        "CRITICAL SECURITY ERROR: Production authorization repository cannot be InMemory."
      );
    }
  } catch (err) {
    console.error("[CRITICAL STARTUP ERROR] Failed to initialize authorization repository:", err);
    process.exit(1);
  }

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
