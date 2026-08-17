import { describe, expect, it } from "vitest";
import { WorkoutAnalyticsService } from "@/src/application/workouts/workout-analytics-service";
import type { Exercise, RoutineTemplate, WorkoutSession, WorkoutSet } from "@/src/domain/models/workout";
import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";

class MemoryWorkout implements WorkoutRepository {
  constructor(public sessions: WorkoutSession[], public sets: WorkoutSet[]) {}
  findSessionById(id: string) { return Promise.resolve(this.sessions.find((item) => item.id === id) ?? null); }
  findAllSessions() { return Promise.resolve(this.sessions); }
  createSession() { return Promise.resolve(); } updateSession() { return Promise.resolve(); } deleteSessionById() { return Promise.resolve(); }
  createSessionWithSets() { return Promise.resolve(); }
  findSetById(id: string) { return Promise.resolve(this.sets.find((item) => item.id === id) ?? null); }
  findSetsBySessionId(id: string) { return Promise.resolve(this.sets.filter((item) => item.sessionId === id)); }
  createSet() { return Promise.resolve(); } updateSet() { return Promise.resolve(); } deleteSetById() { return Promise.resolve(); }
  findPreviousCompletedSets() { return Promise.resolve([]); }
}

class MemoryRoutines implements RoutineRepository {
  constructor(private readonly items: RoutineTemplate[]) {}
  findById(id: string) { return Promise.resolve(this.items.find((item) => item.id === id) ?? null); }
  findAll() { return Promise.resolve(this.items); }
  create() { return Promise.resolve(); } update() { return Promise.resolve(); } deleteById() { return Promise.resolve(); }
}

class MemoryExercises implements ExerciseRepository {
  constructor(private readonly items: Exercise[]) {}
  findById(id: string) { return Promise.resolve(this.items.find((item) => item.id === id) ?? null); }
  findAll() { return Promise.resolve(this.items); }
  create() { return Promise.resolve(); } update() { return Promise.resolve(); } deleteById() { return Promise.resolve(); }
}

const routine: RoutineTemplate = { id: "routine-1", name: "Fuerza", daysOfWeek: ["monday"], exercises: [] };
const sessions: WorkoutSession[] = [
  { id: "old", templateId: "routine-1", startTime: "2026-08-10T10:00:00.000Z", endTime: "2026-08-10T11:00:00.000Z" },
  { id: "new", startTime: "2026-08-16T10:00:00.000Z" },
];
const sets: WorkoutSet[] = [
  { id: "old-1", sessionId: "old", exerciseId: "press", setNumber: 1, setType: "working", weight: 50, reps: 5, isCompleted: true },
  { id: "old-2", sessionId: "old", exerciseId: "press", setNumber: 2, setType: "working", weight: 100, reps: 10, isCompleted: false },
  { id: "new-1", sessionId: "new", exerciseId: "press", setNumber: 1, setType: "working", weight: 20, reps: 3, isCompleted: true },
];

function service() { return new WorkoutAnalyticsService(new MemoryWorkout(sessions, sets), new MemoryRoutines([routine]), new MemoryExercises([{ id: "press", name: "Press", muscleGroup: "chest", category: "push" }])); }

describe("WorkoutAnalyticsService", () => {
  it("sorts history, distinguishes status, falls back to free workout, and counts completed volume only", async () => {
    const history = await service().getHistory();
    expect(history.map((item) => item.session.id)).toEqual(["new", "old"]);
    expect(history[0]).toMatchObject({ routineName: "Entrenamiento libre", status: "in-progress", completedSets: 1, totalSets: 1, completedVolumeKg: 60 });
    expect(history[1]).toMatchObject({ routineName: "Fuerza", status: "completed", completedSets: 1, totalSets: 2, completedVolumeKg: 250 });
  });

  it("aggregates dashboard metrics from completed sessions and sorts chart data", async () => {
    const metrics = await service().getDashboardMetrics();
    expect(metrics.summary).toEqual({ sessions: 1, completedSets: 1, totalVolumeKg: 250, averageVolumeKg: 250 });
    expect(metrics.volumeOverTime).toEqual([{ date: "2026-08-10", volumeKg: 250 }]);
    expect(metrics.volumeByExercise).toEqual([{ exerciseId: "press", exerciseName: "Press", volumeKg: 250 }]);
  });
});
