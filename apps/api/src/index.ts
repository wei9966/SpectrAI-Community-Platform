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
import publishRoutes from "./routes/publish.js";
import { reviewRoutes } from "./routes/review.js";
import authBridgeRoutes from "./routes/auth-bridge.js";
import spectrAIRoutes from "./routes/spectrAI.js";
import creditRoutes from "./routes/credits.js";
import tokenQuotaRoutes from "./routes/token-quota.js";
import planRoutes from "./routes/plan.js";
import inviteRoutes from "./routes/invite.js";
import cdkRoutes from "./routes/cdk.js";
import bountyRoutes from "./routes/bounties.js";
import { adminUserRoutes } from "./routes/admin/users.js";
import { adminStatsRoutes } from "./routes/admin/stats.js";
import { adminResourceRoutes } from "./routes/admin/resources.js";
import { adminForumRoutes } from "./routes/admin/forum.js";
import { adminSettingsRoutes } from "./routes/admin/settings.js";

const app = new Hono();

app.use("*", cors({
  origin: (origin) => {
    const allowed = [
      "http://localhost:3000",
      "http://localhost:5173",
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.DESKTOP_APP_ORIGIN,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return origin;
    return null;
  },
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization", "X-App-Platform"],
}));
app.use("*", requestLogger);

app.get("/api/health", (c) => {
  return c.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

app.route("/api/auth", authRoutes);
app.route("/api/auth", authBridgeRoutes);
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
app.route("/api/admin/review", reviewRoutes);
app.route("/api/admin/users", adminUserRoutes);
app.route("/api/admin/stats", adminStatsRoutes);
app.route("/api/admin/resources", adminResourceRoutes);
app.route("/api/admin/forum", adminForumRoutes);
app.route("/api/admin/settings", adminSettingsRoutes);
app.route("/api/resources", publishRoutes);
app.route("/api/spectrAI", spectrAIRoutes);
app.route("/api/credits", creditRoutes);
app.route("/api/spectrAI/quota", tokenQuotaRoutes);
app.route("/api/spectrAI/plan", planRoutes);
app.route("/api/invite", inviteRoutes);
app.route("/api/cdk", cdkRoutes);
app.route("/api/bounties", bountyRoutes);

app.notFound((c) => {
  return c.json({ success: false, error: "Not found" }, 404);
});

app.onError(errorHandler);

const env = getEnv();
const port = env.PORT;

serve({ fetch: app.fetch, port }, () => {
  console.log(`SpectrAI Community API running on http://localhost:${port}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

export default app;
