import { createServerClient } from "@supabase/ssr";
import { connection } from "next/server";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.generated";

export async function createSupabaseServerClient() {
  // Supabase starts background session work that reads time; exclude it from prerendering.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This is expected and safe to ignore when reading state.
          }
        },
      },
    }
  );
}
