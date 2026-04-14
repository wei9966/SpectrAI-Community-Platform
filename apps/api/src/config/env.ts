import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  CDK_REDIS_PREFIX: z.string().default("cdk:"),
  CREDIT_MAX_DAILY_CAP: z.coerce.number().default(200),
  CREDITS_PER_DOLLAR: z.coerce.number().default(1000),
  MARKUP_MULTIPLIER: z.coerce.number().default(1),
  JWT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  GITHUB_CALLBACK_URL: z
    .string()
    .default("http://localhost:3000/api/auth/github/callback"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_BUCKET: z.string().default("spectrai-uploads"),
  MINIO_USE_SSL: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  CLAUDEOPS_JWT_SECRET: z.string().default(""),
  CLAUDEOPS_API_BASE_URL: z
    .string()
    .default("https://claudeops.wbdao.cn/api"),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function getEnv(): Env {
  if (!env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Invalid environment variables:", result.error.format());
      process.exit(1);
    }
    env = result.data;
  }
  return env;
}
