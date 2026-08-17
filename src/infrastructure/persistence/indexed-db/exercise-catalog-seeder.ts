import type { Exercise } from "@/src/domain/models/workout";

import { defaultExercises } from "./default-exercises";
import type { GymDatabase } from "./database";

const seedPromises = new WeakMap<GymDatabase, Promise<void>>();
const deprecatedDefaultExercises = [
  { id: "default-exercise-goblet-squat" },
  { id: "default-exercise-plank" },
  { id: "default-exercise-walking-lunge" },
  { id: "default-exercise-farmer-carry" },
] as const;
const previousOverheadPress = {
  id: "default-exercise-overhead-press",
  name: "Press militar",
  muscleGroup: "shoulders",
  category: "push",
  notes: "Evitar compensar con la zona lumbar.",
} as const;

export function seedDefaultExercises(db: GymDatabase): Promise<void> {
  const existingSeed = seedPromises.get(db);
  if (existingSeed) return existingSeed;

  const seedPromise = seedExercises(db, defaultExercises);
  seedPromises.set(db, seedPromise);
  return seedPromise;
}

async function seedExercises(db: GymDatabase, exercises: readonly Exercise[]): Promise<void> {
  await db.transaction("rw", db.exercises, db.routines, db.workoutSets, async () => {
    await migrateDeprecatedExercises(db);

    for (const exercise of exercises) {
      if (!(await db.exercises.get(exercise.id))) {
        await db.exercises.add(exercise);
      }
    }
  });
}

async function migrateDeprecatedExercises(db: GymDatabase): Promise<void> {
  const [routines, workoutSets] = await Promise.all([
    db.routines.toArray(),
    db.workoutSets.toArray(),
  ]);
  const referencedExerciseIds = new Set(workoutSets.map((set) => set.exerciseId));
  for (const routine of routines) {
    for (const exercise of routine.exercises) referencedExerciseIds.add(exercise.exerciseId);
  }

  for (const deprecatedExercise of deprecatedDefaultExercises) {
    if (!referencedExerciseIds.has(deprecatedExercise.id)) {
      await db.exercises.delete(deprecatedExercise.id);
    }
  }

  const existingOverheadPress = await db.exercises.get(previousOverheadPress.id);
  if (!existingOverheadPress || !isUntouchedPreviousDefault(existingOverheadPress)) return;

  const currentDefault = exercisesById().get(previousOverheadPress.id);
  if (currentDefault) {
    await db.exercises.put({ ...currentDefault, ...(existingOverheadPress.imageUrl ? { imageUrl: existingOverheadPress.imageUrl } : {}) });
  }
}

function isUntouchedPreviousDefault(exercise: Exercise): boolean {
  return exercise.name === previousOverheadPress.name
    && exercise.muscleGroup === previousOverheadPress.muscleGroup
    && exercise.category === previousOverheadPress.category
    && exercise.notes === previousOverheadPress.notes;
}

function exercisesById(): Map<string, Exercise> {
  return new Map(defaultExercises.map((exercise) => [exercise.id, exercise]));
}
