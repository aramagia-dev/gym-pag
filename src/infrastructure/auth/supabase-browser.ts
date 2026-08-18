import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/src/infrastructure/auth/supabase-config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const result = getSupabasePublicConfig();
  if (!result.configured) return null;

  browserClient = createBrowserClient(result.config.url, result.config.publishableKey);
  return browserClient;
}
