"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { workoutAnalyticsService } from "@/src/application/composition";
import type { WorkoutDashboardMetrics } from "@/src/application/workouts/workout-analytics-service";

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Ocurrió un problema. Intente nuevamente.";
const kg = (value: number) =>
  `${value.toLocaleString("es-ES", { maximumFractionDigits: 1 })} kg`;

export default function ProgressAnalytics() {
  const [metrics, setMetrics] = useState<WorkoutDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    workoutAnalyticsService
      .getDashboardMetrics()
      .then((value) => {
        if (active) setMetrics(value);
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
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Gym / Progreso
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Panel de progreso
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Analice su volumen acumulado en sesiones completadas.
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
              className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400"
              href="/history"
            >
              Historial
            </a>
            <a
              className="min-h-11 rounded-lg bg-cyan-400 px-3 py-2.5 font-semibold text-slate-950"
              href="/analytics"
            >
              Progreso
            </a>
            <a
              className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400"
              href="/data"
            >
              Datos
            </a>
          </nav>
        </header>
        {loading && (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
            Cargando progreso...
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
        {!loading && !error && metrics?.summary.sessions === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
            <p className="font-medium">Todavía no hay datos de progreso</p>
            <p className="mt-2 text-sm text-slate-400">
              Complete una sesión para ver sus métricas.
            </p>
          </div>
        )}
        {metrics && metrics.summary.sessions > 0 && (
          <>
            <section
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Resumen de progreso"
            >
              {[
                ["Sesiones", metrics.summary.sessions.toString()],
                [
                  "Series completadas",
                  metrics.summary.completedSets.toString(),
                ],
                ["Volumen total", kg(metrics.summary.totalVolumeKg)],
                ["Promedio por sesión", kg(metrics.summary.averageVolumeKg)],
              ].map(([label, value]) => (
                <article
                  key={label}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                </article>
              ))}
            </section>
            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <article
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                aria-labelledby="volume-chart-title"
              >
                <h2 id="volume-chart-title" className="text-lg font-semibold">
                  Volumen por fecha
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Kilogramos realizados en cada día con sesiones completadas.
                </p>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.volumeOverTime} accessibilityLayer>
                      <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        formatter={(value) => kg(Number(value))}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="volumeKg"
                        name="Volumen"
                        stroke="#22d3ee"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
              <article
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                aria-labelledby="exercise-chart-title"
              >
                <h2 id="exercise-chart-title" className="text-lg font-semibold">
                  Volumen por ejercicio
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Ejercicios ordenados por volumen acumulado.
                </p>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.volumeByExercise}
                      layout="vertical"
                      accessibilityLayer
                    >
                      <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis
                        dataKey="exerciseName"
                        type="category"
                        width={100}
                        stroke="#94a3b8"
                      />
                      <Tooltip formatter={(value) => kg(Number(value))} />
                      <Bar
                        dataKey="volumeKg"
                        name="Volumen"
                        fill="#34d399"
                        radius={[0, 5, 5, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
