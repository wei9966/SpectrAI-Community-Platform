import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const spectrAIRoutes = new Hono();

// ── In-memory heartbeat store ─────────────────────────────────
// In production this should be Redis or similar.
// Map<claudeopsUuid, { lastSeen: Date; version: string; platform: string }>
const heartbeatStore = new Map<
  string,
  { lastSeen: Date; version: string; platform: string }
>();

// Clean up stale entries every 5 minutes
const HEARTBEAT_TTL_MS = 2 * 60 * 1000; // 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [uuid, entry] of heartbeatStore.entries()) {
    if (now - entry.lastSeen.getTime() > HEARTBEAT_TTL_MS) {
      heartbeatStore.delete(uuid);
    }
  }
}, 5 * 60 * 1000);

// ── Validation ────────────────────────────────────────────────
const heartbeatSchema = z.object({
  version: z.string().optional(),
  platform: z.string().optional(), // e.g. "win32", "darwin", "linux"
});

// ── POST /api/spectrAI/heartbeat ──────────────────────────────
// Called by the SpectrAI desktop app on startup / periodically.
// Keeps the "online" status alive for this user's linked ClaudeOps account.
spectrAIRoutes.post(
  "/heartbeat",
  authMiddleware,
  zValidator("json", heartbeatSchema),
  async (c) => {
    const { userId } = c.get("user");
    const body = c.req.valid("json");

    // Look up the user's ClaudeOps UUID (if linked)
    const [user] = await db
      .select({ claudeopsUuid: users.claudeopsUuid })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.claudeopsUuid) {
      return c.json(
        { success: false, error: "No ClaudeOps account linked" },
        400
      );
    }

    heartbeatStore.set(user.claudeopsUuid, {
      lastSeen: new Date(),
      version: body.version || "unknown",
      platform: body.platform || process.platform,
    });

    return c.json({ success: true, data: { received: true } });
  }
);

// ── GET /api/spectrAI/status/:claudeopsUuid ──────────────────
// Check if a linked SpectrAI desktop app is currently online.
// Used by the Community web UI or ClaudeOps to verify before sending a deep link.
spectrAIRoutes.get("/status/:claudeopsUuid", async (c) => {
  const { claudeopsUuid } = c.req.param();

  const entry = heartbeatStore.get(claudeopsUuid);
  const now = Date.now();

  if (!entry || now - entry.lastSeen.getTime() > HEARTBEAT_TTL_MS) {
    return c.json({
      success: true,
      data: {
        online: false,
        lastSeen: entry?.lastSeen?.toISOString() || null,
      },
    });
  }

  return c.json({
    success: true,
    data: {
      online: true,
      lastSeen: entry.lastSeen.toISOString(),
      version: entry.version,
      platform: entry.platform,
    },
  });
});

// ── GET /api/spectrAI/status ─────────────────────────────────
// Convenience: look up status for the currently authenticated user.
spectrAIRoutes.get("/status", authMiddleware, async (c) => {
  const { userId } = c.get("user");

  const [user] = await db
    .select({ claudeopsUuid: users.claudeopsUuid })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.claudeopsUuid) {
    return c.json({
      success: true,
      data: { online: false, reason: "no_linked_account" },
    });
  }

  const entry = heartbeatStore.get(user.claudeopsUuid);
  const now = Date.now();

  if (!entry || now - entry.lastSeen.getTime() > HEARTBEAT_TTL_MS) {
    return c.json({
      success: true,
      data: { online: false, lastSeen: null },
    });
  }

  return c.json({
    success: true,
    data: {
      online: true,
      lastSeen: entry.lastSeen.toISOString(),
      version: entry.version,
      platform: entry.platform,
    },
  });
});

export default spectrAIRoutes;
