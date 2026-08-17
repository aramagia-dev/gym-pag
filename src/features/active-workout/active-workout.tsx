"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  activeWorkoutService,
  exerciseCatalogService,
  routineService,
} from "@/src/application/composition";
import type {
  Exercise,
  RoutineTemplate,
  WorkoutSession,
  WorkoutSet,
} from "@/src/domain/models/workout";
import { initialDraftValues, type DraftValues } from "./draft-defaults";
import {
  draftSaveStatusClassName,
  draftSaveStatusLabel,
  type DraftSaveStatus,
} from "./draft-save-status";
import { confirmFinish } from "./finish-confirmation";
import { formatRestCountdown } from "./rest-timer";
import {
  calculateElapsedSeconds,
  formatElapsedDuration,
} from "./session-summary";

type Draft = DraftValues & { saveStatus: DraftSaveStatus };

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Ocurrió un problema. Intente nuevamente.";
}

function saveStatusDraft(draft: DraftValues): Draft {
  return { ...draft, saveStatus: "saved" };
}

function updateDraftValue(
  setDrafts: Dispatch<SetStateAction<Record<string, Draft>>>,
  setId: string,
  field: keyof Draft,
  value: number,
) {
  setDrafts((current) => ({
    ...current,
    [setId]: { ...current[setId], [field]: value, saveStatus: "unsaved" },
  }));
}

export default function ActiveWorkout({ sessionId }: { sessionId: string }) {
  const [routine, setRoutine] = useState<RoutineTemplate | null>(null);
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [exerciseNames, setExerciseNames] = useState<Record<string, string>>(
    {},
  );
  const [previousSets, setPreviousSets] = useState<
    Record<string, WorkoutSet[]>
  >({});
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const draftSaveVersions = useRef<Record<string, number>>({});
  const finishRequested = useRef(false);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [restTimer, setRestTimer] = useState<{
    expiresAt: number;
    setId: string;
  } | null>(null);
  const [restNow, setRestNow] = useState(() => Date.now());
  const [elapsedNow, setElapsedNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadWorkout() {
      try {
        const workout = await activeWorkoutService.load(sessionId);
        if (!workout) throw new Error("La sesión no existe.");
        const [loadedRoutine, exercises] = await Promise.all([
          workout.session.templateId
            ? routineService.get(workout.session.templateId)
            : Promise.resolve(null),
          exerciseCatalogService.list(),
        ]);
        const exerciseIds = [
          ...new Set(workout.sets.map((set) => set.exerciseId)),
        ];
        const previousResults = await Promise.all(
          exerciseIds.map((id) =>
            activeWorkoutService.getPreviousCompletedSets(sessionId, id),
          ),
        );
        if (!active) return;
        setRoutine(loadedRoutine);
        setCatalog(exercises);
        setSession(workout.session);
        setSets(workout.sets);
        setDrafts(
          Object.fromEntries(
            workout.sets.map((set) => [
              set.id,
              saveStatusDraft(
                initialDraftValues(
                  set,
                  previousResults[exerciseIds.indexOf(set.exerciseId)]?.find(
                    (item) => item.setNumber === set.setNumber,
                  ),
                  loadedRoutine?.exercises.find(
                    (item) => item.exerciseId === set.exerciseId,
                  )?.targetReps,
                ),
              ),
            ]),
          ),
        );
        setExerciseNames(
          Object.fromEntries(
            exercises.map((exercise) => [exercise.id, exercise.name]),
          ),
        );
        setPreviousSets(
          Object.fromEntries(
            exerciseIds.map((id, index) => [id, previousResults[index]]),
          ),
        );
      } catch (reason: unknown) {
        if (active) setError(errorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadWorkout();
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!session || session.endTime) return;
    const tick = () => setElapsedNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!restTimer) return;
    const tick = () => {
      const now = Date.now();
      setRestNow(now);
      if (now >= restTimer.expiresAt) setRestTimer(null);
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [restTimer]);

  async function saveSet(set: WorkoutSet) {
    const draft = drafts[set.id];
    if (!draft) return;
    const version = (draftSaveVersions.current[set.id] ?? 0) + 1;
    draftSaveVersions.current[set.id] = version;
    setDrafts((current) => ({
      ...current,
      [set.id]: { ...current[set.id], saveStatus: "saving" },
    }));
    try {
      const updated = await activeWorkoutService.updateSet({
        ...draft,
        id: set.id,
        isCompleted: set.isCompleted,
      });
      if (draftSaveVersions.current[set.id] === version) {
        setSets((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setDrafts((current) => ({
          ...current,
          [set.id]: { ...current[set.id], saveStatus: "saved" },
        }));
      }
      setError(null);
    } catch (reason: unknown) {
      if (draftSaveVersions.current[set.id] === version) {
        setDrafts((current) => ({
          ...current,
          [set.id]: { ...current[set.id], saveStatus: "error" },
        }));
      }
      setError(errorMessage(reason));
    }
  }

  async function toggleSet(set: WorkoutSet) {
    const draft = drafts[set.id] ?? { weight: set.weight, reps: set.reps };
    setSaving(true);
    try {
      const updated = await activeWorkoutService.updateSet({
        ...draft,
        id: set.id,
        isCompleted: !set.isCompleted,
      });
      setSets((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      if (set.isCompleted) {
        setRestTimer(null);
      } else {
        const restSeconds = routine?.exercises.find(
          (item) => item.exerciseId === set.exerciseId,
        )?.restSeconds;
        if (restSeconds && restSeconds > 0) {
          setRestNow(Date.now());
          setRestTimer({
            expiresAt: Date.now() + restSeconds * 1000,
            setId: set.id,
          });
        } else {
          setRestTimer(null);
        }
      }
      setError(null);
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function addExercise() {
    if (!selectedExercise) return;
    setSaving(true);
    try {
      const added = await activeWorkoutService.addExercise(
        sessionId,
        selectedExercise,
      );
      setSets((current) =>
        current.some((set) => set.id === added.id)
          ? current
          : [...current, added],
      );
      setDrafts((current) => ({
        ...current,
        [added.id]: saveStatusDraft(
          initialDraftValues(
            added,
            previousSets[selectedExercise]?.find(
              (item) => item.setNumber === 1,
            ),
          ),
        ),
      }));
      setSelectedExercise("");
      setError(null);
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function addSet(exerciseId: string) {
    setSaving(true);
    try {
      const added = await activeWorkoutService.addSet(sessionId, exerciseId);
      setSets((current) => [...current, added]);
      setDrafts((current) => ({
        ...current,
        [added.id]: saveStatusDraft(
          initialDraftValues(
            added,
            previousSets[exerciseId]?.find(
              (item) => item.setNumber === added.setNumber,
            ),
          ),
        ),
      }));
      setError(null);
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function removeSet(setId: string) {
    setSaving(true);
    try {
      const remaining = await activeWorkoutService.removeSet(sessionId, setId);
      setSets(remaining);
      if (restTimer?.setId === setId) setRestTimer(null);
      setDrafts((current) =>
        Object.fromEntries(
          remaining.map((set) => [
            set.id,
            current[set.id] ??
              saveStatusDraft({ weight: set.weight, reps: set.reps }),
          ]),
        ),
      );
      setError(null);
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function removeExercise(exerciseId: string) {
    setSaving(true);
    try {
      const remaining = await activeWorkoutService.removeExercise(
        sessionId,
        exerciseId,
      );
      setSets(remaining);
      if (restTimer && !remaining.some((set) => set.id === restTimer.setId))
        setRestTimer(null);
      setDrafts((current) =>
        Object.fromEntries(
          remaining.map((set) => [
            set.id,
            current[set.id] ??
              saveStatusDraft({ weight: set.weight, reps: set.reps }),
          ]),
        ),
      );
      setError(null);
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function moveExercise(exerciseId: string, direction: "up" | "down") {
    setSaving(true);
    try {
      setSets(
        await activeWorkoutService.moveExercise(
          sessionId,
          exerciseId,
          direction,
        ),
      );
      setError(null);
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!confirmFinish(sets, (message) => window.confirm(message))) return;
    if (finishRequested.current) return;
    finishRequested.current = true;
    setFinishing(true);
    setRestTimer(null);
    try {
      const finishedSession = await activeWorkoutService.finish(sessionId);
      setSession(finishedSession);
      setFinishing(false);
    } catch (reason: unknown) {
      finishRequested.current = false;
      setError(errorMessage(reason));
      setFinishing(false);
    }
  }

  const completed = sets.filter((set) => set.isCompleted).length;
  const sessionExerciseIds = [...new Set(sets.map((set) => set.exerciseId))];
  const groups = sessionExerciseIds.map((exerciseId) => ({
    exerciseId,
    sets: sets.filter((set) => set.exerciseId === exerciseId),
  }));
  const availableExercises = catalog.filter(
    (exercise) => !sessionExerciseIds.includes(exercise.id),
  );
  const controlsDisabled = saving || finishing;
  const restRemaining = restTimer
    ? Math.ceil(Math.max(0, restTimer.expiresAt - restNow) / 1000)
    : 0;
  const completedVolume = sets.reduce(
    (total, set) => (set.isCompleted ? total + set.weight * set.reps : total),
    0,
  );
  const completionPercentage = sets.length
    ? Math.round((completed / sets.length) * 100)
    : 0;
  const elapsedDuration = session
    ? formatElapsedDuration(
        calculateElapsedSeconds(
          session.startTime,
          session.endTime ?? elapsedNow,
        ),
      )
    : "00:00";

  if (loading)
    return (
      <main className="min-h-screen p-6 text-slate-100">
        <p>Cargando sesión...</p>
      </main>
    );
  if (error && sets.length === 0)
    return (
      <main className="min-h-screen p-6 text-slate-100">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-900/70 bg-slate-900 p-6">
          <p role="alert" className="text-rose-200">
            {error}
          </p>
          <a
            className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-4 text-sm"
            href="/routines"
          >
            Volver a rutinas
          </a>
        </div>
      </main>
    );

  if (session?.endTime)
    return (
      <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-emerald-800/70 bg-slate-900 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Sesión finalizada
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              {routine?.name ?? "Entrenamiento"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Resumen del entrenamiento completado.
            </p>
            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Duración
                </dt>
                <dd className="mt-2 text-xl font-bold tabular-nums">
                  {elapsedDuration}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Series
                </dt>
                <dd className="mt-2 text-xl font-bold">
                  {completed} de {sets.length}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Completado
                </dt>
                <dd className="mt-2 text-xl font-bold">
                  {completionPercentage}%
                </dd>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Volumen
                </dt>
                <dd className="mt-2 text-xl font-bold">
                  {completedVolume.toLocaleString("es-ES")} kg
                </dd>
              </div>
            </dl>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-400 px-4 font-bold text-slate-950"
                href="/routines"
              >
                Volver a rutinas
              </a>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 px-4 font-semibold text-cyan-200"
                href="/history"
              >
                Ver historial
              </a>
            </div>
          </div>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Sesión activa
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              {routine?.name ?? "Entrenamiento"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {completed} de {sets.length} series completadas
            </p>
          </div>
          <button
            type="button"
            onClick={() => void finish()}
            disabled={controlsDisabled}
            className="min-h-11 rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {finishing ? "Finalizando..." : "Finalizar sesión"}
          </button>
        </header>
        <section
          className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4"
          aria-label="Resumen de la sesión"
        >
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Duración
              </dt>
              <dd
                className="mt-1 text-xl font-bold tabular-nums"
                aria-live="polite"
                aria-atomic="true"
              >
                {elapsedDuration}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Series
              </dt>
              <dd className="mt-1 text-xl font-bold">
                {completed} de {sets.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Completado
              </dt>
              <dd className="mt-1 text-xl font-bold">
                {completionPercentage}%
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Volumen
              </dt>
              <dd className="mt-1 text-xl font-bold">
                {completedVolume.toLocaleString("es-ES")} kg
              </dd>
            </div>
          </dl>
        </section>
        {restTimer && restRemaining > 0 && (
          <section
            className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-cyan-400/60 bg-cyan-950/40 p-4"
            aria-label="Descanso restante"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
                Descanso restante
              </p>
              <p
                className="mt-1 text-3xl font-bold tabular-nums text-white"
                aria-live="polite"
              >
                {formatRestCountdown(restRemaining)}{" "}
                <span className="text-base font-medium text-cyan-200">
                  minutos
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRestTimer(null)}
              disabled={controlsDisabled}
              className="min-h-11 rounded-lg border border-cyan-300 px-3 text-sm font-semibold text-cyan-100 disabled:opacity-50"
            >
              Omitir descanso
            </button>
          </section>
        )}
        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 sm:flex-row sm:items-end">
          <label
            htmlFor="add-exercise"
            className="flex-1 text-sm text-slate-300"
          >
            Agregar ejercicio
            <select
              id="add-exercise"
              aria-label="Agregar ejercicio"
              value={selectedExercise}
              onChange={(event) =>
                setSelectedExercise(event.currentTarget.value)
              }
              disabled={controlsDisabled}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-white"
            >
              <option value="">Seleccionar ejercicio</option>
              {availableExercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void addExercise()}
            disabled={!selectedExercise || controlsDisabled}
            className="min-h-11 rounded-lg border border-cyan-400 px-4 text-sm font-semibold text-cyan-300 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Agregar"}
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-900/70 bg-rose-950/50 px-3 py-2 text-sm text-rose-200"
          >
            {error}
          </p>
        )}
        <div
          className="mb-6 h-2 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-label="Progreso de series"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionPercentage}
        >
          <div
            className="h-full rounded-full bg-cyan-400 transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div
          className="mb-6 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
          aria-label="Estado de guardado de las series"
        >
          <div
            className="flex flex-wrap gap-x-4 gap-y-1"
            role="list"
            aria-live="polite"
          >
            {sets.map((set) => {
              const status = drafts[set.id]?.saveStatus ?? "saved";
              return (
                <span
                  key={set.id}
                  role="listitem"
                  className={`text-xs font-semibold ${draftSaveStatusClassName(status)}`}
                >
                  Serie {set.setNumber}: {draftSaveStatusLabel(status)}
                </span>
              );
            })}
          </div>
        </div>
        <div className="space-y-5">
          {groups.map((group, index) => (
            <section
              key={group.exerciseId}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {exerciseNames[group.exerciseId] ?? "Ejercicio"}
                  </h2>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void moveExercise(group.exerciseId, "up")}
                      disabled={controlsDisabled || index === 0}
                      className="min-h-10 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-200 disabled:opacity-50"
                      aria-label={`Subir ${exerciseNames[group.exerciseId] ?? "Ejercicio"}`}
                    >
                      Subir
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void moveExercise(group.exerciseId, "down")
                      }
                      disabled={controlsDisabled || index === groups.length - 1}
                      className="min-h-10 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-200 disabled:opacity-50"
                      aria-label={`Bajar ${exerciseNames[group.exerciseId] ?? "Ejercicio"}`}
                    >
                      Bajar
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void removeExercise(group.exerciseId)}
                  disabled={controlsDisabled}
                  className="min-h-11 rounded-lg border border-rose-900 px-3 text-xs font-semibold text-rose-300 disabled:opacity-50"
                  aria-label={`Eliminar ejercicio ${exerciseNames[group.exerciseId] ?? "Ejercicio"}`}
                >
                  Eliminar ejercicio
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {group.sets.map((set) => {
                  const previous = previousSets[group.exerciseId]?.find(
                    (item) => item.setNumber === set.setNumber,
                  );
                  return (
                    <div
                      key={set.id}
                      className={`grid grid-cols-2 gap-2 rounded-xl border p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end ${set.isCompleted ? "border-cyan-500/50 bg-cyan-950/20" : "border-slate-800"}`}
                    >
                      <div className="col-span-2 text-sm text-slate-400 sm:col-span-1 sm:pb-3">
                        <span>Serie {set.setNumber}</span>
                        <p className="mt-1 text-xs text-slate-500">
                          {previous
                            ? `Anterior: ${previous.weight} kg × ${previous.reps}`
                            : "Sin registro anterior"}
                        </p>
                      </div>
                      <label className="min-w-0 text-xs text-slate-400">
                        Peso
                        <input
                          aria-label={`Peso, serie ${set.setNumber}`}
                          type="number"
                          min="0"
                          step="any"
                          value={drafts[set.id]?.weight ?? ""}
                          onChange={(event) =>
                            updateDraftValue(
                              setDrafts,
                              set.id,
                              "weight",
                              event.currentTarget.valueAsNumber,
                            )
                          }
                          onBlur={() => void saveSet(set)}
                          disabled={controlsDisabled}
                          className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-base text-white"
                        />
                      </label>
                      <label className="min-w-0 text-xs text-slate-400">
                        Repeticiones
                        <input
                          aria-label={`Repeticiones, serie ${set.setNumber}`}
                          type="number"
                          min="0"
                          step="1"
                          value={drafts[set.id]?.reps ?? ""}
                          onChange={(event) =>
                            updateDraftValue(
                              setDrafts,
                              set.id,
                              "reps",
                              event.currentTarget.valueAsNumber,
                            )
                          }
                          onBlur={() => void saveSet(set)}
                          disabled={controlsDisabled}
                          className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-base text-white"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void toggleSet(set)}
                        disabled={controlsDisabled}
                        aria-pressed={set.isCompleted}
                        className="col-span-2 min-h-12 rounded-lg border border-cyan-800 bg-cyan-950/30 px-3 text-sm font-semibold text-cyan-200 disabled:opacity-50 sm:col-span-1"
                      >
                        {set.isCompleted ? "Completada" : "Completar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeSet(set.id)}
                        disabled={controlsDisabled}
                        className="col-span-2 min-h-11 rounded-lg border border-rose-900 px-3 text-xs font-semibold text-rose-300 disabled:opacity-50 sm:col-span-1"
                      >
                        Quitar serie
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => void addSet(group.exerciseId)}
                disabled={controlsDisabled}
                className="mt-4 min-h-11 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-200 disabled:opacity-50"
              >
                Agregar serie
              </button>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
