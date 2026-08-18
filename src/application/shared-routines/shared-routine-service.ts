import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type {
  SharedRoutineExercise,
  SharedRoutineSet,
  SharedRoutineShare,
  SharedRoutineSnapshot,
} from "@/src/domain/models/shared-routine";
import type { RoutineTemplate, TemplateSet } from "@/src/domain/models/workout";
import type { SharedRoutineRepository } from "@/src/domain/repositories/shared-routine-repository";

const MAX_SNAPSHOT_BYTES = 100_000;
const MAX_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 2_000;

export function sanitizeSharedRoutineSnapshot(snapshot: SharedRoutineSnapshot): SharedRoutineSnapshot {
  const sanitized: SharedRoutineSnapshot = {
    sourceRoutineId: snapshot.sourceRoutineId,
    name: snapshot.name.trim().slice(0, MAX_NAME_LENGTH),
    daysOfWeek: [...snapshot.daysOfWeek],
    exercises: snapshot.exercises
      .map((exercise) => ({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName.trim().slice(0, MAX_NAME_LENGTH),
        muscleGroup: exercise.muscleGroup,
        category: exercise.category,
        mode: exercise.mode,
        order: exercise.order,
        sets: exercise.sets.map((set) => ({
          reps: set.reps,
          ...(set.setType ? { setType: set.setType } : {}),
          ...(set.notes?.trim() ? { notes: set.notes.trim().slice(0, 500) } : {}),
          ...(set.restSeconds === undefined ? {} : { restSeconds: set.restSeconds }),
        })),
        ...(exercise.restSeconds === undefined ? {} : { restSeconds: exercise.restSeconds }),
      }))
      .sort((left, right) => left.order - right.order),
    ...(snapshot.notes?.trim() ? { notes: snapshot.notes.trim().slice(0, MAX_NOTES_LENGTH) } : {}),
  };

  if (!sanitized.sourceRoutineId || !sanitized.name || sanitized.exercises.length === 0) {
    throw new Error("La instantánea de la rutina no es válida.");
  }
  if (new TextEncoder().encode(JSON.stringify(sanitized)).byteLength > MAX_SNAPSHOT_BYTES) {
    throw new Error("La instantánea de la rutina es demasiado grande.");
  }
  return sanitized;
}

function sharedSet(set: TemplateSet): SharedRoutineSet {
  return {
    reps: set.reps,
    ...(set.setType ? { setType: set.setType } : {}),
    ...(set.notes?.trim() ? { notes: set.notes } : {}),
    ...(set.restSeconds === undefined ? {} : { restSeconds: set.restSeconds }),
  };
}

export async function buildSharedRoutineSnapshot(
  routine: RoutineTemplate,
  exerciseRepository: ExerciseRepository,
): Promise<SharedRoutineSnapshot> {
  const exercises: SharedRoutineExercise[] = [];
  for (const templateExercise of [...routine.exercises].sort((left, right) => left.order - right.order)) {
    const exercise = await exerciseRepository.findById(templateExercise.exerciseId);
    if (!exercise) throw new Error("No se puede compartir una rutina con ejercicios inexistentes.");
    exercises.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      category: exercise.category,
      mode: exercise.mode,
      order: templateExercise.order,
      sets: (templateExercise.sets ?? []).map(sharedSet),
      ...(templateExercise.restSeconds === undefined ? {} : { restSeconds: templateExercise.restSeconds }),
    });
  }
  return sanitizeSharedRoutineSnapshot({
    sourceRoutineId: routine.id,
    name: routine.name,
    notes: routine.notes,
    daysOfWeek: routine.daysOfWeek,
    exercises,
  });
}

export class SharedRoutineService {
  constructor(
    private readonly routineRepository: RoutineRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly sharedRoutineRepository: SharedRoutineRepository,
  ) {}

  list(): Promise<SharedRoutineShare[]> {
    return this.sharedRoutineRepository.list();
  }

  async publish(routineId: string, groupId: string): Promise<SharedRoutineShare> {
    const routine = await this.routineRepository.findById(routineId);
    if (!routine) throw new Error("La rutina no existe.");
    return this.sharedRoutineRepository.publish(groupId, await buildSharedRoutineSnapshot(routine, this.exerciseRepository));
  }

  revoke(shareId: string): Promise<void> {
    return this.sharedRoutineRepository.revoke(shareId);
  }
}
