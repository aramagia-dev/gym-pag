import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { EntityId, Exercise } from "@/src/domain/models/workout";

export class SeededExerciseRepository implements ExerciseRepository {
  constructor(
    private readonly repository: ExerciseRepository,
    private readonly initialization: Promise<void>,
  ) {}

  async findById(id: EntityId): Promise<Exercise | null> {
    await this.initialization;
    return this.repository.findById(id);
  }

  async findAll(): Promise<Exercise[]> {
    await this.initialization;
    return this.repository.findAll();
  }

  async create(exercise: Exercise): Promise<void> {
    await this.initialization;
    return this.repository.create(exercise);
  }

  async update(exercise: Exercise): Promise<void> {
    await this.initialization;
    return this.repository.update(exercise);
  }

  async deleteById(id: EntityId): Promise<void> {
    await this.initialization;
    return this.repository.deleteById(id);
  }
}
