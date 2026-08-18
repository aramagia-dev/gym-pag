"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { dataBackupService } from "@/src/application/composition";
import AuthStatus from "@/src/features/auth/auth-status";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un problema. Intente nuevamente.";
}

export default function DataBackup() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportData() {
    setBusy("export"); setMessage(null); setError(null);
    try {
      const json = await dataBackupService.exportJson();
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `gym-pag-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Los datos se exportaron correctamente.");
    } catch (reason: unknown) { setError(errorMessage(reason)); }
    finally { setBusy(null); }
  }

  async function importData() {
    if (!file) return;
    if (!window.confirm("Esta acción reemplazará todos los datos locales actuales. ¿Desea continuar?")) return;
    setBusy("import"); setMessage(null); setError(null);
    try {
      await dataBackupService.importJson(await file.text());
      setMessage("Los datos se importaron correctamente.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (reason: unknown) { setError(errorMessage(reason)); }
    finally { setBusy(null); }
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Gym / Datos</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Respaldo de datos</h1><p className="mt-2 max-w-xl text-sm text-slate-400">Proteja sus ejercicios, rutinas y entrenamientos guardados en este dispositivo.</p></div>
          <nav className="flex flex-wrap gap-2 text-sm" aria-label="Navegación principal">
            <Link className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/">Inicio</Link>
            <a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/exercises">Ejercicios</a>
            <a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/routines">Rutinas</a>
            <a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/history">Historial</a>
            <a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/analytics">Progreso</a>
            <a className="min-h-11 rounded-lg bg-cyan-400 px-3 py-2.5 font-semibold text-slate-950" href="/data">Datos</a>
            <AuthStatus />
          </nav>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6" aria-labelledby="export-title"><h2 id="export-title" className="text-xl font-semibold">Exportar una copia</h2><p className="mt-2 text-sm leading-6 text-slate-400">Descargue un archivo JSON con todos sus datos locales para conservarlo como respaldo.</p><button type="button" onClick={() => void exportData()} disabled={busy !== null} className="mt-6 min-h-12 w-full rounded-xl bg-cyan-400 px-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">{busy === "export" ? "Exportando..." : "Exportar datos"}</button></section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6" aria-labelledby="import-title"><h2 id="import-title" className="text-xl font-semibold">Importar un respaldo</h2><p className="mt-2 text-sm leading-6 text-slate-400">Seleccione un archivo JSON exportado por Gym Pag. La importación reemplaza los datos actuales, no los combina.</p><label className="mt-6 block text-sm font-medium text-slate-200" htmlFor="backup-file">Archivo de respaldo<input ref={inputRef} id="backup-file" type="file" accept="application/json,.json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block min-h-12 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950" /></label><button type="button" onClick={() => void importData()} disabled={!file || busy !== null} className="mt-4 min-h-12 w-full rounded-xl border border-cyan-400 px-4 font-bold text-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50">{busy === "import" ? "Importando..." : "Importar datos"}</button></section>
        </div>
        {message && <p role="status" className="mt-6 rounded-xl border border-emerald-900/70 bg-emerald-950/40 p-4 text-sm text-emerald-200">{message}</p>}
        {error && <p role="alert" className="mt-6 rounded-xl border border-rose-900/70 bg-rose-950/50 p-4 text-sm text-rose-200">{error}</p>}
      </div>
    </main>
  );
}
