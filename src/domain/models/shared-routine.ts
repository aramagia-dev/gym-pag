import type {
  DayOfWeek,
  ExerciseCategory,
  ExerciseMode,
  MuscleGroup,
  SetType,
} from "@/src/domain/models/workout";

export interface SharedRoutineSet {
  reps: number;
  setType?: SetType;
  notes?: string;
  restSeconds?: number;
}

export interface SharedRoutineExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  category: ExerciseCategory;
  mode: ExerciseMode;
  order: number;
  sets: SharedRoutineSet[];
  restSeconds?: number;
}

export interface SharedRoutineSnapshot {
  sourceRoutineId: string;
  name: string;
  notes?: string;
  daysOfWeek: DayOfWeek[];
  exercises: SharedRoutineExercise[];
}

export interface SharedRoutineShare {
  id: string;
  groupId: string;
  publisherId: string;
  sourceRoutineId: string;
  snapshot: SharedRoutineSnapshot;
  publishedAt: string;
  revokedAt?: string;
}
