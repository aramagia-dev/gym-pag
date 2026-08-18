"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/src/infrastructure/auth/supabase-browser";

export default function AccountActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setLoading(true);
    await client.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return <button type="button" onClick={signOut} disabled={loading} className="min-h-12 rounded-xl border border-rose-700/70 px-5 font-semibold text-rose-200 hover:border-rose-400 disabled:opacity-60">{loading ? "Cerrando sesión..." : "Cerrar sesión"}</button>;
}
