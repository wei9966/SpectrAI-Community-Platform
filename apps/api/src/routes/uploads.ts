import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth.js";
import {
  getPresignedUploadUrl,
  getPublicUrl,
} from "../lib/storage.js";

const uploadRoutes = new Hono();

// ── Validation schemas ──────────────────────────────────────
const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  folder: z.enum(["avatars", "covers", "uploads"]).default("uploads"),
});

const confirmSchema = z.object({
  key: z.string().min(1),
});

// ── POST /api/uploads/presign ───────────────────────────────
uploadRoutes.post(
  "/presign",
  authMiddleware,
  zValidator("json", presignSchema),
  async (c) => {
    const { userId } = c.get("user");
    const { filename, contentType, folder } = c.req.valid("json");

    // Build unique key: folder/userId/timestamp-filename
    const ext = filename.split(".").pop() || "";
    const safeFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const key = `${folder}/${userId}/${safeFilename}`;

    const uploadUrl = await getPresignedUploadUrl(key, contentType);

    return c.json({
      success: true,
      data: {
        uploadUrl,
        key,
        publicUrl: getPublicUrl(key),
      },
    });
  }
);

// ── POST /api/uploads/confirm ───────────────────────────────
uploadRoutes.post(
  "/confirm",
  authMiddleware,
  zValidator("json", confirmSchema),
  async (c) => {
    const { key } = c.req.valid("json");

    return c.json({
      success: true,
      data: {
        key,
        url: getPublicUrl(key),
      },
    });
  }
);

export default uploadRoutes;
