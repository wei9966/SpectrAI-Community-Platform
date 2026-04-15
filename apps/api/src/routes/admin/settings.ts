import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { systemSettings } from "../../db/schema.js";
import { authMiddleware, adminOnly } from "../../middleware/auth.js";

const adminSettingsRoutes = new Hono();

adminSettingsRoutes.use("*", authMiddleware, adminOnly);

const DEFAULT_SETTINGS: Array<{
  key: string;
  value: string;
  description: string;
}> = [
  { key: "site_name", value: "SpectrAI Community", description: "站点名称" },
  { key: "site_description", value: "SpectrAI 社区 - 分享工作流、技能与 MCP 资源", description: "站点描述" },
  { key: "maintenance_mode", value: "false", description: "维护模式（true/false）" },
  { key: "registration_enabled", value: "true", description: "是否开放注册（true/false）" },
  { key: "default_user_role", value: "user", description: "新注册用户默认角色" },
  { key: "resource_auto_approve", value: "false", description: "资源是否自动审核通过（true/false）" },
  { key: "max_upload_size_mb", value: "10", description: "最大上传文件大小（MB）" },
  { key: "forum_enabled", value: "true", description: "是否开启论坛功能（true/false）" },
  { key: "posts_per_page", value: "20", description: "论坛每页帖子数" },
  { key: "require_email_verification", value: "false", description: "注册是否需要邮箱验证（true/false）" },
  { key: "promoter.enabled", value: "true", description: "是否启用推广者计划" },
  { key: "promoter.reward_delay_hours", value: "168", description: "推广奖励延迟释放小时数" },
  { key: "promoter.level_threshold_silver", value: "5", description: "推广者白银等级最低邀请人数" },
  { key: "promoter.level_threshold_gold", value: "20", description: "推广者黄金等级最低邀请人数" },
  { key: "promoter.level_threshold_platinum", value: "50", description: "推广者铂金等级最低邀请人数" },
  { key: "promoter.level_threshold_diamond", value: "100", description: "推广者钻石等级最低邀请人数" },
  { key: "promoter.invite_credits_bronze", value: "50", description: "青铜推广者每次邀请奖励积分" },
  { key: "promoter.invite_credits_silver", value: "80", description: "白银推广者每次邀请奖励积分" },
  { key: "promoter.invite_credits_gold", value: "120", description: "黄金推广者每次邀请奖励积分" },
  { key: "promoter.invite_credits_platinum", value: "200", description: "铂金推广者每次邀请奖励积分" },
  { key: "promoter.invite_credits_diamond", value: "300", description: "钻石推广者每次邀请奖励积分" },
  { key: "promoter.invite_membership_days_bronze", value: "0", description: "青铜推广者每次邀请奖励会员天数" },
  { key: "promoter.invite_membership_days_silver", value: "3", description: "白银推广者每次邀请奖励会员天数" },
  { key: "promoter.invite_membership_days_gold", value: "7", description: "黄金推广者每次邀请奖励会员天数" },
  { key: "promoter.invite_membership_days_platinum", value: "15", description: "铂金推广者每次邀请奖励会员天数" },
  { key: "promoter.invite_membership_days_diamond", value: "30", description: "钻石推广者每次邀请奖励会员天数" },
  { key: "promoter.invitee_welcome_credits", value: "100", description: "被邀请人欢迎积分奖励" },
];

adminSettingsRoutes.get("/", async (c) => {
  let settings = await db.select().from(systemSettings).orderBy(systemSettings.key);

  if (settings.length === 0) {
    await db.insert(systemSettings).values(
      DEFAULT_SETTINGS.map((item) => ({
        key: item.key,
        value: item.value,
        description: item.description,
      }))
    );
    settings = await db.select().from(systemSettings).orderBy(systemSettings.key);
  }

  return c.json({ success: true, data: settings });
});

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

    const allSettings = await db.select().from(systemSettings).orderBy(systemSettings.key);

    return c.json({ success: true, data: allSettings });
  }
);

export { adminSettingsRoutes };
