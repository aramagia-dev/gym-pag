import Link from "next/link";
import LoginForm from "@/src/features/auth/login-form";

export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center px-4 py-10 text-slate-100"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-cyan-950/20 sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Gym / Cuenta</p><h1 className="mt-3 text-3xl font-bold">Acceda a su cuenta</h1><p className="mt-2 text-sm text-slate-400">La autenticación es opcional. Sus entrenamientos locales no se modifican.</p><div className="mt-8"><LoginForm /></div><Link className="mt-6 inline-flex text-sm text-cyan-300 hover:text-cyan-200" href="/">Volver al modo local</Link></section></main>;
}
