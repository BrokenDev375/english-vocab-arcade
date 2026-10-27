import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";
import { getServerEnv } from "@/lib/env.server";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const env = getServerEnv();
    if (!env.SUPABASE_SECRET_KEY) {
      throw new Error("SUPABASE_SECRET_KEY is required for admin server client operations");
    }
    adminClient = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClient;
}
