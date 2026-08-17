import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Exercise } from "@/src/domain/models/workout";
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
