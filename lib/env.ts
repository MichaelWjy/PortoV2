import "server-only";
import { z } from "zod";

const optional = z.string().trim().min(1).optional();

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    /** Path to the database provider root CA (e.g. Supabase) for verified TLS. */
    DATABASE_SSL_CA_FILE: optional,
    /** The same certificate as PEM text (for hosts like Vercel that cannot ship a file). */
    DATABASE_SSL_CA: optional,
    APP_URL: z.url("APP_URL must be an absolute URL"),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    AUTH_GOOGLE_ID: optional,
    AUTH_GOOGLE_SECRET: optional,
    AUTH_DEV_LOGIN: z.enum(["true", "false"]).optional(),
    IP_HASH_SALT: z.string().min(8, "IP_HASH_SALT must be at least 8 characters"),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    LOCAL_STORAGE_DIR: z.string().default("./storage/uploads"),
    S3_BUCKET: optional,
    S3_REGION: optional,
    S3_ENDPOINT: z.url().optional(),
    S3_ACCESS_KEY_ID: optional,
    S3_SECRET_ACCESS_KEY: optional,
    S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.AUTH_DEV_LOGIN === "true") {
      ctx.addIssue({ code: "custom", path: ["AUTH_DEV_LOGIN"], message: "AUTH_DEV_LOGIN must not be enabled in production" });
    }
    if (env.NODE_ENV === "production" && (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET)) {
      ctx.addIssue({ code: "custom", path: ["AUTH_GOOGLE_ID"], message: "Google sign-in (AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET) is required in production" });
    }
    if (env.STORAGE_DRIVER === "s3") {
      for (const key of ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
        if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when STORAGE_DRIVER=s3` });
      }
    }
  });

type Env = z.output<typeof schema>;

/** Empty strings (common in .env templates) mean "not set". */
const source = () => Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));

function load(): Env {
  // `next build` evaluates server modules without runtime secrets (e.g. inside Docker). Nothing reads
  // these values during the build; the real check runs at server start (instrumentation.ts).
  if (process.env.NEXT_PHASE === "phase-production-build") return schema.safeParse(source()).data ?? (source() as unknown as Env);
  const parsed = schema.safeParse(source());
  if (!parsed.success) {
    // Only names and messages are printed, never values.
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return parsed.data;
}

export const env = load();
export const googleConfigured = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
export const devLoginEnabled = env.NODE_ENV !== "production" && env.AUTH_DEV_LOGIN === "true";
