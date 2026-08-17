import { describe, expect, it } from "vitest";

import { RoutineService, type RoutineInput } from "@/src/application/routines/routine-service";
import type { Exercise, RoutineTemplate } from "@/src/domain/models/workout";
import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";

class InMemoryExerciseRepository implements ExerciseRepository {
  constructor(private readonly exercises: Exercise[]) {}
  findById(id: string) { return Promise.resolve(this.exercises.find((exercise) => exercise.id === id) ?? null); }
  findAll() { return Promise.resolve(this.exercises); }
  create() { return Promise.resolve(); }
  update() { return Promise.resolve(); }
  deleteById() { return Promise.resolve(); }
}

class InMemoryRoutineRepository implements RoutineRepository {
  readonly routines: RoutineTemplate[] = [];
  findById(id: string) { return Promise.resolve(this.routines.find((routine) => routine.id === id) ?? null); }
  findAll() { return Promise.resolve(this.routines); }
  create(routine: RoutineTemplate) { this.routines.push(routine); return Promise.resolve(); }
  update(routine: RoutineTemplate) {
    const index = this.routines.findIndex((savedRoutine) => savedRoutine.id === routine.id);
    if (index >= 0) this.routines[index] = routine;
    return Promise.resolve();
  }
  deleteById() { return Promise.resolve(); }
}

const exercise: Exercise = { id: "exercise-1", name: "Sentadilla", muscleGroup: "quadriceps", category: "squat" };
const input: RoutineInput = {
  name: "  Piernas  ", daysOfWeek: ["monday", "thursday"], notes: "  Técnica  ",
  exercises: [{ exerciseId: "exercise-1", targetSets: 4, targetReps: 8, restSeconds: 120 }],
};

function createService(routineRepository = new InMemoryRoutineRepository(), exercises = [exercise]) {
  let index = 0;
  return {
    routineRepository,
    service: new RoutineService(
      routineRepository,
      new InMemoryExerciseRepository(exercises),
      () => "routine-1",
      () => `template-${++index}`,
    ),
  };
}

describe("RoutineService", () => {
  it("validates name, selection, and positive targets", async () => {
    const { service } = createService();
    await expect(service.create({ ...input, name: "   " })).rejects.toThrow("nombre");
    await expect(service.create({ ...input, exercises: [] })).rejects.toThrow("ejercicio");
    await expect(service.create({ ...input, daysOfWeek: [] })).rejects.toThrow("día");
    await expect(service.create({ ...input, exercises: [{ ...input.exercises[0], targetSets: 0 }] })).rejects.toThrow("series");
  });

  it("rejects a missing exercise", async () => {
    const { service } = createService(undefined, []);
    await expect(service.create(input)).rejects.toThrow("no existe");
  });

  it("generates ids and persists a complete routine", async () => {
    const repository = new InMemoryRoutineRepository();
    const { service } = createService(repository);
    const created = await service.create(input);
    expect(created).toEqual({ id: "routine-1", name: "Piernas", daysOfWeek: ["monday", "thursday"], notes: "Técnica", exercises: [{ id: "template-1", exerciseId: "exercise-1", order: 0, targetSets: 4, targetReps: 8, restSeconds: 120 }] });
    expect(repository.routines).toEqual([created]);
  });

  it("lists routines from the repository", async () => {
    const repository = new InMemoryRoutineRepository();
    const { service } = createService(repository);
    const created = await service.create(input);
    expect(await service.list()).toEqual([created]);
  });

  it("updates an existing routine with validated data", async () => {
    const repository = new InMemoryRoutineRepository();
    const { service } = createService(repository);
    const created = await service.create(input);

    const updated = await service.update({
      id: created.id,
      name: "  Tren superior  ",
      daysOfWeek: ["friday"],
      notes: "  Controlar el ritmo  ",
      exercises: [{ exerciseId: "exercise-1", targetSets: 5, targetReps: 6, restSeconds: 90 }],
    });

    expect(updated).toMatchObject({ id: "routine-1", name: "Tren superior", daysOfWeek: ["friday"], notes: "Controlar el ritmo" });
    expect(repository.routines).toEqual([updated]);
  });

  it("rejects updating a missing routine", async () => {
    const { service } = createService();
    await expect(service.update({ ...input, id: "missing" })).rejects.toThrow("rutina no existe");
  });

  it("validates updated routine input", async () => {
    const repository = new InMemoryRoutineRepository();
    const { service } = createService(repository);
    const created = await service.create(input);

    await expect(service.update({ ...input, id: created.id, exercises: [{ ...input.exercises[0], targetReps: 0 }] })).rejects.toThrow("repeticiones");
    await expect(service.update({ ...input, id: created.id, exercises: [{ ...input.exercises[0], exerciseId: "missing" }] })).rejects.toThrow("no existe");
  });

  it("preserves the existing routine id during update", async () => {
    const repository = new InMemoryRoutineRepository();
    const { service } = createService(repository);
    const created = await service.create(input);

    const updated = await service.update({ ...input, id: created.id, name: "Nueva rutina" });

    expect(updated.id).toBe(created.id);
    expect(updated.id).not.toBe("routine-2");
  });
});
