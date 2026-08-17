import { describe, expect, it } from "vitest";
import { HomeDashboardService } from "@/src/application/home/home-dashboard-service";
import type { RoutineTemplate, WorkoutSession, WorkoutSet } from "@/src/domain/models/workout";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";

class MemoryWorkoutRepository implements WorkoutRepository {
  constructor(private readonly sessions: WorkoutSession[], private readonly sets: WorkoutSet[]) {}
  findSessionById(id: string) { return Promise.resolve(this.sessions.find((session) => session.id === id) ?? null); }
  findAllSessions() { return Promise.resolve(this.sessions); }
  createSession() { return Promise.resolve(); }
  createSessionWithSets() { return Promise.resolve(); }
  updateSession() { return Promise.resolve(); }
  deleteSessionById() { return Promise.resolve(); }
  deleteSessionsWithSets() { return Promise.resolve(); }
  findSetById(id: string) { return Promise.resolve(this.sets.find((set) => set.id === id) ?? null); }
  findSetsBySessionId(sessionId: string) { return Promise.resolve(this.sets.filter((set) => set.sessionId === sessionId)); }
  createSet() { return Promise.resolve(); }
  updateSet() { return Promise.resolve(); }
  deleteSetById() { return Promise.resolve(); }
  findPreviousCompletedSets() { return Promise.resolve([]); }
}

class MemoryRoutineRepository implements RoutineRepository {
  constructor(private readonly routines: RoutineTemplate[]) {}
  findById(id: string) { return Promise.resolve(this.routines.find((routine) => routine.id === id) ?? null); }
  findAll() { return Promise.resolve(this.routines); }
  create() { return Promise.resolve(); }
  update() { return Promise.resolve(); }
  deleteById() { return Promise.resolve(); }
}

const routine = (id: string, name: string, daysOfWeek: RoutineTemplate["daysOfWeek"]): RoutineTemplate => ({
  id, name, daysOfWeek, exercises: [{ id: `${id}-exercise`, exerciseId: "exercise", order: 0, targetSets: 1, targetReps: 5 }],
});

const session = (id: string, startTime: string, endTime?: string, templateId?: string): WorkoutSession => ({ id, startTime, endTime, templateId });
const set = (id: string, sessionId: string, weight: number, reps: number, isCompleted: boolean): WorkoutSet => ({ id, sessionId, exerciseId: "exercise", setNumber: 1, setType: "working", weight, reps, isCompleted });

function service(routines: RoutineTemplate[], sessions: WorkoutSession[], sets: WorkoutSet[]) {
  return new HomeDashboardService(new MemoryRoutineRepository(routines), new MemoryWorkoutRepository(sessions, sets));
}

describe("HomeDashboardService", () => {
  it("filters today's routines using the local weekday", async () => {
    const dashboard = await service([routine("monday", "Lunes", ["monday"]), routine("sunday", "Domingo", ["sunday"])], [], []).getDashboard(new Date(2026, 7, 16, 12));
    expect(dashboard.todayRoutines.map((item) => item.id)).toEqual(["sunday"]);
  });

  it("uses Monday through Sunday boundaries for weekly summaries", async () => {
    const sessions = [
      session("monday", "2026-08-10T00:00:00.000Z", "2026-08-10T01:00:00.000Z"),
      session("sunday", "2026-08-16T23:59:59.000Z", "2026-08-17T01:00:00.000Z"),
      session("next", "2026-08-17T00:00:00.000Z", "2026-08-17T01:00:00.000Z"),
    ];
    const dashboard = await service([], sessions, []).getDashboard(new Date(2026, 7, 16, 12));
    expect(dashboard.weeklySummary.sessions).toBe(2);
  });

  it("counts only completed sessions and completed set volume", async () => {
    const sessions = [session("completed", "2026-08-12T10:00:00.000Z", "2026-08-12T11:00:00.000Z"), session("active", "2026-08-13T10:00:00.000Z")];
    const dashboard = await service([], sessions, [set("done", "completed", 20, 5, true), set("skipped", "completed", 100, 10, false), set("active", "active", 50, 5, true)]).getDashboard(new Date(2026, 7, 16, 12));
    expect(dashboard.weeklySummary).toEqual({ sessions: 1, completedSets: 1, volumeKg: 100 });
  });

  it("selects the most recent active session and safely names missing routines", async () => {
    const dashboard = await service([routine("known", "Fuerza", ["saturday"])], [session("old", "2026-08-15T09:00:00.000Z", undefined, "known"), session("new", "2026-08-16T09:00:00.000Z", undefined, "missing")], []).getDashboard(new Date(2026, 7, 16, 12));
    expect(dashboard.activeSession).toEqual({ id: "new", routineName: "Entrenamiento libre" });
  });

  it("returns an empty dashboard when there is no data", async () => {
    await expect(service([], [], []).getDashboard(new Date(2026, 7, 16))).resolves.toEqual({ todayRoutines: [], activeSession: null, weeklySummary: { sessions: 0, completedSets: 0, volumeKg: 0 } });
  });
});
