import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  Exercise,
  RoutineTemplate,
  PersistedRoutineTemplate,
  WorkoutSession,
  WorkoutSet,
} from "@/src/domain/models/workout";
import { ExerciseDexieRepository } from "@/src/infrastructure/persistence/indexed-db/exercise-dexie-repository";
import { GymDatabase } from "@/src/infrastructure/persistence/indexed-db/database";
import { RoutineDexieRepository } from "@/src/infrastructure/persistence/indexed-db/routine-dexie-repository";
import { WorkoutDexieRepository } from "@/src/infrastructure/persistence/indexed-db/workout-dexie-repository";

describe("Dexie persistence repositories", () => {
  let db: GymDatabase;

  beforeEach(() => {
    db = new GymDatabase();
  });

  afterEach(async () => {
    db.close();
    await db.delete();
  });

  it("creates, finds, updates, and deletes an exercise", async () => {
    const repository = new ExerciseDexieRepository(db);
    const exercise: Exercise = {
      id: "exercise-1",
      name: "Bench press",
      muscleGroup: "chest",
      category: "push",
    };

    await repository.create(exercise);
    expect(await repository.findById(exercise.id)).toEqual(exercise);

    const updatedExercise = { ...exercise, name: "Incline bench press" };
    await repository.update(updatedExercise);
    expect(await repository.findById(exercise.id)).toEqual(updatedExercise);

    await repository.deleteById(exercise.id);
    expect(await repository.findById(exercise.id)).toBeNull();
  });

  it("creates and retrieves a routine", async () => {
    const repository = new RoutineDexieRepository(db);
    const routine: RoutineTemplate = {
      id: "routine-1",
      name: "Monday push",
      daysOfWeek: ["monday", "thursday"],
      exercises: [
        {
          id: "routine-exercise-1",
          exerciseId: "exercise-1",
          order: 1,
          targetSets: 3,
          targetReps: 8,
        },
      ],
    };

    await repository.create(routine);

    expect(await repository.findById(routine.id)).toEqual(routine);
    expect(await repository.findAll()).toEqual([routine]);
  });

  it("rolls back the session and all sets when an initial set write fails", async () => {
    const repository = new WorkoutDexieRepository(db);
    const session: WorkoutSession = { id: "atomic-session", startTime: "2026-08-16T08:00:00.000Z" };
    const sets: WorkoutSet[] = [
      { id: "atomic-set-1", sessionId: session.id, exerciseId: "exercise-1", setNumber: 1, setType: "working", weight: 0, reps: 8, isCompleted: false },
      { id: "atomic-set-2", sessionId: session.id, exerciseId: "exercise-1", setNumber: 2, setType: "working", weight: 0, reps: 8, isCompleted: false },
    ];
    db.workoutSets.hook("creating", (_key, set) => {
      if (set.id === "atomic-set-2") throw new Error("simulated set write failure");
    });

    await expect(repository.createSessionWithSets(session, sets)).rejects.toThrow("simulated set write failure");
    expect(await repository.findSessionById(session.id)).toBeNull();
    expect(await repository.findSetsBySessionId(session.id)).toEqual([]);
  });

  it("normalizes a legacy single-day routine without losing its day", async () => {
    const repository = new RoutineDexieRepository(db);
    const legacyRoutine: PersistedRoutineTemplate = {
      id: "legacy-routine",
      name: "Legacy push",
      dayOfWeek: "thursday",
      exercises: [],
    };

    await db.routines.put(legacyRoutine);

    await expect(repository.findById(legacyRoutine.id)).resolves.toEqual({
      id: legacyRoutine.id,
      name: legacyRoutine.name,
      exercises: legacyRoutine.exercises,
      daysOfWeek: ["thursday"],
    });
  });

  it("persists workout sessions and filters sets by session", async () => {
    const repository = new WorkoutDexieRepository(db);
    const firstSession: WorkoutSession = {
      id: "session-1",
      startTime: "2026-08-10T08:00:00.000Z",
      endTime: "2026-08-10T09:00:00.000Z",
    };
    const secondSession: WorkoutSession = {
      id: "session-2",
      startTime: "2026-08-11T08:00:00.000Z",
      endTime: "2026-08-11T09:00:00.000Z",
    };
    const firstSet: WorkoutSet = {
      id: "set-1",
      sessionId: firstSession.id,
      exerciseId: "exercise-1",
      setNumber: 1,
      setType: "working",
      weight: 60,
      reps: 8,
      isCompleted: true,
    };
    const secondSet: WorkoutSet = {
      ...firstSet,
      id: "set-2",
      sessionId: secondSession.id,
      weight: 62.5,
    };

    await repository.createSession(firstSession);
    await repository.createSession(secondSession);
    await repository.createSet(firstSet);
    await repository.createSet(secondSet);

    expect(await repository.findSessionById(firstSession.id)).toEqual(firstSession);
    expect(await repository.findAllSessions()).toEqual(
      expect.arrayContaining([firstSession, secondSession]),
    );
    expect(await repository.findSetsBySessionId(firstSession.id)).toEqual([
      firstSet,
    ]);
    expect(await repository.findSetById(secondSet.id)).toEqual(secondSet);
  });

  it("deletes sessions and all associated sets atomically", async () => {
    const repository = new WorkoutDexieRepository(db);
    const sessions: WorkoutSession[] = [
      { id: "delete-one", startTime: "2026-08-10T08:00:00.000Z", endTime: "2026-08-10T09:00:00.000Z" },
      { id: "keep", startTime: "2026-08-11T08:00:00.000Z", endTime: "2026-08-11T09:00:00.000Z" },
    ];
    const sets: WorkoutSet[] = sessions.map((session, index) => ({
      id: `${session.id}-set`, sessionId: session.id, exerciseId: "exercise-1", setNumber: 1,
      setType: "working", weight: index + 1, reps: 5, isCompleted: true,
    }));
    await db.workoutSessions.bulkPut(sessions);
    await db.workoutSets.bulkPut(sets);

    await repository.deleteSessionsWithSets(["delete-one"]);

    await expect(repository.findSessionById("delete-one")).resolves.toBeNull();
    await expect(repository.findSetsBySessionId("delete-one")).resolves.toEqual([]);
    await expect(repository.findSessionById("keep")).resolves.toEqual(sessions[1]);
    await expect(repository.findSetsBySessionId("keep")).resolves.toEqual([sets[1]]);
  });

  it("excludes incomplete sets and orders completed sets by session time and set number", async () => {
    const repository = new WorkoutDexieRepository(db);
    const olderSession: WorkoutSession = {
      id: "session-old",
      startTime: "2026-08-10T08:00:00.000Z",
      endTime: "2026-08-10T09:00:00.000Z",
    };
    const newerSession: WorkoutSession = {
      id: "session-new",
      startTime: "2026-08-12T08:00:00.000Z",
      endTime: "2026-08-12T09:00:00.000Z",
    };
    const makeSet = (
      id: string,
      sessionId: string,
      setNumber: number,
      isCompleted: boolean,
      exerciseId = "exercise-1",
    ): WorkoutSet => ({
      id,
      sessionId,
      exerciseId,
      setNumber,
      setType: "working",
      weight: 60,
      reps: 8,
      isCompleted,
    });

    await repository.createSession(olderSession);
    await repository.createSession(newerSession);
    await repository.createSet(makeSet("old-set-2", olderSession.id, 2, true));
    await repository.createSet(makeSet("old-set-1", olderSession.id, 1, true));
    await repository.createSet(makeSet("new-set-2", newerSession.id, 2, true));
    await repository.createSet(makeSet("new-set-1", newerSession.id, 1, true));
    await repository.createSet(
      makeSet("incomplete-set", newerSession.id, 3, false),
    );
    await repository.createSet(
      makeSet("other-exercise-set", newerSession.id, 1, true, "exercise-2"),
    );

    const previousSets = await repository.findPreviousCompletedSets("exercise-1");

    expect(previousSets.map((set) => set.id)).toEqual(["new-set-1", "new-set-2"]);
  });

  it("selects only the latest completed prior session and never mixes set numbers", async () => {
    const repository = new WorkoutDexieRepository(db);
    const sessions: WorkoutSession[] = [
      { id: "old", startTime: "2026-08-10T08:00:00.000Z", endTime: "2026-08-10T09:00:00.000Z" },
      { id: "current", startTime: "2026-08-12T08:00:00.000Z" },
      { id: "future", startTime: "2026-08-13T08:00:00.000Z", endTime: "2026-08-13T09:00:00.000Z" },
    ];
    for (const session of sessions) await repository.createSession(session);
    const makeSet = (id: string, sessionId: string, setNumber: number): WorkoutSet => ({
      id, sessionId, exerciseId: "exercise-1", setNumber, setType: "working", weight: 50, reps: 8, isCompleted: true,
    });
    await repository.createSet(makeSet("old-1", "old", 1));
    await repository.createSet(makeSet("old-3", "old", 3));
    await repository.createSet(makeSet("future-1", "future", 1));

    await expect(repository.findPreviousCompletedSets("exercise-1", { currentSessionId: "current" })).resolves.toEqual([
      expect.objectContaining({ id: "old-1" }),
      expect.objectContaining({ id: "old-3" }),
    ]);
    await expect(repository.findPreviousCompletedSets("exercise-1", { currentSessionId: "old" })).resolves.toEqual([]);
  });
});
