import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DataBackupService,
  parseBackupDocument,
  serializeBackupDocument,
  type BackupDocument,
} from "@/src/application/data-backup/data-backup-service";
import { BackupDexieRepository } from "@/src/infrastructure/persistence/indexed-db/backup-dexie-repository";
import { GymDatabase } from "@/src/infrastructure/persistence/indexed-db/database";

const document: BackupDocument = {
  version: 1,
  exportedAt: "2026-08-16T12:00:00.000Z",
  exercises: [{ id: "exercise-1", name: "Press", muscleGroup: "chest", category: "push", mode: "weighted" }],
  routines: [{ id: "legacy", name: "Legacy", dayOfWeek: "thursday", exercises: [] }],
  workoutSessions: [{ id: "session-1", startTime: "2026-08-16T08:00:00.000Z" }],
  workoutSets: [{ id: "set-1", sessionId: "session-1", exerciseId: "exercise-1", setNumber: 1, setType: "working", weight: 60, reps: 8, isCompleted: true }],
};

describe("data backup contract", () => {
  it("serializes and parses the stable versioned shape", () => {
    const parsed = parseBackupDocument(serializeBackupDocument(document));
    expect(parsed).toEqual(document);
  });

  it("rejects malformed JSON, unsupported versions, and missing primitive fields", () => {
    expect(() => parseBackupDocument("not json")).toThrow("JSON válido");
    expect(() => parseBackupDocument(JSON.stringify({ ...document, version: 2 }))).toThrow("versión incompatible");
    expect(() => parseBackupDocument(JSON.stringify({ ...document, exercises: [{ id: "missing-name" }] }))).toThrow("respaldo válido");
  });

  it("normalizes legacy exercises without a mode to weighted", () => {
    const legacy = { ...document, exercises: [{ id: "legacy", name: "Press", muscleGroup: "chest", category: "push" }], workoutSets: [{ ...document.workoutSets[0], exerciseId: "legacy" }] };
    expect(parseBackupDocument(JSON.stringify(legacy)).exercises[0].mode).toBe("weighted");
  });

  it("accepts optional set notes and preserves them through backup serialization", () => {
    const withNotes = { ...document, workoutSets: [{ ...document.workoutSets[0], notes: "Drop set en la última serie" }] };
    expect(parseBackupDocument(serializeBackupDocument(withNotes)).workoutSets[0].notes).toBe("Drop set en la última serie");
    expect(parseBackupDocument(JSON.stringify(document)).workoutSets[0].notes).toBeUndefined();
  });

  it("rejects non-string set notes", () => {
    expect(() => parseBackupDocument(JSON.stringify({ ...document, workoutSets: [{ ...document.workoutSets[0], notes: 10 }] }))).toThrow("respaldo válido");
  });

  it("rejects orphan references before replacement", () => {
    const cases = [
      { routines: [{ id: "routine-1", name: "Routine", daysOfWeek: ["monday"], exercises: [{ id: "template-1", exerciseId: "missing", order: 0, targetSets: 1, targetReps: 1 }] }] },
      { workoutSessions: [{ id: "session-1", templateId: "missing", startTime: "2026-08-16T08:00:00.000Z" }] },
      { workoutSessions: [{ id: "session-1", startTime: "2026-08-16T08:00:00.000Z", exerciseOrder: ["missing"] }] },
      { workoutSets: [{ id: "set-1", sessionId: "missing", exerciseId: "exercise-1", setNumber: 1, setType: "working", weight: 0, reps: 0, isCompleted: false }] },
      { workoutSets: [{ id: "set-1", sessionId: "session-1", exerciseId: "missing", setNumber: 1, setType: "working", weight: 0, reps: 0, isCompleted: false }] },
    ];

    for (const change of cases) {
      expect(() => parseBackupDocument(JSON.stringify({ ...document, ...change }))).toThrow("respaldo válido");
    }
  });

  it("rejects duplicate collection and template exercise IDs", () => {
    const cases = [
      { exercises: [document.exercises[0], document.exercises[0]] },
      { routines: [document.routines[0], document.routines[0]] },
      { workoutSessions: [document.workoutSessions[0], document.workoutSessions[0]] },
      { workoutSets: [document.workoutSets[0], document.workoutSets[0]] },
      { routines: [{ id: "routine-1", name: "Routine", daysOfWeek: ["monday"], exercises: [
        { id: "template-1", exerciseId: "exercise-1", order: 0, targetSets: 1, targetReps: 1 },
        { id: "template-1", exerciseId: "exercise-1", order: 1, targetSets: 1, targetReps: 1 },
      ] }] },
    ];

    for (const change of cases) {
      expect(() => parseBackupDocument(JSON.stringify({ ...document, ...change }))).toThrow("respaldo válido");
    }
  });

  it("rejects invalid numeric targets, rest, set numbers, values, and ordering", () => {
    const cases = [
      { routines: [{ id: "routine-1", name: "Routine", daysOfWeek: ["monday"], exercises: [{ id: "template-1", exerciseId: "exercise-1", order: 0, targetSets: 0, targetReps: 1 }] }] },
      { routines: [{ id: "routine-1", name: "Routine", daysOfWeek: ["monday"], exercises: [{ id: "template-1", exerciseId: "exercise-1", order: 0.5, targetSets: 1, targetReps: 1 }] }] },
      { routines: [{ id: "routine-1", name: "Routine", daysOfWeek: ["monday"], exercises: [{ id: "template-1", exerciseId: "exercise-1", order: 0, targetSets: 1, targetReps: 1, restSeconds: -1 }] }] },
      { workoutSets: [{ ...document.workoutSets[0], setNumber: 0 }] },
      { workoutSets: [{ ...document.workoutSets[0], weight: -1 }] },
      { workoutSets: [{ ...document.workoutSets[0], reps: -1 }] },
      { workoutSets: [{ ...document.workoutSets[0], rir: -1 }] },
      { workoutSessions: [{ ...document.workoutSessions[0], exerciseOrder: ["exercise-1", "exercise-1"] }] },
      { workoutSessions: [{ ...document.workoutSessions[0], exerciseOrder: ["missing"] }] },
    ];

    for (const change of cases) {
      expect(() => parseBackupDocument(JSON.stringify({ ...document, ...change }))).toThrow("respaldo válido");
    }
  });

  it("validates before calling the replacement repository", async () => {
    let replaceCalls = 0;
    const service = new DataBackupService({
      readAll: async () => document,
      replaceAll: async () => { replaceCalls += 1; },
    });

    await expect(service.importJson("{}".replace("{}", "not json"))).rejects.toThrow();
    expect(replaceCalls).toBe(0);
  });
});

describe("Dexie backup repository", () => {
  let db: GymDatabase;

  beforeEach(() => { db = new GymDatabase(); });
  afterEach(async () => { db.close(); await db.delete(); });

  it("replaces all collections and preserves legacy routines unchanged", async () => {
    const repository = new BackupDexieRepository(db);
    await db.exercises.put({ id: "old", name: "Old", muscleGroup: "back", category: "pull" });

    await repository.replaceAll({
      exercises: document.exercises,
      routines: document.routines,
      workoutSessions: document.workoutSessions,
      workoutSets: document.workoutSets,
    });

    expect(await repository.readAll()).toEqual({
      exercises: document.exercises,
      routines: document.routines,
      workoutSessions: document.workoutSessions,
      workoutSets: document.workoutSets,
    });
  });

  it("rolls back the full replacement when one collection write fails", async () => {
    const repository = new BackupDexieRepository(db);
    const original = { id: "original", name: "Original", muscleGroup: "back" as const, category: "pull" as const };
    await db.exercises.put(original);
    db.workoutSets.hook("creating", (_key, set) => {
      if (set.id === "set-1") throw new Error("simulated backup write failure");
    });

    await expect(repository.replaceAll({
      exercises: document.exercises,
      routines: document.routines,
      workoutSessions: document.workoutSessions,
      workoutSets: document.workoutSets,
    })).rejects.toThrow("simulated backup write failure");

    expect(await repository.readAll()).toEqual({ exercises: [original], routines: [], workoutSessions: [], workoutSets: [] });
  });
});
