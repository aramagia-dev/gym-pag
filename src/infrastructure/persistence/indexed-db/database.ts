import Dexie, { type EntityTable } from "dexie";

import type {
  Exercise,
  PersistedRoutineTemplate,
  WorkoutSession,
  WorkoutSet,
} from "@/src/domain/models/workout";

export class GymDatabase extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  routines!: EntityTable<PersistedRoutineTemplate, "id">;
  workoutSessions!: EntityTable<WorkoutSession, "id">;
  workoutSets!: EntityTable<WorkoutSet, "id">;

  constructor() {
    super("gym-pag");

    this.version(1).stores({
      exercises: "id, name, muscleGroup, category",
      routines: "id, dayOfWeek",
      workoutSessions: "id, templateId, startTime, endTime",
      workoutSets: "id, sessionId, exerciseId, isCompleted",
    });
  }
}

export const database = new GymDatabase();
