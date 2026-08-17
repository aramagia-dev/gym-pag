"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { exerciseCatalogService, routineService } from "@/src/application/composition";
import { normalizeRoutineTemplate, type DayOfWeek, type Exercise } from "@/src/domain/models/workout";
import type { RoutineExerciseInput, RoutineInput } from "@/src/application/routines/routine-service";
import { restMinutesToSeconds, restSecondsToMinutes } from "@/src/features/active-workout/rest-timer";
import RoutineNavigation from "@/src/features/routines/routine-navigation";
import { routineDays } from "@/src/features/routines/routine-days";

const emptyExercise = (): RoutineExerciseInput => ({ exerciseId: "", targetSets: 3, targetReps: 10 });
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Ocurrió un problema. Intente nuevamente."; }

export default function RoutineForm({ routineId }: { routineId?: string }) {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState({ name: "", daysOfWeek: ["monday"] as DayOfWeek[], notes: "" });
  const [selected, setSelected] = useState<Record<string, RoutineExerciseInput>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([exerciseCatalogService.list(), routineId ? routineService.get(routineId) : Promise.resolve(null)])
      .then(([catalog, savedRoutine]) => {
        if (!active) return;
        setExercises(catalog);
        if (routineId && !savedRoutine) {
          setError("La rutina no existe.");
          return;
        }
        if (savedRoutine) {
          const routine = normalizeRoutineTemplate(savedRoutine);
          setForm({ name: routine.name, daysOfWeek: routine.daysOfWeek, notes: routine.notes ?? "" });
          setSelected(Object.fromEntries(routine.exercises.map((exercise) => [exercise.exerciseId, {
            exerciseId: exercise.exerciseId,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            restSeconds: exercise.restSeconds,
          }])));
        }
      })
      .catch((reason: unknown) => { if (active) setError(errorMessage(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [routineId]);

  function toggleExercise(exerciseId: string) {
    setSelected((current) => {
      if (current[exerciseId]) { const next = { ...current }; delete next[exerciseId]; return next; }
      return { ...current, [exerciseId]: { ...emptyExercise(), exerciseId } };
    });
  }

  function updateSelected(exerciseId: string, field: keyof RoutineExerciseInput, value: number | undefined) {
    setSelected((current) => ({ ...current, [exerciseId]: { ...current[exerciseId], [field]: (value === undefined || Number.isNaN(value)) && field === "restSeconds" ? undefined : value } }));
  }

  function toggleDay(day: DayOfWeek) {
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((selectedDay) => selectedDay !== day)
        : [...current.daysOfWeek, day],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
       const input = { ...form, exercises: Object.values(selected) } satisfies RoutineInput;
       if (routineId) await routineService.update({ ...input, id: routineId });
       else await routineService.create(input);
      router.push("/routines");
    } catch (reason: unknown) { setError(errorMessage(reason)); setSaving(false); }
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Gym / Rutinas</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{routineId ? "Editar rutina" : "Crear rutina"}</h1><p className="mt-2 max-w-xl text-sm text-slate-400">Organice sus ejercicios y objetivos para cada día.</p></div><RoutineNavigation active={routineId ? "edit" : "new"} /></header>
        <div className="mb-6"><a href="/routines" className="text-sm text-cyan-300 hover:text-cyan-200">← Volver a rutinas</a></div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6" aria-labelledby="routine-form-title">
            <h2 id="routine-form-title" className="text-lg font-semibold">Datos de la rutina</h2>
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-medium" htmlFor="routine-name">Nombre<input id="routine-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white outline-none focus:ring-2 focus:ring-cyan-400" placeholder="Fuerza de tren inferior" /></label>
              <fieldset className="block text-sm font-medium"><legend>Días de entrenamiento</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{routineDays.map((day) => <label key={day.value} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-3"><input type="checkbox" name="daysOfWeek" value={day.value} checked={form.daysOfWeek.includes(day.value)} onChange={() => toggleDay(day.value)} className="h-5 w-5 accent-cyan-400" />{day.label}</label>)}</div></fieldset>
              <label className="block text-sm font-medium" htmlFor="routine-notes">Notas <span className="font-normal text-slate-500">(opcional)</span><textarea id="routine-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none focus:ring-2 focus:ring-cyan-400" placeholder="Indicaciones generales" /></label>
              {error && <p role="alert" className="rounded-lg border border-rose-900/70 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">{error}</p>}
               <button type="submit" disabled={saving || loading || Boolean(routineId && error === "La rutina no existe.")} className="min-h-12 w-full rounded-xl bg-cyan-400 px-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : routineId ? "Guardar cambios" : "Crear rutina"}</button>
            </form>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6" aria-labelledby="exercise-selection-title">
            <div className="mb-4 flex items-center justify-between"><h2 id="exercise-selection-title" className="text-lg font-semibold">Ejercicios</h2><span className="text-sm text-slate-500">{Object.keys(selected).length} seleccionados</span></div>
            {loading && <p className="text-sm text-slate-400">Cargando ejercicios...</p>}
            {!loading && exercises.length === 0 && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center"><p className="font-medium">El catálogo está vacío</p><p className="mt-2 text-sm text-slate-400">Agregue ejercicios antes de crear una rutina.</p></div>}
            <div className="space-y-3">{exercises.map((exercise) => { const config = selected[exercise.id]; return <div key={exercise.id} className="rounded-xl border border-slate-800 p-4"><label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(config)} onChange={() => toggleExercise(exercise.id)} className="h-5 w-5 accent-cyan-400" />{exercise.name}<span className="ml-auto text-xs font-normal text-slate-500">{exercise.muscleGroup}</span></label>{config && <div className="mt-4 grid grid-cols-3 gap-2"><label className="text-xs text-slate-400">Series<input type="number" min="1" value={config.targetSets} onChange={(event) => updateSelected(exercise.id, "targetSets", event.currentTarget.valueAsNumber)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-base text-white" /></label><label className="text-xs text-slate-400">Repeticiones<input type="number" min="1" value={config.targetReps} onChange={(event) => updateSelected(exercise.id, "targetReps", event.currentTarget.valueAsNumber)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-base text-white" /></label><label className="text-xs text-slate-400">Descanso (minutos)<input type="number" min="0" step="0.5" value={restSecondsToMinutes(config.restSeconds)} onChange={(event) => updateSelected(exercise.id, "restSeconds", restMinutesToSeconds(event.currentTarget.valueAsNumber))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-base text-white" /></label></div>}</div>; })}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
