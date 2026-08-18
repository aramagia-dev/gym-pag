import { redirect } from "next/navigation";
import Link from "next/link";
import AccountActions from "@/src/features/auth/account-actions";
import { getSupabaseServerClient } from "@/src/infrastructure/auth/supabase-server";
import { getSupabaseConfig } from "@/src/infrastructure/auth/supabase-config";

export default async function AccountPage() {
  const config = getSupabaseConfig();
  if (!config.configured) return <main className="flex min-h-screen items-center justify-center px-4 py-10 text-slate-100"><section className="w-full max-w-lg rounded-3xl border border-amber-700/70 bg-slate-900/90 p-6 sm:p-8"><p role="alert" className="text-amber-100">{config.message}</p><Link className="mt-6 inline-flex text-sm text-cyan-300" href="/">Volver al modo local</Link></section></main>;

  const client = await getSupabaseServerClient();
  const { data, error } = client ? await client.auth.getUser() : { data: { user: null }, error: null };
  if (error || !data.user) redirect("/login");

  return <main className="flex min-h-screen items-center justify-center px-4 py-10 text-slate-100"><section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Gym / Cuenta</p><h1 className="mt-3 text-3xl font-bold">Su cuenta</h1><p className="mt-6 text-sm text-slate-400">Correo electrónico</p><p className="mt-1 break-all text-lg font-semibold">{data.user.email}</p><div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-slate-300"><strong className="text-cyan-200">Modo local:</strong> sus rutinas, sesiones, historial, analítica y copias de seguridad continúan en este dispositivo. La cuenta todavía no sincroniza esos datos.</div><div className="mt-6 flex flex-wrap gap-3"><AccountActions /><Link className="inline-flex min-h-12 items-center rounded-xl border border-cyan-400 px-5 font-semibold text-cyan-200 hover:border-cyan-300" href="/groups">Grupos</Link><Link className="inline-flex min-h-12 items-center rounded-xl border border-slate-700 px-5 font-semibold text-slate-200 hover:border-cyan-400" href="/">Volver al inicio</Link></div></section></main>;
}
