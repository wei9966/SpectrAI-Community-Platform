import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { systemSettings } from "../../db/schema.js";
import { authMiddleware, adminOnly } from "../../middleware/auth.js";

const adminSettingsRoutes = new Hono();

// All routes require auth + admin role
adminSettingsRoutes.use("*", authMiddleware, adminOnly);

// Default settings — inserted on first GET if table is empty
const DEFAULT_SETTINGS: Array<{
  key: string;
  value: string;
  description: string;
}> = [
  { key: "site_name", value: "SpectrAI Community", description: "站点名称" },
  { key: "site_description", value: "SpectrAI 社区 — 分享工作流、技能与 MCP 资源", description: "站点描述" },
  { key: "maintenance_mode", value: "false", description: "维护模式（true/false）" },
  { key: "registration_enabled", value: "true", description: "是否开放注册（true/false）" },
  { key: "default_user_role", value: "user", description: "新注册用户默认角色" },
  { key: "resource_auto_approve", value: "false", description: "资源是否自动审核通过（true/false）" },
  { key: "max_upload_size_mb", value: "10", description: "最大上传文件大小（MB）" },
  { key: "forum_enabled", value: "true", description: "是否开启论坛功能（true/false）" },
  { key: "posts_per_page", value: "20", description: "论坛每页帖子数" },
  { key: "require_email_verification", value: "false", description: "注册是否需要邮箱验证（true/false）" },
];

// ── GET /api/admin/settings ──────────────────────────────────
adminSettingsRoutes.get("/", async (c) => {
  let settings = await db
    .select()
    .from(systemSettings)
    .orderBy(systemSettings.key);

  // Seed defaults if table is empty
  if (settings.length === 0) {
    await db.insert(systemSettings).values(
      DEFAULT_SETTINGS.map((s) => ({
        key: s.key,
        value: s.value,
        description: s.description,
      }))
    );
    settings = await db
      .select()
      .from(systemSettings)
      .orderBy(systemSettings.key);
  }

  return c.json({ success: true, data: settings });
});

// ── PUT /api/admin/settings ──────────────────────────────────
// Batch update: receives { settings: { key: value, ... } }
const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

adminSettingsRoutes.put(
  "/",
  zValidator("json", updateSettingsSchema),
  async (c) => {
    const { settings: updates } = c.req.valid("json");
    const user = c.get("user");

    const entries = Object.entries(updates);
    if (entries.length === 0) {
      return c.json({ success: false, error: "No settings to update" }, 400);
    }

    // Upsert each setting
    for (const [key, value] of entries) {
      const [existing] = await db
        .select({ id: systemSettings.id })
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);

      if (existing) {
        await db
          .update(systemSettings)
          .set({
            value,
            updatedBy: user.userId,
            updatedAt: new Date(),
          })
          .where(eq(systemSettings.key, key));
      } else {
        await db.insert(systemSettings).values({
          key,
          value,
          updatedBy: user.userId,
        });
      }
    }

    // Return updated settings
    const allSettings = await db
      .select()
      .from(systemSettings)
      .orderBy(systemSettings.key);

    return c.json({ success: true, data: allSettings });
  }
);

export { adminSettingsRoutes };
