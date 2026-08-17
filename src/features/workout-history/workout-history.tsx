"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { workoutAnalyticsService } from "@/src/application/composition";
import type { WorkoutHistoryEntry } from "@/src/application/workouts/workout-analytics-service";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Ocurrió un problema. Intente nuevamente.";

export default function WorkoutHistory() {
  const [entries, setEntries] = useState<WorkoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    workoutAnalyticsService
      .getHistory()
      .then((items) => {
        if (active) setEntries(items);
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Gym / Historial
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Historial de entrenamientos
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Consulte sus sesiones y el volumen realizado.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400"
              href="/"
            >
              Inicio
            </Link>
            <a
              className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400"
              href="/exercises"
            >
              Ejercicios
            </a>
            <a
              className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400"
              href="/routines"
            >
              Rutinas
            </a>
            <a
              className="min-h-11 rounded-lg bg-cyan-400 px-3 py-2.5 font-semibold text-slate-950"
              href="/history"
            >
              Historial
            </a>
            <a
              className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400"
              href="/analytics"
            >
              Progreso
            </a>
          </nav>
        </header>
        {loading && (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
            Cargando historial...
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-rose-900/70 bg-rose-950/50 p-6 text-rose-200"
          >
            {error}
          </p>
        )}
        {!loading && !error && entries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
            <p className="font-medium">Todavía no hay sesiones</p>
            <p className="mt-2 text-sm text-slate-400">
              Inicie un entrenamiento para comenzar su historial.
            </p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {entries.map((entry) => (
            <article
              key={entry.session.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">
                    {dateFormatter.format(new Date(entry.session.startTime))}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {entry.routineName}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}
                >
                  {entry.status === "completed" ? "Completada" : "En curso"}
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-sm">
                <div>
                  <dt className="text-slate-500">Series</dt>
                  <dd className="mt-1 font-semibold">
                    {entry.completedSets} de {entry.totalSets}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Volumen</dt>
                  <dd className="mt-1 font-semibold">
                    {entry.completedVolumeKg.toLocaleString("es-ES")} kg
                  </dd>
                </div>
              </dl>
              <a
                href={`/workouts/${entry.session.id}`}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-cyan-300 hover:border-cyan-400"
              >
                {entry.status === "completed"
                  ? "Ver sesión"
                  : "Continuar sesión"}
              </a>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
