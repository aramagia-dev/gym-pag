import type { EntityId } from "@/src/domain/models/workout";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";

export interface ExerciseReferenceReader {
  isReferenced(exerciseId: EntityId): Promise<boolean>;
}

export class RepositoryExerciseReferenceReader implements ExerciseReferenceReader {
  constructor(
    private readonly routineRepository: RoutineRepository,
    private readonly workoutRepository: WorkoutRepository,
  ) {}

  async isReferenced(exerciseId: EntityId): Promise<boolean> {
    const routines = await this.routineRepository.findAll();
    if (routines.some((routine) => routine.exercises.some((exercise) => exercise.exerciseId === exerciseId))) {
      return true;
    }

    const sessions = await this.workoutRepository.findAllSessions();
    const sessionSets = await Promise.all(
      sessions.map((session) => this.workoutRepository.findSetsBySessionId(session.id)),
    );
    return sessionSets.flat().some((set) => set.exerciseId === exerciseId);
  }
}
