"use client";

import { useEffect, useState } from "react";
import { routineService } from "@/src/application/composition";
import type { RoutineTemplate } from "@/src/domain/models/workout";
import RoutineNavigation from "@/src/features/routines/routine-navigation";
import { formatRoutineDays, routineDays } from "@/src/features/routines/routine-days";
import { allRoutineDays, filterAndSortRoutines, type RoutineDayFilter } from "@/src/features/routines/routine-filters";

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Ocurrió un problema. Intente nuevamente."; }

export default function RoutineDashboard() {
  const [routines, setRoutines] = useState<RoutineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState<RoutineDayFilter>(allRoutineDays);

  const filteredRoutines = filterAndSortRoutines(routines, { search, day });
  const filtersAreActive = search.trim().length > 0 || day !== allRoutineDays;

  useEffect(() => {
    let active = true;
    routineService.list()
      .then((saved) => { if (active) setRoutines(saved); })
      .catch((reason: unknown) => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Gym / Rutinas</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mis rutinas</h1><p className="mt-2 max-w-xl text-sm text-slate-400">Elija una rutina guardada para comenzar su sesión de entrenamiento.</p></div>
          <RoutineNavigation active="routines" />
        </header>
        <section aria-labelledby="saved-routines-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 id="saved-routines-title" className="text-lg font-semibold">Rutinas guardadas</h2><a href="/routines/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-400 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-300">Crear nueva rutina</a></div>
          {!loading && !error && routines.length > 0 && <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.4fr)]"><label className="block text-sm font-medium text-slate-200"><span>Buscar rutina</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o notas" className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400" /></label><label className="block text-sm font-medium text-slate-200"><span>Filtrar por día</span><select value={day} onChange={(event) => setDay(event.target.value as RoutineDayFilter)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none focus:border-cyan-400"><option value={allRoutineDays}>Todos los días</option>{routineDays.map((routineDay) => <option key={routineDay.value} value={routineDay.value}>{routineDay.label}</option>)}</select></label></div><div className="mt-4 flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>Mostrando <span className="font-semibold text-slate-200">{filteredRoutines.length}</span> de {routines.length} rutinas</p>{filtersAreActive && <button type="button" onClick={() => { setSearch(""); setDay(allRoutineDays); }} className="min-h-11 text-left font-semibold text-cyan-300 hover:text-cyan-200 sm:text-right">Limpiar filtros</button>}</div></div>}
          {loading && <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Cargando rutinas...</p>}
          {error && <p role="alert" className="rounded-lg border border-rose-900/70 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">{error}</p>}
          {!loading && !error && routines.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center"><p className="font-medium">Todavía no hay rutinas</p><p className="mt-2 text-sm text-slate-400">Cree su primera rutina para verla aquí.</p><a href="/routines/new" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950">Crear rutina</a></div>}
          {!loading && !error && routines.length > 0 && filteredRoutines.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center"><p className="font-medium">No se encontraron rutinas</p><p className="mt-2 text-sm text-slate-400">Pruebe con otra búsqueda o quite los filtros.</p></div>}
          {!loading && !error && filteredRoutines.length > 0 && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredRoutines.map((routine) => <article key={routine.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold">{routine.name}</h3><span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">{formatRoutineDays(routine.daysOfWeek)}</span></div><p className="mt-4 text-sm text-slate-400">{routine.exercises.length} {routine.exercises.length === 1 ? "ejercicio" : "ejercicios"}</p>{routine.notes && <p className="mt-3 border-t border-slate-800 pt-3 text-sm text-slate-400">{routine.notes}</p>}<div className="mt-5 grid gap-2 sm:grid-cols-2"><a href={`/routines/${routine.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:border-cyan-400">Editar</a><a href={`/workouts/new?routineId=${routine.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Iniciar sesión</a></div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
