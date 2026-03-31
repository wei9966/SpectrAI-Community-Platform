import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getEnv } from "./config/env.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import authRoutes from "./routes/auth.js";
import resourceRoutes from "./routes/resources.js";
import userRoutes from "./routes/users.js";
import ratingRoutes from "./routes/ratings.js";
import favoriteRoutes, { userFavoriteRoutes } from "./routes/favorites.js";
import projectRoutes from "./routes/projects.js";
import uploadRoutes from "./routes/uploads.js";
import rankingRoutes from "./routes/rankings.js";
import forumRoutes from "./routes/forum.js";
import notificationRoutes from "./routes/notifications.js";

const app = new Hono();

// ── Global middleware ────────────────────────────────────────
app.use("*", cors({
  origin: (origin) => {
    const allowed = [
      "http://localhost:3000",
      "http://localhost:5173",
      process.env.NEXT_PUBLIC_APP_URL,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return origin;
    return null;
  },
  credentials: true,
}));
app.use("*", requestLogger);

// ── Health check ─────────────────────────────────────────────
app.get("/api/health", (c) => {
  return c.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// ── Routes ───────────────────────────────────────────────────
app.route("/api/auth", authRoutes);
app.route("/api/resources", resourceRoutes);
app.route("/api/resources", ratingRoutes);
app.route("/api/resources", favoriteRoutes);
app.route("/api/users", userRoutes);
app.route("/api/users", userFavoriteRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/uploads", uploadRoutes);
app.route("/api/rankings", rankingRoutes);
app.route("/api/forum", forumRoutes);
app.route("/api/notifications", notificationRoutes);

// ── 404 fallback ─────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ success: false, error: "Not found" }, 404);
});

// ── Error handler ────────────────────────────────────────────
app.onError(errorHandler);

// ── Start server ─────────────────────────────────────────────
const env = getEnv();
const port = env.PORT;

serve({ fetch: app.fetch, port }, () => {
  console.log(`SpectrAI Community API running on http://localhost:${port}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

export default app;
