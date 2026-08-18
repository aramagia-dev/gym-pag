import { describe, expect, it } from "vitest";
import { getSupabaseConfig, getSupabasePublicConfig } from "@/src/infrastructure/auth/supabase-config";

describe("Supabase configuration", () => {
  it("reports missing configuration without throwing", () => {
    const result = getSupabaseConfig({});
    expect(result.configured).toBe(false);
  });

  it("supports the publishable key", () => {
    expect(getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key" })).toEqual({
      configured: true,
      config: { url: "https://project.supabase.co", publishableKey: "public-key" },
    });
  });

  it("supports the legacy anon key and rejects invalid URLs", () => {
    expect(getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key" }).configured).toBe(true);
    expect(getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key" }).configured).toBe(false);
  });

  it("keeps public environment access statically defined for Next.js client bundles", () => {
    expect(getSupabasePublicConfig().configured).toBe(false);
  });
});
