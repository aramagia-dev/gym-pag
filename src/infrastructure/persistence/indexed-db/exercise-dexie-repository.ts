import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { EntityId, Exercise } from "@/src/domain/models/workout";
import { database, type GymDatabase } from "./database";

export class ExerciseDexieRepository implements ExerciseRepository {
  constructor(private readonly db: GymDatabase = database) {}

  findById(id: EntityId): Promise<Exercise | null> {
    return this.db.exercises.get(id).then((exercise) => exercise ?? null);
  }

  findAll(): Promise<Exercise[]> {
    return this.db.exercises.toArray();
  }

  async create(exercise: Exercise): Promise<void> {
    await this.db.exercises.put(exercise);
  }

  async update(exercise: Exercise): Promise<void> {
    await this.db.exercises.put(exercise);
  }

  async deleteById(id: EntityId): Promise<void> {
    await this.db.exercises.delete(id);
  }
}
