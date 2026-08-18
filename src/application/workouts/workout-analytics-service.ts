import type { Exercise, RoutineTemplate, WorkoutSession, WorkoutSet } from "@/src/domain/models/workout";
import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";

export type WorkoutProgressStatus = "completed" | "in-progress";

export interface WorkoutHistoryEntry {
  session: WorkoutSession;
  routineName: string;
  completedSets: number;
  totalSets: number;
  completedVolumeKg: number;
  status: WorkoutProgressStatus;
}

export interface VolumeOverTimePoint {
  date: string;
  volumeKg: number;
}

export interface VolumeByExercisePoint {
  exerciseId: string;
  exerciseName: string;
  volumeKg: number;
}

export interface WorkoutDashboardMetrics {
  summary: {
    sessions: number;
    completedSets: number;
    totalVolumeKg: number;
    averageVolumeKg: number;
  };
  volumeOverTime: VolumeOverTimePoint[];
  volumeByExercise: VolumeByExercisePoint[];
}

export class WorkoutAnalyticsService {
  constructor(
    private readonly workoutRepository: WorkoutRepository,
    private readonly routineRepository: RoutineRepository,
    private readonly exerciseRepository: ExerciseRepository,
  ) {}

  async getHistory(): Promise<WorkoutHistoryEntry[]> {
    const [sessions, routines, exercises] = await Promise.all([
      this.workoutRepository.findAllSessions(),
      this.routineRepository.findAll(),
      this.exerciseRepository.findAll(),
    ]);
    const routinesById = new Map(routines.map((routine) => [routine.id, routine]));
    const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    const entries = await Promise.all(sessions.map(async (session) =>
      this.toHistoryEntry(session, routinesById.get(session.templateId ?? ""), exercisesById),
    ));
    return entries.sort((left, right) => right.session.startTime.localeCompare(left.session.startTime));
  }

  async getDashboardMetrics(): Promise<WorkoutDashboardMetrics> {
    const [sessions, exercises] = await Promise.all([
      this.workoutRepository.findAllSessions(),
      this.exerciseRepository.findAll(),
    ]);
    const completedSessions = sessions.filter((session) => Boolean(session.endTime));
    const exerciseNames = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
    const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    const sessionSets = await Promise.all(completedSessions.map((session) =>
      this.workoutRepository.findSetsBySessionId(session.id),
    ));
    const allCompletedSets = sessionSets.flat().filter((set) => set.isCompleted);
    const totalVolumeKg = allCompletedSets.reduce((total, set) => total + this.volumeOf(set, exercisesById), 0);
    const volumeByDate = new Map<string, number>();
    const volumeByExercise = new Map<string, number>();
    completedSessions.forEach((session, index) => {
       const volume = sessionSets[index].filter((set) => set.isCompleted).reduce((total, set) => total + this.volumeOf(set, exercisesById), 0);
      const date = session.startTime.slice(0, 10);
      volumeByDate.set(date, (volumeByDate.get(date) ?? 0) + volume);
    });
    allCompletedSets.forEach((set) => volumeByExercise.set(set.exerciseId, (volumeByExercise.get(set.exerciseId) ?? 0) + this.volumeOf(set, exercisesById)));

    return {
      summary: {
        sessions: completedSessions.length,
        completedSets: allCompletedSets.length,
        totalVolumeKg,
        averageVolumeKg: completedSessions.length ? totalVolumeKg / completedSessions.length : 0,
      },
      volumeOverTime: [...volumeByDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, volumeKg]) => ({ date, volumeKg })),
      volumeByExercise: [...volumeByExercise.entries()].sort(([, left], [, right]) => right - left).map(([exerciseId, volumeKg]) => ({ exerciseId, exerciseName: exerciseNames.get(exerciseId) ?? "Ejercicio", volumeKg })),
    };
  }

  private async toHistoryEntry(session: WorkoutSession, routine: RoutineTemplate | undefined, exercisesById: Map<string, Exercise>): Promise<WorkoutHistoryEntry> {
    const sets = await this.workoutRepository.findSetsBySessionId(session.id);
    const completedSets = sets.filter((set) => set.isCompleted);
    return {
      session,
      routineName: routine?.name || "Entrenamiento libre",
      completedSets: completedSets.length,
      totalSets: sets.length,
      completedVolumeKg: completedSets.reduce((total, set) => total + this.volumeOf(set, exercisesById), 0),
      status: session.endTime ? "completed" : "in-progress",
    };
  }

  private volumeOf(set: WorkoutSet, exercisesById: Map<string, Exercise>): number {
    const mode = exercisesById.get(set.exerciseId)?.mode ?? "weighted";
    return mode === "bodyweight" && set.weight === 0 ? 0 : set.weight * set.reps;
  }
}
