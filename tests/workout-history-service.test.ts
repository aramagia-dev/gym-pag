import { describe, expect, it } from "vitest";
import type { WorkoutSession, WorkoutSet } from "@/src/domain/models/workout";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";
import { WorkoutHistoryService } from "@/src/application/workouts/workout-history-service";

class MemoryWorkoutRepository implements WorkoutRepository {
  readonly deletedIds: string[][] = [];
  constructor(public sessions: WorkoutSession[], public sets: WorkoutSet[] = []) {}
  findSessionById(id: string) { return Promise.resolve(this.sessions.find((session) => session.id === id) ?? null); }
  findAllSessions() { return Promise.resolve(this.sessions); }
  createSession() { return Promise.resolve(); }
  createSessionWithSets() { return Promise.resolve(); }
  updateSession() { return Promise.resolve(); }
  deleteSessionById(id: string) { return this.deleteSessionsWithSets([id]); }
  deleteSessionsWithSets(ids: string[]) {
    this.deletedIds.push(ids);
    this.sessions = this.sessions.filter((session) => !ids.includes(session.id));
    this.sets = this.sets.filter((set) => !ids.includes(set.sessionId));
    return Promise.resolve();
  }
  findSetById(id: string) { return Promise.resolve(this.sets.find((set) => set.id === id) ?? null); }
  findSetsBySessionId(id: string) { return Promise.resolve(this.sets.filter((set) => set.sessionId === id)); }
  createSet() { return Promise.resolve(); }
  updateSet() { return Promise.resolve(); }
  deleteSetById() { return Promise.resolve(); }
  findPreviousCompletedSets() { return Promise.resolve([]); }
}

const completed = (id: string, startTime: string): WorkoutSession => ({
  id, startTime, endTime: `${startTime.slice(0, 11)}11:00:00.000Z`,
});

describe("WorkoutHistoryService", () => {
  it("deletes one completed session and its sets", async () => {
    const repository = new MemoryWorkoutRepository([completed("one", "2026-08-10T10:00:00.000Z")], [{
      id: "set-one", sessionId: "one", exerciseId: "exercise", setNumber: 1, setType: "working", weight: 10, reps: 5, isCompleted: true,
    }]);
    await new WorkoutHistoryService(repository).deleteSessionById("one");
    expect(repository.deletedIds).toEqual([["one"]]);
    expect(repository.sessions).toEqual([]);
    expect(repository.sets).toEqual([]);
  });

  it("deletes all completed sessions while preserving the active session", async () => {
    const repository = new MemoryWorkoutRepository([
      completed("done", "2026-08-10T10:00:00.000Z"),
      { id: "active", startTime: "2026-08-16T10:00:00.000Z" },
    ]);
    await expect(new WorkoutHistoryService(repository).deleteAllCompletedSessions()).resolves.toBe(1);
    expect(repository.sessions.map((session) => session.id)).toEqual(["active"]);
  });

  it("uses the date one calendar month before the injected clock as cutoff", async () => {
    const repository = new MemoryWorkoutRepository([
      completed("before", "2026-07-16T23:59:59.999Z"),
      completed("at-cutoff", "2026-07-17T12:00:00.000Z"),
      completed("after", "2026-08-01T10:00:00.000Z"),
      { id: "active", startTime: "2026-08-10T10:00:00.000Z" },
    ]);
    await expect(new WorkoutHistoryService(repository, () => new Date("2026-08-17T12:00:00.000Z")).deleteCompletedSessionsFromLastMonth()).resolves.toBe(2);
    expect(repository.sessions.map((session) => session.id)).toEqual(["before", "active"]);
  });

  it("rejects missing and active sessions without touching the repository", async () => {
    const repository = new MemoryWorkoutRepository([{ id: "active", startTime: "2026-08-16T10:00:00.000Z" }]);
    const service = new WorkoutHistoryService(repository);
    await expect(service.deleteSessionById("missing")).rejects.toThrow("no existe");
    await expect(service.deleteSessionById("active")).rejects.toThrow("sesión en curso");
    expect(repository.deletedIds).toEqual([]);
  });
});
