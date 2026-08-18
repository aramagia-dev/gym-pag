"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/src/infrastructure/auth/supabase-browser";

export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    void client.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  if (!email) return <Link className="min-h-11 rounded-lg border border-cyan-400/50 px-3 py-2.5 text-cyan-200 hover:border-cyan-300" href="/login">Ingresar</Link>;
  return <><Link className="min-h-11 rounded-lg border border-cyan-400/50 px-3 py-2.5 text-cyan-200 hover:border-cyan-300" href="/groups">Grupos</Link><Link className="min-h-11 rounded-lg border border-cyan-400/50 px-3 py-2.5 text-cyan-200 hover:border-cyan-300" href="/account">Mi cuenta</Link></>;
}
