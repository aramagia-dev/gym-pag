import type { EntityId, Exercise } from "@/src/domain/models/workout";

export interface ExerciseRepository {
  findById(id: EntityId): Promise<Exercise | null>;
  findAll(): Promise<Exercise[]>;
  create(exercise: Exercise): Promise<void>;
  update(exercise: Exercise): Promise<void>;
  deleteById(id: EntityId): Promise<void>;
}
