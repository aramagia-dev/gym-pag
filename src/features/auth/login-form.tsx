"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/src/infrastructure/auth/supabase-browser";
import { authErrorMessage, validateAuthForm } from "@/src/features/auth/auth-validation";
import { getSupabasePublicConfig } from "@/src/infrastructure/auth/supabase-config";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const config = getSupabasePublicConfig();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const validationError = validateAuthForm({ email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError(config.configured ? "No se pudo iniciar el cliente de autenticación." : config.message);
      return;
    }

    setError(null);
    setLoading(true);
    const result = mode === "login"
      ? await client.auth.signInWithPassword({ email: email.trim(), password })
      : await client.auth.signUp({ email: email.trim(), password });
    setLoading(false);

    if (result.error) {
      setError(authErrorMessage(result.error.message));
      return;
    }

    if (mode === "register") {
      setMessage("Registro iniciado. Revise su correo para confirmar la cuenta.");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  if (!config.configured) {
    return <p role="alert" className="rounded-2xl border border-amber-700/70 bg-amber-950/40 p-4 text-sm text-amber-100">{config.message}</p>;
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-2 rounded-xl border border-slate-700 p-1 text-sm" role="tablist" aria-label="Modo de autenticación">
        {(["login", "register"] as const).map((option) => (
          <button key={option} type="button" role="tab" aria-selected={mode === option} onClick={() => { setMode(option); setError(null); setMessage(null); }} className={`min-h-11 rounded-lg px-3 font-semibold ${mode === option ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}>
            {option === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>
      <form className="space-y-5" onSubmit={submit} noValidate>
        <div><label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-slate-100 outline-none focus:border-cyan-400" /></div>
        <div><label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-slate-100 outline-none focus:border-cyan-400" /></div>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
        <button type="submit" disabled={loading} className="min-h-12 w-full rounded-xl bg-cyan-400 px-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">{loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Registrarme"}</button>
      </form>
    </>
  );
}
