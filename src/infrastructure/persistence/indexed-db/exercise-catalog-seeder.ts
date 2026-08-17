import type { Exercise } from "@/src/domain/models/workout";

import { defaultExercises } from "./default-exercises";
import type { GymDatabase } from "./database";

const seedPromises = new WeakMap<GymDatabase, Promise<void>>();

export function seedDefaultExercises(db: GymDatabase): Promise<void> {
  const existingSeed = seedPromises.get(db);
  if (existingSeed) return existingSeed;

  const seedPromise = seedExercises(db, defaultExercises);
  seedPromises.set(db, seedPromise);
  return seedPromise;
}

async function seedExercises(db: GymDatabase, exercises: readonly Exercise[]): Promise<void> {
  await db.transaction("rw", db.exercises, async () => {
    for (const exercise of exercises) {
      if (!(await db.exercises.get(exercise.id))) {
        await db.exercises.add(exercise);
      }
    }
  });
}
