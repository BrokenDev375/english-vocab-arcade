import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.generated";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    client = createBrowserClient<Database>(url, key);
  }
  return client;
}
