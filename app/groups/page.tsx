import { redirect } from "next/navigation";
import Link from "next/link";
import GroupsDashboard from "@/src/features/groups/groups-dashboard";
import { getSupabaseServerClient } from "@/src/infrastructure/auth/supabase-server";
import { getSupabaseConfig } from "@/src/infrastructure/auth/supabase-config";

export default async function GroupsPage() {
  const config = getSupabaseConfig();
  if (!config.configured) return <main className="flex min-h-screen items-center justify-center px-4 py-10 text-slate-100"><section className="w-full max-w-lg rounded-3xl border border-amber-700/70 bg-slate-900/90 p-6"><p role="alert" className="text-amber-100">{config.message}</p><Link className="mt-6 inline-flex text-sm text-cyan-300" href="/">Volver al modo local</Link></section></main>;
  const client = await getSupabaseServerClient();
  const { data, error } = client ? await client.auth.getUser() : { data: { user: null }, error: null };
  if (error || !data.user) redirect("/login");
  return <GroupsDashboard />;
}
