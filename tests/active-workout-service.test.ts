import { describe, expect, it } from "vitest";
import { ActiveWorkoutService, ActiveWorkoutStartConflict } from "@/src/application/workouts/active-workout-service";
import type { RoutineTemplate, WorkoutSession, WorkoutSet } from "@/src/domain/models/workout";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";

class InMemoryWorkoutRepository implements WorkoutRepository {
  sessions: WorkoutSession[] = [];
  sets: WorkoutSet[] = [];
  previousCompletedSets: WorkoutSet[] = [];
  previousCompletedSetQueries: string[] = [];
  atomicCreateCalls: Array<{ session: WorkoutSession; sets: WorkoutSet[] }> = [];
  findSessionById(id: string) { return Promise.resolve(this.sessions.find((item) => item.id === id) ?? null); }
  findAllSessions() { return Promise.resolve(this.sessions); }
  createSession(session: WorkoutSession) { this.sessions.push(session); return Promise.resolve(); }
  createSessionWithSets(session: WorkoutSession, sets: WorkoutSet[]) {
    this.atomicCreateCalls.push({ session, sets });
    this.sessions.push(session);
    this.sets.push(...sets);
    return Promise.resolve();
  }
  updateSession(session: WorkoutSession) { this.sessions = this.sessions.map((item) => item.id === session.id ? session : item); return Promise.resolve(); }
  deleteSessionById(id: string) { this.sessions = this.sessions.filter((item) => item.id !== id); return Promise.resolve(); }
  deleteSessionsWithSets(ids: string[]) { this.sessions = this.sessions.filter((item) => !ids.includes(item.id)); this.sets = this.sets.filter((item) => !ids.includes(item.sessionId)); return Promise.resolve(); }
  findSetById(id: string) { return Promise.resolve(this.sets.find((item) => item.id === id) ?? null); }
  findSetsBySessionId(sessionId: string) { return Promise.resolve(this.sets.filter((item) => item.sessionId === sessionId)); }
  createSet(set: WorkoutSet) { this.sets.push(set); return Promise.resolve(); }
  updateSet(set: WorkoutSet) { this.sets = this.sets.map((item) => item.id === set.id ? set : item); return Promise.resolve(); }
  deleteSetById(id: string) { this.sets = this.sets.filter((item) => item.id !== id); return Promise.resolve(); }
  findPreviousCompletedSets(exerciseId: string, _context?: { currentSessionId?: string }) {
    void _context;
    this.previousCompletedSetQueries.push(exerciseId);
    return Promise.resolve(this.previousCompletedSets.filter((set) => set.exerciseId === exerciseId));
  }
}

class InMemoryRoutineRepository implements RoutineRepository {
  constructor(private readonly routines: RoutineTemplate | RoutineTemplate[] | null) {}
  findById(id: string) {
    const routines = Array.isArray(this.routines) ? this.routines : this.routines ? [this.routines] : [];
    return Promise.resolve(routines.find((item) => item.id === id) ?? null);
  }
  findAll() { return Promise.resolve(Array.isArray(this.routines) ? this.routines : this.routines ? [this.routines] : []); }
  create() { return Promise.resolve(); }
  update() { return Promise.resolve(); }
  deleteById() { return Promise.resolve(); }
}

const routine: RoutineTemplate = {
  id: "routine-1", name: "Fuerza", daysOfWeek: ["monday"], exercises: [
    { id: "template-2", exerciseId: "exercise-2", order: 1, targetSets: 1, targetReps: 6 },
    { id: "template-1", exerciseId: "exercise-1", order: 0, targetSets: 2, targetReps: 10 },
  ],
};

function createService(workout = new InMemoryWorkoutRepository(), savedRoutine: RoutineTemplate | null = routine) {
  let setIndex = 0;
  return {
    workout,
    service: new ActiveWorkoutService(workout, new InMemoryRoutineRepository(savedRoutine), () => "2026-08-16T10:00:00.000Z", () => "session-1", () => `set-${++setIndex}`),
  };
}

describe("ActiveWorkoutService", () => {
  it("creates a deterministic session and working sets in routine order", async () => {
    const { service, workout } = createService();
    const active = await service.startFromRoutine("routine-1");
    expect(active.session).toEqual({ id: "session-1", templateId: "routine-1", startTime: "2026-08-16T10:00:00.000Z", exerciseOrder: ["exercise-1", "exercise-2"] });
    expect(active.sets).toEqual([
      { id: "set-1", sessionId: "session-1", exerciseId: "exercise-1", setNumber: 1, setType: "working", weight: 0, reps: 10, isCompleted: false },
      { id: "set-2", sessionId: "session-1", exerciseId: "exercise-1", setNumber: 2, setType: "working", weight: 0, reps: 10, isCompleted: false },
      { id: "set-3", sessionId: "session-1", exerciseId: "exercise-2", setNumber: 1, setType: "working", weight: 0, reps: 6, isCompleted: false },
    ]);
    expect(workout.sessions).toHaveLength(1);
    expect(workout.sets).toHaveLength(3);
    expect(workout.atomicCreateCalls).toEqual([{ session: active.session, sets: active.sets }]);
  });

  it("uses the atomic repository operation for initial session creation", async () => {
    const workout = new InMemoryWorkoutRepository();
    workout.createSession = () => { throw new Error("createSession must not be used"); };
    workout.createSet = () => { throw new Error("createSet must not be used"); };

    await expect(createService(workout).service.startFromRoutine("routine-1")).resolves.toMatchObject({
      session: { id: "session-1" },
      sets: expect.arrayContaining([expect.objectContaining({ id: "set-1" })]),
    });
    expect(workout.atomicCreateCalls).toHaveLength(1);
  });

  it("creates configured repetitions and starting weight only for a new session", async () => {
    const configuredRoutine: RoutineTemplate = {
      ...routine,
      exercises: [{ id: "template-1", exerciseId: "exercise-1", order: 0, targetSets: 3, targetReps: 12, sets: [{ reps: 12 }, { reps: 10 }, { reps: 8 }], startingWeightKg: 20 }],
    };
    const { service, workout } = createService(new InMemoryWorkoutRepository(), configuredRoutine);
    const active = await service.startFromRoutine(configuredRoutine.id);

    expect(active.sets.map((set) => ({ reps: set.reps, weight: set.weight }))).toEqual([{ reps: 12, weight: 20 }, { reps: 10, weight: 20 }, { reps: 8, weight: 20 }]);
    active.sets[0].weight = 35;
    active.sets[0].isCompleted = true;
    workout.sets[0] = active.sets[0];
    await expect(service.startFromRoutine(configuredRoutine.id)).resolves.toMatchObject({ sets: expect.arrayContaining([expect.objectContaining({ weight: 35, isCompleted: true })]) });
  });

  it("rejects a missing routine", async () => {
    await expect(createService(undefined, null).service.startFromRoutine("missing")).rejects.toThrow("rutina");
  });

  it("reuses an active session belonging to the requested routine", async () => {
    const workout = new InMemoryWorkoutRepository();
    const existingSession: WorkoutSession = {
      id: "existing-session", templateId: "routine-1", startTime: "2026-08-16T11:00:00.000Z",
    };
    const existingSet: WorkoutSet = {
      id: "persisted-set", sessionId: existingSession.id, exerciseId: "exercise-1", setNumber: 1,
      setType: "working", weight: 35, reps: 8, isCompleted: true,
    };
    workout.sessions = [existingSession];
    workout.sets = [existingSet];

    const { service } = createService(workout);
    const active = await service.startFromRoutine("routine-1");

    expect(active).toEqual({ session: existingSession, sets: [existingSet] });
    expect(workout.sessions).toHaveLength(1);
  });

  it("reports a different-routine active session without creating another one", async () => {
    const workout = new InMemoryWorkoutRepository();
    const activeSession: WorkoutSession = { id: "active", templateId: "routine-other", startTime: "2026-08-16T11:00:00.000Z" };
    workout.sessions = [activeSession];
    const otherRoutine: RoutineTemplate = { ...routine, id: "routine-other", name: "Hipertrofia" };
    const serviceWithBoth = new ActiveWorkoutService(workout, new InMemoryRoutineRepository([routine, otherRoutine]), () => "2026-08-16T12:00:00.000Z", () => "new-session", () => "set-new");

    await expect(serviceWithBoth.startFromRoutine("routine-1")).rejects.toSatisfy((error: unknown) =>
      error instanceof ActiveWorkoutStartConflict && error.activeSession.id === activeSession.id && error.activeRoutine?.name === "Hipertrofia",
    );
    expect(workout.sessions).toEqual([activeSession]);
  });

  it("finishes the conflicting session only after an explicit replace decision", async () => {
    const workout = new InMemoryWorkoutRepository();
    workout.sessions = [{ id: "active", templateId: "routine-other", startTime: "2026-08-16T11:00:00.000Z" }];
    const otherRoutine: RoutineTemplate = { ...routine, id: "routine-other" };
    const service = new ActiveWorkoutService(workout, new InMemoryRoutineRepository([routine, otherRoutine]), () => "2026-08-16T12:00:00.000Z", () => "new-session", () => "set-new");

    const started = await service.startFromRoutine("routine-1", "replace-existing");

    expect(started.session.id).toBe("new-session");
    expect(workout.sessions).toEqual([
      { id: "active", templateId: "routine-other", startTime: "2026-08-16T11:00:00.000Z", endTime: "2026-08-16T12:00:00.000Z" },
      expect.objectContaining({ id: "new-session", templateId: "routine-1" }),
    ]);
  });

  it("continues the conflicting session only after an explicit continue decision", async () => {
    const workout = new InMemoryWorkoutRepository();
    const activeSession: WorkoutSession = { id: "active", templateId: "routine-other", startTime: "2026-08-16T11:00:00.000Z" };
    workout.sessions = [activeSession];
    const otherRoutine: RoutineTemplate = { ...routine, id: "routine-other" };
    const service = new ActiveWorkoutService(workout, new InMemoryRoutineRepository([routine, otherRoutine]));

    const continued = await service.startFromRoutine("routine-1", "continue-existing");

    expect(continued.session).toEqual(activeSession);
    expect(workout.sessions).toEqual([activeSession]);
  });

  it("reports an active free workout as a conflict", async () => {
    const workout = new InMemoryWorkoutRepository();
    const activeSession: WorkoutSession = { id: "free", startTime: "2026-08-16T11:00:00.000Z" };
    workout.sessions = [activeSession];
    const service = new ActiveWorkoutService(workout, new InMemoryRoutineRepository(routine), () => "2026-08-16T12:00:00.000Z");

    await expect(service.startFromRoutine("routine-1")).rejects.toMatchObject({ activeSession, activeRoutine: null });
  });

  it("creates only one session when starts are concurrent", async () => {
    const workout = new InMemoryWorkoutRepository();
    let sessionIndex = 0;
    const service = new ActiveWorkoutService(
      workout,
      new InMemoryRoutineRepository(routine),
      () => "2026-08-16T10:00:00.000Z",
      () => `session-${++sessionIndex}`,
      (() => {
        let setIndex = 0;
        return () => `set-${++setIndex}`;
      })(),
    );

    const [first, second] = await Promise.all([
      service.startFromRoutine("routine-1"),
      service.startFromRoutine("routine-1"),
    ]);

    expect(first.session.id).toBe("session-1");
    expect(second).toEqual(first);
    expect(workout.sessions).toHaveLength(1);
    expect(workout.sets).toHaveLength(3);
  });

  it("serializes concurrent different-routine starts without violating the invariant", async () => {
    const workout = new InMemoryWorkoutRepository();
    const otherRoutine: RoutineTemplate = { ...routine, id: "routine-other", name: "Hipertrofia" };
    let sessionIndex = 0;
    const service = new ActiveWorkoutService(
      workout,
      new InMemoryRoutineRepository([routine, otherRoutine]),
      () => "2026-08-16T10:00:00.000Z",
      () => `session-${++sessionIndex}`,
      (() => {
        let setIndex = 0;
        return () => `set-${++setIndex}`;
      })(),
    );

    const [first, second] = await Promise.allSettled([
      service.startFromRoutine("routine-1"),
      service.startFromRoutine("routine-other"),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second.status).toBe("rejected");
    expect(second.status === "rejected" && second.reason).toBeInstanceOf(ActiveWorkoutStartConflict);
    expect(workout.sessions).toHaveLength(1);
    expect(workout.sessions[0].templateId).toBe("routine-1");
  });

  it("updates only editable values and validates them", async () => {
    const { service } = createService();
    const { sets } = await service.startFromRoutine("routine-1");
    const updated = await service.updateSet({ id: sets[0].id, weight: 40, reps: 8, setType: "drop-set", notes: "Última serie", isCompleted: true });
    expect(updated).toMatchObject({ id: sets[0].id, sessionId: "session-1", exerciseId: "exercise-1", setNumber: 1, setType: "drop-set", weight: 40, reps: 8, notes: "Última serie", isCompleted: true });
    await expect(service.updateSet({ ...updated, weight: Number.NaN })).rejects.toThrow("peso");
    await expect(service.updateSet({ ...updated, id: "missing" })).rejects.toThrow("serie");
  });

  it("loads sets and finishes an existing session", async () => {
    const { service } = createService();
    await service.startFromRoutine("routine-1");
    expect((await service.load("session-1"))?.sets).toHaveLength(3);
    const finished = await service.finish("session-1");
    expect(finished.endTime).toBe("2026-08-16T10:00:00.000Z");
    await expect(service.finish("missing")).rejects.toThrow("sesión");
  });

  it("cancels an active session and removes all of its sets", async () => {
    const { service, workout } = createService();
    await service.startFromRoutine("routine-1");

    await service.cancel("session-1");

    expect(workout.sessions).toEqual([]);
    expect(workout.sets).toEqual([]);
  });

  it("rejects cancelling missing or finished sessions without deleting them", async () => {
    const { service, workout } = createService();
    await service.startFromRoutine("routine-1");
    workout.sessions[0] = { ...workout.sessions[0], endTime: "2026-08-16T11:00:00.000Z" };

    await expect(service.cancel("missing")).rejects.toThrow("sesión");
    await expect(service.cancel("session-1")).rejects.toThrow("finalizó");
    expect(workout.sessions).toHaveLength(1);
    expect(workout.sets).toHaveLength(3);
  });

  it("delegates previous completed set lookup and preserves repository ordering", async () => {
    const workout = new InMemoryWorkoutRepository();
    const previousSets: WorkoutSet[] = [
      { id: "previous-2", sessionId: "old-session", exerciseId: "exercise-1", setNumber: 2, setType: "working", weight: 60, reps: 8, isCompleted: true },
      { id: "previous-1", sessionId: "old-session", exerciseId: "exercise-1", setNumber: 1, setType: "working", weight: 60, reps: 10, isCompleted: true },
    ];
    workout.previousCompletedSets = previousSets;
    const { service } = createService(workout);

     await expect(service.getPreviousCompletedSets("session-1", "exercise-1")).resolves.toEqual(previousSets);
    expect(workout.previousCompletedSetQueries).toEqual(["exercise-1"]);
  });

  it("adds an exercise with one zeroed set and does not duplicate it", async () => {
    const { service, workout } = createService();
    await service.startFromRoutine("routine-1");

    const added = await service.addExercise("session-1", "exercise-3");
    const duplicate = await service.addExercise("session-1", "exercise-3");

    expect(added).toEqual({ id: "set-4", sessionId: "session-1", exerciseId: "exercise-3", setNumber: 1, setType: "working", weight: 0, reps: 0, isCompleted: false });
    expect(duplicate).toEqual(added);
    expect(workout.sets.filter((set) => set.exerciseId === "exercise-3")).toHaveLength(1);
  });

  it("adds sets with consecutive numbers", async () => {
    const { service } = createService();
    await service.startFromRoutine("routine-1");

    await expect(service.addSet("session-1", "exercise-1")).resolves.toMatchObject({ exerciseId: "exercise-1", setNumber: 3, weight: 0, reps: 0 });
    await expect(service.addSet("session-1", "exercise-1")).resolves.toMatchObject({ exerciseId: "exercise-1", setNumber: 4 });
  });

  it("removes a set and renumbers the remaining sets for that exercise", async () => {
    const { service, workout } = createService();
    const { sets } = await service.startFromRoutine("routine-1");
    const added = await service.addSet("session-1", "exercise-1");
    workout.sets = workout.sets.map((set) =>
      set.id === sets[1].id ? { ...set, notes: "Mantener esta nota" } :
      set.id === added.id ? { ...set, notes: "Nota de la serie nueva" } : set,
    );

    const remaining = await service.removeSet("session-1", sets[0].id);

    expect(remaining.filter((set) => set.exerciseId === "exercise-1").map((set) => set.setNumber)).toEqual([1, 2]);
    expect(remaining.map((set) => set.id)).toEqual([sets[1].id, added.id, sets[2].id]);
    expect(remaining.find((set) => set.id === sets[1].id)?.notes).toBe("Mantener esta nota");
    expect(remaining.find((set) => set.id === added.id)?.notes).toBe("Nota de la serie nueva");
  });

  it("removes every set belonging to an exercise", async () => {
    const { service, workout } = createService();
    await service.startFromRoutine("routine-1");

    const remaining = await service.removeExercise("session-1", "exercise-1");

    expect(remaining).toHaveLength(1);
    expect(remaining[0].exerciseId).toBe("exercise-2");
    expect(workout.sessions[0].exerciseOrder).toEqual(["exercise-2"]);
  });

  it("moves exercises, persists order, and does nothing at boundaries", async () => {
    const { service, workout } = createService();
    await service.startFromRoutine("routine-1");

    expect((await service.moveExercise("session-1", "exercise-1", "up")).map((set) => set.exerciseId)).toEqual([
      "exercise-1", "exercise-1", "exercise-2",
    ]);
    expect((await service.moveExercise("session-1", "exercise-1", "down")).map((set) => set.exerciseId)).toEqual([
      "exercise-2", "exercise-1", "exercise-1",
    ]);
    expect(workout.sessions[0].exerciseOrder).toEqual(["exercise-2", "exercise-1"]);
    await service.moveExercise("session-1", "exercise-2", "down");
    expect(workout.sessions[0].exerciseOrder).toEqual(["exercise-1", "exercise-2"]);
  });

  it("rejects mutations for missing, foreign, and finished sessions", async () => {
    const { service, workout } = createService();
    const { sets } = await service.startFromRoutine("routine-1");
    workout.sessions[0] = { ...workout.sessions[0], endTime: "2026-08-16T11:00:00.000Z" };

    await expect(service.addExercise("missing", "exercise-3")).rejects.toThrow("sesión");
    await expect(service.addSet("session-1", "exercise-1")).rejects.toThrow("finalizó");
    await expect(service.removeSet("session-1", "missing")).rejects.toThrow("finalizó");
    await expect(service.updateSet({ id: sets[0].id, weight: 10, reps: 5, setType: "working", isCompleted: false })).rejects.toThrow("finalizó");
  });

  it("rejects removing a set that belongs to another session", async () => {
    const { service } = createService();
    await service.startFromRoutine("routine-1");

    await expect(service.removeSet("session-1", "foreign-set")).rejects.toThrow("no pertenece");
  });
});
