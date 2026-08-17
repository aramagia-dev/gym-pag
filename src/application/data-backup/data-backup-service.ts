import type {
  Exercise,
  PersistedRoutineTemplate,
  WorkoutSession,
  WorkoutSet,
} from "@/src/domain/models/workout";

export const BACKUP_VERSION = 1 as const;

export interface BackupDocument {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  exercises: Exercise[];
  routines: PersistedRoutineTemplate[];
  workoutSessions: WorkoutSession[];
  workoutSets: WorkoutSet[];
}

export type BackupCollections = Omit<BackupDocument, "version" | "exportedAt">;

export interface BackupRepository {
  readAll(): Promise<BackupCollections>;
  replaceAll(collections: BackupCollections): Promise<void>;
}

const muscleGroups = new Set([
  "chest", "back", "shoulders", "biceps", "triceps", "forearms", "core", "glutes", "quadriceps", "hamstrings", "calves",
]);
const categories = new Set(["push", "pull", "hinge", "squat", "lunge", "carry", "rotation", "isolation"]);
const days = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
const setTypes = new Set(["warm-up", "working", "top-set", "back-off", "drop-set"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateExercise(value: unknown): value is Exercise {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return false;
  if (typeof value.muscleGroup !== "string" || !muscleGroups.has(value.muscleGroup) || typeof value.category !== "string" || !categories.has(value.category)) return false;
  return (value.notes === undefined || typeof value.notes === "string") &&
    (value.imageUrl === undefined || typeof value.imageUrl === "string");
}

function validateTemplateExercise(value: unknown): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.exerciseId)) return false;
  return isInteger(value.order) && isInteger(value.targetSets) && value.targetSets > 0 &&
    isInteger(value.targetReps) && value.targetReps > 0 &&
    (value.restSeconds === undefined || (isInteger(value.restSeconds) && value.restSeconds >= 0));
}

function validateRoutine(value: unknown): value is PersistedRoutineTemplate {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return false;
  const hasCurrentDays = Array.isArray(value.daysOfWeek) && value.daysOfWeek.every((day) => typeof day === "string" && days.has(day));
  const hasLegacyDay = typeof value.dayOfWeek === "string" && days.has(value.dayOfWeek);
  if (!hasCurrentDays && !hasLegacyDay) return false;
  if (!Array.isArray(value.exercises) || !value.exercises.every(validateTemplateExercise)) return false;
  return value.notes === undefined || typeof value.notes === "string";
}

function validateSession(value: unknown): value is WorkoutSession {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isIsoDate(value.startTime)) return false;
  return (value.templateId === undefined || isNonEmptyString(value.templateId)) &&
    (value.endTime === undefined || isIsoDate(value.endTime)) &&
    (value.exerciseOrder === undefined || (Array.isArray(value.exerciseOrder) && value.exerciseOrder.every(isNonEmptyString))) &&
    (value.notes === undefined || typeof value.notes === "string");
}

function validateSet(value: unknown): value is WorkoutSet {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.sessionId) || !isNonEmptyString(value.exerciseId)) return false;
  return isInteger(value.setNumber) && value.setNumber > 0 && typeof value.setType === "string" && setTypes.has(value.setType) &&
    isFiniteNumber(value.weight) && value.weight >= 0 && isFiniteNumber(value.reps) && value.reps >= 0 &&
    typeof value.isCompleted === "boolean" &&
    (value.rir === undefined || (isFiniteNumber(value.rir) && value.rir >= 0));
}

function hasDuplicateIds(values: Array<{ id: string }>): boolean {
  return new Set(values.map((value) => value.id)).size !== values.length;
}

export function validateBackupDocument(value: unknown): value is BackupDocument {
  if (!isRecord(value) || value.version !== BACKUP_VERSION || !isIsoDate(value.exportedAt)) return false;
  if (!Array.isArray(value.exercises) || !value.exercises.every(validateExercise) ||
    !Array.isArray(value.routines) || !value.routines.every(validateRoutine) ||
    !Array.isArray(value.workoutSessions) || !value.workoutSessions.every(validateSession) ||
    !Array.isArray(value.workoutSets) || !value.workoutSets.every(validateSet)) return false;

  const exercises = value.exercises as Exercise[];
  const routines = value.routines as PersistedRoutineTemplate[];
  const sessions = value.workoutSessions as WorkoutSession[];
  const sets = value.workoutSets as WorkoutSet[];
  if (hasDuplicateIds(exercises) || hasDuplicateIds(routines) || hasDuplicateIds(sessions) || hasDuplicateIds(sets)) return false;

  const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const routineIds = new Set(routines.map((routine) => routine.id));
  for (const routine of routines) {
    if (hasDuplicateIds(routine.exercises) || routine.exercises.some((exercise) => !exerciseIds.has(exercise.exerciseId))) return false;
  }

  for (const session of sessions) {
    if (session.templateId !== undefined && !routineIds.has(session.templateId)) return false;
    if (session.exerciseOrder && (new Set(session.exerciseOrder).size !== session.exerciseOrder.length)) return false;
    if (session.exerciseOrder) {
      const sessionExerciseIds = new Set(sets.filter((set) => set.sessionId === session.id).map((set) => set.exerciseId));
      if (session.exerciseOrder.some((exerciseId) => !sessionExerciseIds.has(exerciseId))) return false;
    }
  }

  return sets.every((set) => sessionIds.has(set.sessionId) && exerciseIds.has(set.exerciseId));
}

export function serializeBackupDocument(document: BackupDocument): string {
  if (!validateBackupDocument(document)) throw new Error("El documento de respaldo no tiene un formato válido.");
  return JSON.stringify(document, null, 2);
}

export function parseBackupDocument(json: string): BackupDocument {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("El archivo no contiene JSON válido.");
  }
  if (!validateBackupDocument(value)) throw new Error("El archivo no es un respaldo válido de Gym Pag o usa una versión incompatible.");
  return value;
}

export class DataBackupService {
  constructor(
    private readonly repository: BackupRepository,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async exportJson(): Promise<string> {
    const collections = await this.repository.readAll();
    return serializeBackupDocument({ version: BACKUP_VERSION, exportedAt: this.clock(), ...collections });
  }

  async importJson(json: string): Promise<void> {
    const document = parseBackupDocument(json);
    await this.repository.replaceAll({
      exercises: document.exercises,
      routines: document.routines,
      workoutSessions: document.workoutSessions,
      workoutSets: document.workoutSets,
    });
  }
}
