export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export type SupabaseConfigResult =
  | { configured: true; config: SupabaseConfig }
  | { configured: false; message: string };

const missingConfigMessage =
  "La autenticación todavía no está configurada. El modo local sigue disponible; configure Supabase para iniciar sesión.";

export function getSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfigResult {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !publishableKey) {
    return { configured: false, message: missingConfigMessage };
  }

  try {
    new URL(url);
  } catch {
    return { configured: false, message: missingConfigMessage };
  }

  return { configured: true, config: { url, publishableKey } };
}

export function getSupabasePublicConfig(): SupabaseConfigResult {
  return getSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export { missingConfigMessage };
