import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL_PRIMARY: z.string().default("gemini-2.5-flash"),
  GEMINI_MODEL_FALLBACK: z.string().optional(),
  AI_DAILY_BATCHES_PER_USER: z.coerce.number().int().positive().default(5),
  AI_OPERATIONS_PER_MINUTE_PER_USER: z.coerce.number().int().positive().default(2),
  AI_GLOBAL_DAILY_CALL_LIMIT: z.coerce.number().int().positive().default(100),
  AI_GLOBAL_MINUTE_CALL_LIMIT: z.coerce.number().int().positive().default(10),
  AI_USER_DAILY_CALL_LIMIT: z.coerce.number().int().positive().default(10),
  AI_ENABLED: z.string().transform((v) => v === "true").default(false as never),
  APP_ENV: z.enum(["development", "preview", "production", "test"]).default("development"),
  DEMO_MODE: z.string().transform((v) => v === "true").default(false as never),
});

let validatedEnv: z.infer<typeof EnvSchema> | null = null;

export function getServerEnv() {
  if (!validatedEnv) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      console.warn("Server environment warnings:", parsed.error.format());
      validatedEnv = {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "mock-key",
        SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL_PRIMARY: process.env.GEMINI_MODEL_PRIMARY || "gemini-2.5-flash",
        GEMINI_MODEL_FALLBACK: process.env.GEMINI_MODEL_FALLBACK,
        AI_DAILY_BATCHES_PER_USER: 5, AI_OPERATIONS_PER_MINUTE_PER_USER: 2,
        AI_GLOBAL_DAILY_CALL_LIMIT: 100, AI_GLOBAL_MINUTE_CALL_LIMIT: 10, AI_USER_DAILY_CALL_LIMIT: 10,
        AI_ENABLED: process.env.AI_ENABLED === "true",
        APP_ENV: (process.env.APP_ENV as never) || "development",
        DEMO_MODE: process.env.DEMO_MODE === "true",
      };
    } else {
      validatedEnv = parsed.data;
    }
  }
  return validatedEnv;
}
