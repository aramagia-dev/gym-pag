"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { activeWorkoutService } from "@/src/application/composition";
import {
  ActiveWorkoutStartConflict,
  type ActiveWorkout,
  type ActiveWorkoutStartDecision,
} from "@/src/application/workouts/active-workout-service";

function NewWorkoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ActiveWorkoutStartConflict | null>(null);
  const startedRoutine = useRef<string | null>(null);
  const startPromise = useRef<Promise<ActiveWorkout> | null>(null);
  const hasNavigated = useRef(false);
  const routineId = params.get("routineId");
  const start = useCallback((decision?: ActiveWorkoutStartDecision) => {
    if (!routineId) return;
    setError(null);
    setConflict(null);
    startPromise.current = activeWorkoutService.startFromRoutine(routineId, decision);
    startPromise.current.then((workout) => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      router.replace(`/workouts/${workout.session.id}`);
    }).catch((reason: unknown) => {
      if (hasNavigated.current) return;
      startPromise.current = null;
      if (reason instanceof ActiveWorkoutStartConflict) {
        setConflict(reason);
        return;
      }
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar la sesión.");
    });
  }, [routineId, router]);

  useEffect(() => {
    if (!routineId || startedRoutine.current === routineId) return;
    startedRoutine.current = routineId;
    start();
  }, [routineId, start]);
  const message = error ?? (routineId ? "Iniciando sesión..." : "Seleccione una rutina para iniciar la sesión.");
  if (conflict) {
    const activeName = conflict.activeRoutine?.name ?? "entrenamiento libre";
    return <main className="flex min-h-screen items-center justify-center p-6 text-slate-100"><div className="w-full max-w-md rounded-2xl border border-amber-800/70 bg-slate-900 p-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">Sesión activa</p><h1 className="mt-3 text-2xl font-bold">Ya tiene una sesión en curso</h1><p className="mt-3 text-sm text-slate-300">La sesión actual pertenece a {activeName}. Elija si desea continuarla o reemplazarla por la rutina solicitada.</p><div className="mt-6 grid gap-3"><button type="button" onClick={() => router.replace(`/workouts/${conflict.activeSession.id}`)} className="min-h-12 rounded-xl bg-cyan-400 px-4 font-bold text-slate-950">Continuar sesión actual</button><button type="button" onClick={() => start("replace-existing")} className="min-h-12 rounded-xl border border-amber-400 px-4 font-semibold text-amber-200">Finalizar sesión actual y comenzar la nueva</button><a className="min-h-12 rounded-xl border border-slate-700 px-4 py-3 text-center text-sm" href="/routines">Volver a rutinas</a></div></div></main>;
  }
  return <main className="flex min-h-screen items-center justify-center p-6 text-slate-100"><div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center"><p className="text-lg font-semibold">{message}</p>{(error || !routineId) && <a className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-4 text-sm" href="/routines">Volver a rutinas</a>}</div></main>;
}

export default function NewWorkoutPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center p-6 text-slate-100">Cargando...</main>}><NewWorkoutContent /></Suspense>;
}
