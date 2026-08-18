import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/src/infrastructure/auth/supabase-config";

export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  const result = getSupabaseConfig();
  if (!result.configured) return null;

  const cookieStore = await cookies();

  return createServerClient(result.config.url, result.config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always mutate cookies; middleware can refresh them later.
        }
      },
    },
  });
}
