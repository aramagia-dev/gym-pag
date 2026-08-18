import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Exercise, PersistedRoutineTemplate } from "@/src/domain/models/workout";
import { defaultExercises } from "@/src/infrastructure/persistence/indexed-db/default-exercises";
import { seedDefaultExercises } from "@/src/infrastructure/persistence/indexed-db/exercise-catalog-seeder";
import { GymDatabase } from "@/src/infrastructure/persistence/indexed-db/database";
import { ExerciseDexieRepository } from "@/src/infrastructure/persistence/indexed-db/exercise-dexie-repository";

describe("default exercise catalog seed", () => {
  let db: GymDatabase;

  beforeEach(() => {
    db = new GymDatabase();
  });

  afterEach(async () => {
    db.close();
    await db.delete();
  });

  it("inserts the curated defaults on the first run", async () => {
    await seedDefaultExercises(db);

    await expect(db.exercises.toArray()).resolves.toEqual(
      [...defaultExercises].sort((left, right) => left.id.localeCompare(right.id)),
    );
  });

  it("is a no-op on the second run", async () => {
    await seedDefaultExercises(db);
    const firstRun = await db.exercises.toArray();

    await seedDefaultExercises(db);

    await expect(db.exercises.toArray()).resolves.toEqual(firstRun);
  });

  it("contains the requested final default catalog", async () => {
    await seedDefaultExercises(db);

    const exercises = await db.exercises.toArray();
    expect(exercises).toHaveLength(16);
    expect(exercises.map((exercise) => exercise.name)).toEqual(expect.arrayContaining([
      "Press militar con barra",
      "Dominadas supinas",
      "Press francés",
    ]));
    expect(exercises.map((exercise) => exercise.name)).not.toEqual(expect.arrayContaining([
      "Paseo del granjero",
      "Sentadilla goblet",
      "Plancha abdominal",
      "Zancadas caminando",
    ]));
  });

  it("migrates an existing database and removes unreferenced deprecated defaults", async () => {
    await db.exercises.bulkAdd([
      { id: "default-exercise-farmer-carry", name: "Paseo del granjero", muscleGroup: "forearms", category: "carry", notes: "legacy" },
      { id: "default-exercise-overhead-press", name: "Press militar", muscleGroup: "shoulders", category: "push", notes: "Evitar compensar con la zona lumbar." },
    ]);

    await seedDefaultExercises(db);

    await expect(db.exercises.get("default-exercise-farmer-carry")).resolves.toBeUndefined();
    await expect(db.exercises.get("default-exercise-overhead-press")).resolves.toMatchObject({ name: "Press militar con barra" });
    await expect(db.exercises.get("default-exercise-supinated-pull-up")).resolves.toMatchObject({ name: "Dominadas supinas" });
  });

  it("preserves deprecated defaults referenced by routines or workout sets", async () => {
    await db.exercises.bulkAdd([
      { id: "default-exercise-farmer-carry", name: "Paseo del granjero", muscleGroup: "forearms", category: "carry" },
      { id: "default-exercise-plank", name: "Plancha abdominal", muscleGroup: "core", category: "carry" },
    ]);
    const routine: PersistedRoutineTemplate = {
      id: "routine-1",
      name: "Rutina histórica",
      dayOfWeek: "monday",
      exercises: [{ id: "template-exercise-1", exerciseId: "default-exercise-farmer-carry", order: 0, targetSets: 3, targetReps: 10 }],
    };
    await db.routines.add(routine);
    await db.workoutSets.add({
      id: "set-1",
      sessionId: "session-1",
      exerciseId: "default-exercise-plank",
      setNumber: 1,
      setType: "working",
      weight: 0,
      reps: 30,
      isCompleted: true,
    });

    await seedDefaultExercises(db);

    await expect(db.exercises.get("default-exercise-farmer-carry")).resolves.toBeDefined();
    await expect(db.exercises.get("default-exercise-plank")).resolves.toBeDefined();
  });

  it("renames an untouched press while preserving its image", async () => {
    await db.exercises.add({
      id: "default-exercise-overhead-press",
      name: "Press militar",
      muscleGroup: "shoulders",
      category: "push",
      mode: "weighted",
      notes: "Evitar compensar con la zona lumbar.",
      imageUrl: "data:image/png;base64,abc123",
    });

    await seedDefaultExercises(db);

    await expect(db.exercises.get("default-exercise-overhead-press")).resolves.toEqual({
      id: "default-exercise-overhead-press",
      name: "Press militar con barra",
      muscleGroup: "shoulders",
      category: "push",
      mode: "weighted",
      notes: "Evitar compensar con la zona lumbar.",
      imageUrl: "data:image/png;base64,abc123",
    });
  });

  it("does not overwrite a customized press", async () => {
    const customized = {
      id: "default-exercise-overhead-press",
      name: "Press militar personalizado",
      muscleGroup: "shoulders" as const,
      category: "push" as const,
      notes: "Mi técnica",
    };
    await db.exercises.add(customized);

    await seedDefaultExercises(db);

    await expect(db.exercises.get(customized.id)).resolves.toEqual(customized);
  });

  it("preserves existing user data with a seeded id", async () => {
    const userExercise: Exercise = {
      ...defaultExercises[0],
      name: "Mi sentadilla personalizada",
      notes: "No modificar",
    };
    await db.exercises.add(userExercise);

    await seedDefaultExercises(db);

    await expect(db.exercises.get(userExercise.id)).resolves.toEqual(userExercise);
  });

  it("contains only valid exercises without image data", () => {
    for (const exercise of defaultExercises) {
      expect(exercise satisfies Exercise).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        muscleGroup: expect.any(String),
        category: expect.any(String),
      }));
      expect(exercise).not.toHaveProperty("imageUrl");
    }
  });

  it("serializes repeated initialization for the same database", async () => {
    await Promise.all([seedDefaultExercises(db), seedDefaultExercises(db)]);

    expect((await new ExerciseDexieRepository(db).findAll())).toHaveLength(defaultExercises.length);
  });
});
