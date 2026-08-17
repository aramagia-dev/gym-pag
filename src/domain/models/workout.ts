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
  notes?: string;
  imageUrl?: string;
}

export interface TemplateExercise {
  id: EntityId;
  exerciseId: EntityId;
  order: number;
  targetSets: number;
  targetReps: number;
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
  if ("daysOfWeek" in routine) return routine;

  const { dayOfWeek, ...currentRoutine } = routine;
  return { ...currentRoutine, daysOfWeek: [dayOfWeek] };
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
  isCompleted: boolean;
}
