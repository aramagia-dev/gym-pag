export type EntityId = string;

export type ISODateString = string;

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "glutes"
  | "quadriceps"
  | "hamstrings"
  | "calves";

export type ExerciseCategory =
  | "push"
  | "pull"
  | "hinge"
  | "squat"
  | "lunge"
  | "carry"
  | "rotation"
  | "isolation";

export type ExerciseMode = "weighted" | "bodyweight";

export type SetType =
  | "warm-up"
  | "working"
  | "top-set"
  | "back-off"
  | "drop-set";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Exercise {
  id: EntityId;
  name: string;
  muscleGroup: MuscleGroup;
  category: ExerciseCategory;
  mode: ExerciseMode;
  notes?: string;
  imageUrl?: string;
}

export type PersistedExercise = Omit<Exercise, "mode"> & { mode?: ExerciseMode };

export function normalizeExercise(exercise: PersistedExercise): Exercise {
  return { ...exercise, mode: exercise.mode ?? "weighted" };
}

export interface TemplateExercise {
  id: EntityId;
  exerciseId: EntityId;
  order: number;
  targetSets: number;
  targetReps: number;
  sets?: TemplateSet[];
  startingWeightKg?: number;
  restSeconds?: number;
}

export interface TemplateSet {
  reps: number;
  setType?: SetType;
  notes?: string;
  restSeconds?: number;
}

export interface RoutineTemplate {
  id: EntityId;
  name: string;
  daysOfWeek: DayOfWeek[];
  exercises: TemplateExercise[];
  notes?: string;
}

export type PersistedRoutineTemplate =
  | RoutineTemplate
  | (Omit<RoutineTemplate, "daysOfWeek"> & { dayOfWeek: DayOfWeek });

export function normalizeRoutineTemplate(
  routine: PersistedRoutineTemplate,
): RoutineTemplate {
  const normalizedExercises = routine.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets?.length
      ? exercise.sets.map((set) => ({
        reps: set.reps,
        ...(set.setType ? { setType: set.setType } : {}),
        ...(set.notes ? { notes: set.notes } : {}),
        ...(set.restSeconds === undefined ? {} : { restSeconds: set.restSeconds }),
      }))
      : Array.from({ length: exercise.targetSets }, () => ({ reps: exercise.targetReps })),
  }));
  if ("daysOfWeek" in routine) return { ...routine, exercises: normalizedExercises };

  const { dayOfWeek, ...currentRoutine } = routine;
  return { ...currentRoutine, exercises: normalizedExercises, daysOfWeek: [dayOfWeek] };
}

export interface WorkoutSession {
  id: EntityId;
  templateId?: EntityId;
  startTime: ISODateString;
  endTime?: ISODateString;
  exerciseOrder?: EntityId[];
  notes?: string;
}

export interface WorkoutSet {
  id: EntityId;
  sessionId: EntityId;
  exerciseId: EntityId;
  setNumber: number;
  setType: SetType;
  weight: number;
  reps: number;
  rir?: number;
  notes?: string;
  isCompleted: boolean;
}
