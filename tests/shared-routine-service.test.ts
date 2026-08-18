import { describe, expect, it } from "vitest";
import { buildSharedRoutineSnapshot, sanitizeSharedRoutineSnapshot, SharedRoutineService } from "@/src/application/shared-routines/shared-routine-service";
import type { Exercise, RoutineTemplate } from "@/src/domain/models/workout";
import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type { SharedRoutineRepository } from "@/src/domain/repositories/shared-routine-repository";

const exercise: Exercise = { id: "ex-1", name: "Sentadilla", muscleGroup: "quadriceps", category: "squat", mode: "weighted" };
const routine: RoutineTemplate = {
  id: "routine-1", name: "Piernas", daysOfWeek: ["monday"], notes: "Entrenamiento",
  exercises: [{ id: "template-1", exerciseId: exercise.id, order: 0, targetSets: 2, targetReps: 8, startingWeightKg: 80, restSeconds: 90, sets: [{ reps: 8 }, { reps: 10 }] }],
};

class Exercises implements ExerciseRepository {
  constructor(private readonly value: Exercise | null) {}
  findById() { return Promise.resolve(this.value); }
  findAll() { return Promise.resolve(this.value ? [this.value] : []); }
  create() { return Promise.resolve(); }
  update() { return Promise.resolve(); }
  deleteById() { return Promise.resolve(); }
}

class Routines implements RoutineRepository {
  constructor(private readonly value: RoutineTemplate | null) {}
  findById() { return Promise.resolve(this.value); }
  findAll() { return Promise.resolve(this.value ? [this.value] : []); }
  create() { return Promise.resolve(); }
  update() { return Promise.resolve(); }
  deleteById() { return Promise.resolve(); }
}

class Shares implements SharedRoutineRepository {
  readonly published: Array<{ groupId: string; snapshot: unknown }> = [];
  readonly revoked: string[] = [];
  list() { return Promise.resolve([]); }
  publish(groupId: string, snapshot: Parameters<SharedRoutineRepository["publish"]>[1]) {
    this.published.push({ groupId, snapshot });
    return Promise.resolve({ id: "share-1", groupId, publisherId: "user-1", sourceRoutineId: snapshot.sourceRoutineId, snapshot, publishedAt: "2026-08-17T00:00:00Z" });
  }
  revoke(id: string) { this.revoked.push(id); return Promise.resolve(); }
}

describe("shared routine snapshots", () => {
  it("maps exercise metadata and excludes starting weight", async () => {
    const snapshot = await buildSharedRoutineSnapshot(routine, new Exercises(exercise));
    expect(snapshot).toEqual({ sourceRoutineId: "routine-1", name: "Piernas", notes: "Entrenamiento", daysOfWeek: ["monday"], exercises: [{ exerciseId: "ex-1", exerciseName: "Sentadilla", muscleGroup: "quadriceps", category: "squat", mode: "weighted", order: 0, sets: [{ reps: 8 }, { reps: 10 }], restSeconds: 90 }] });
    expect(JSON.stringify(snapshot)).not.toContain("startingWeight");
  });

  it("rejects a missing routine or exercise", async () => {
    await expect(new SharedRoutineService(new Routines(null), new Exercises(exercise), new Shares()).publish("missing", "group-1")).rejects.toThrow("rutina");
    await expect(buildSharedRoutineSnapshot(routine, new Exercises(null))).rejects.toThrow("ejercicios inexistentes");
  });

  it("sanitizes notes, preserves ordering, and maps multiple groups through the service", async () => {
    const snapshot = sanitizeSharedRoutineSnapshot({ ...await buildSharedRoutineSnapshot(routine, new Exercises(exercise)), notes: "  nota  " });
    expect(snapshot.notes).toBe("nota");
    const shares = new Shares();
    const service = new SharedRoutineService(new Routines(routine), new Exercises(exercise), shares);
    await service.publish(routine.id, "group-a");
    await service.publish(routine.id, "group-b");
    expect(shares.published.map((item) => item.groupId)).toEqual(["group-a", "group-b"]);
    await service.revoke("share-1");
    expect(shares.revoked).toEqual(["share-1"]);
  });
});
