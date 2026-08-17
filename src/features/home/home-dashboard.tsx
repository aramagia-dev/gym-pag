"use client";

import { useEffect, useState } from "react";
import { homeDashboardService } from "@/src/application/composition";
import type { HomeDashboard } from "@/src/application/home/home-dashboard-service";
import RoutineNavigation from "@/src/features/routines/routine-navigation";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Ocurrió un problema. Intente nuevamente.";

export default function HomeDashboard() {
  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    homeDashboardService.getDashboard()
      .then((saved) => { if (active) setDashboard(saved); })
      .catch((reason: unknown) => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Gym / Inicio</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tu entrenamiento, en un vistazo</h1><p className="mt-2 text-sm text-slate-400">Organiza tu semana y vuelve a donde lo dejaste.</p></div>
          <RoutineNavigation active="home" />
        </header>
        {loading && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Cargando tu panel...</p>}
        {error && <p role="alert" className="rounded-2xl border border-rose-900/70 bg-rose-950/50 p-6 text-rose-200">{error}</p>}
        {!loading && !error && dashboard && <div className="space-y-6">
          {dashboard.activeSession && <section className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-400/15 to-slate-900 p-6 shadow-2xl shadow-cyan-950/20"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Sesión en curso</p><div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold">{dashboard.activeSession.routineName}</h2><p className="mt-1 text-sm text-slate-400">Tu sesión está lista para continuar.</p></div><a href={`/workouts/${dashboard.activeSession.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-5 text-sm font-bold text-slate-950 hover:bg-cyan-300">Continuar entrenamiento</a></div></section>}
          <section aria-labelledby="today-title"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-sm text-slate-400">Plan de hoy</p><h2 id="today-title" className="text-2xl font-bold">Tus rutinas</h2></div><a href="/routines" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">Ver todas</a></div>{dashboard.todayRoutines.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6"><p className="font-medium">Día libre</p><p className="mt-1 text-sm text-slate-400">No tienes rutinas programadas para hoy.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{dashboard.todayRoutines.map((routine) => <article key={routine.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{routine.exerciseCount} {routine.exerciseCount === 1 ? "ejercicio" : "ejercicios"}</p><h3 className="mt-2 text-xl font-semibold">{routine.name}</h3><a href={`/workouts/new?routineId=${routine.id}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-300">Iniciar sesión</a></article>)}</div>}</section>
          <section aria-labelledby="week-title"><p className="text-sm text-slate-400">Rendimiento</p><h2 id="week-title" className="mt-1 text-2xl font-bold">Esta semana</h2><div className="mt-4 grid grid-cols-3 gap-3"><Metric label="Sesiones" value={dashboard.weeklySummary.sessions} /><Metric label="Series" value={dashboard.weeklySummary.completedSets} /><Metric label="Volumen" value={`${dashboard.weeklySummary.volumeKg} kg`} /></div></section>
        </div>}
        </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-cyan-300 sm:text-3xl">{value}</p></article>;
}
