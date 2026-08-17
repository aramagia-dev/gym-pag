import { describe, expect, it } from "vitest";

import type { Exercise, RoutineTemplate, WorkoutSet } from "@/src/domain/models/workout";
import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { ExerciseReferenceReader } from "@/src/application/exercises/exercise-reference-reader";
import {
  ExerciseCatalogService,
  type ExerciseInput,
} from "@/src/application/exercises/exercise-catalog-service";

class InMemoryExerciseRepository implements ExerciseRepository {
  private readonly exercises = new Map<string, Exercise>();

  findById(id: string): Promise<Exercise | null> {
    return Promise.resolve(this.exercises.get(id) ?? null);
  }

  findAll(): Promise<Exercise[]> {
    return Promise.resolve([...this.exercises.values()]);
  }

  create(exercise: Exercise): Promise<void> {
    this.exercises.set(exercise.id, exercise);
    return Promise.resolve();
  }

  update(exercise: Exercise): Promise<void> {
    this.exercises.set(exercise.id, exercise);
    return Promise.resolve();
  }

  deleteById(id: string): Promise<void> {
    this.exercises.delete(id);
    return Promise.resolve();
  }
}

class InMemoryExerciseReferenceReader implements ExerciseReferenceReader {
  constructor(
    private readonly routines: RoutineTemplate[] = [],
    private readonly sets: WorkoutSet[] = [],
  ) {}

  isReferenced(exerciseId: string): Promise<boolean> {
    const usedInRoutine = this.routines.some((routine) =>
      routine.exercises.some((exercise) => exercise.exerciseId === exerciseId),
    );
    return Promise.resolve(usedInRoutine || this.sets.some((set) => set.exerciseId === exerciseId));
  }
}

const benchPress: ExerciseInput = {
  name: "  Bench press  ",
  muscleGroup: "chest",
  category: "push",
  notes: "Use a controlled eccentric.",
};

describe("ExerciseCatalogService", () => {
  it("creates an exercise with a generated id and trimmed name", async () => {
    const repository = new InMemoryExerciseRepository();
    const service = new ExerciseCatalogService(repository, () => "exercise-1");

    const created = await service.create(benchPress);

    expect(created).toEqual({
      ...benchPress,
      id: "exercise-1",
      name: "Bench press",
    });
    expect(await repository.findById("exercise-1")).toEqual(created);
  });

  it("persists an optional image on create and update", async () => {
    const repository = new InMemoryExerciseRepository();
    const service = new ExerciseCatalogService(repository, () => "exercise-1");
    const imageUrl = "data:image/png;base64,ZmFrZQ==";

    const created = await service.create({ ...benchPress, imageUrl });
    const updated = await service.update({
      ...created,
      name: "  Incline bench press ",
    });

    expect(created.imageUrl).toBe(imageUrl);
    expect(updated.imageUrl).toBe(imageUrl);
    expect((await repository.findById("exercise-1"))?.imageUrl).toBe(imageUrl);
  });

  it("clears an image when the update receives an empty value", async () => {
    const repository = new InMemoryExerciseRepository();
    const service = new ExerciseCatalogService(repository, () => "exercise-1");
    const created = await service.create({
      ...benchPress,
      imageUrl: "https://example.com/bench.png",
    });

    const updated = await service.update({ ...created, imageUrl: "   " });

    expect(updated).not.toHaveProperty("imageUrl");
    expect(await repository.findById("exercise-1")).toEqual(updated);
  });

  it("rejects an empty name after trimming", async () => {
    const service = new ExerciseCatalogService(
      new InMemoryExerciseRepository(),
      () => "exercise-1",
    );

    await expect(service.create({ ...benchPress, name: "   " })).rejects.toThrow(
      "El nombre del ejercicio no puede estar vacío.",
    );
  });

  it("updates an exercise and trims the new name", async () => {
    const repository = new InMemoryExerciseRepository();
    const service = new ExerciseCatalogService(repository, () => "exercise-1");
    const created = await service.create(benchPress);

    const updated = await service.update({
      ...created,
      name: "  Incline bench press ",
      notes: undefined,
    });

    expect(updated).toEqual({
      id: "exercise-1",
      name: "Incline bench press",
      muscleGroup: "chest",
      category: "push",
      notes: undefined,
    });
    expect(await repository.findById("exercise-1")).toEqual(updated);
  });

  it("lists exercises from the repository", async () => {
    const repository = new InMemoryExerciseRepository();
    const service = new ExerciseCatalogService(repository, () => "exercise-1");
    const created = await service.create(benchPress);

    expect(await service.list()).toEqual([created]);
  });

  it("deletes an exercise by id", async () => {
    const repository = new InMemoryExerciseRepository();
    const service = new ExerciseCatalogService(repository, () => "exercise-1");
    await service.create(benchPress);

    await service.delete("exercise-1");

    expect(await repository.findById("exercise-1")).toBeNull();
  });

  it("rejects deleting an exercise referenced by a routine", async () => {
    const repository = new InMemoryExerciseRepository();
    const service = new ExerciseCatalogService(
      repository,
      () => "exercise-1",
      new InMemoryExerciseReferenceReader([{
        id: "routine-1",
        name: "Fuerza",
        daysOfWeek: ["monday"],
        exercises: [{ id: "template-1", exerciseId: "exercise-1", order: 0, targetSets: 3, targetReps: 8 }],
      }]),
    );
    const created = await service.create(benchPress);

    await expect(service.delete(created.id)).rejects.toThrow(
      "No se puede eliminar el ejercicio porque está siendo usado en rutinas o en el historial de entrenamientos.",
    );
    expect(await repository.findById(created.id)).toEqual(created);
  });

  it("rejects deleting an exercise referenced by a historical workout set", async () => {
    const repository = new InMemoryExerciseRepository();
    const service = new ExerciseCatalogService(
      repository,
      () => "exercise-1",
      new InMemoryExerciseReferenceReader([], [{
        id: "set-1",
        sessionId: "historical-session",
        exerciseId: "exercise-1",
        setNumber: 1,
        setType: "working",
        weight: 50,
        reps: 8,
        isCompleted: true,
      }]),
    );
    const created = await service.create(benchPress);

    await expect(service.delete(created.id)).rejects.toThrow(
      "No se puede eliminar el ejercicio porque está siendo usado en rutinas o en el historial de entrenamientos.",
    );
    expect(await repository.findById(created.id)).toEqual(created);
  });
});
