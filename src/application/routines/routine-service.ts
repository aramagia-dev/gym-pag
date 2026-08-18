import type {
  DayOfWeek,
  EntityId,
  RoutineTemplate,
  TemplateSet,
  TemplateExercise,
} from "@/src/domain/models/workout";
import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";

export interface RoutineExerciseInput {
  exerciseId: EntityId;
  targetSets?: number;
  targetReps?: number;
  sets?: TemplateSet[];
  startingWeightKg?: number;
  restSeconds?: number;
}

export interface RoutineInput {
  name: string;
  daysOfWeek: DayOfWeek[];
  notes?: string;
  exercises: RoutineExerciseInput[];
}

export type RoutineUpdateInput = RoutineInput & { id: EntityId };

export type RoutineIdGenerator = () => EntityId;

const defaultRoutineIdGenerator: RoutineIdGenerator = () => crypto.randomUUID();
const defaultTemplateExerciseIdGenerator: RoutineIdGenerator = () => crypto.randomUUID();

export class RoutineService {
  constructor(
    private readonly routineRepository: RoutineRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly routineIdGenerator: RoutineIdGenerator = defaultRoutineIdGenerator,
    private readonly templateExerciseIdGenerator: RoutineIdGenerator = defaultTemplateExerciseIdGenerator,
    private readonly workoutRepository?: WorkoutRepository,
  ) {}

  list(): Promise<RoutineTemplate[]> {
    return this.routineRepository.findAll();
  }

  get(id: EntityId): Promise<RoutineTemplate | null> {
    return this.routineRepository.findById(id);
  }

  async delete(id: EntityId): Promise<void> {
    if (!(await this.routineRepository.findById(id))) {
      throw new Error("La rutina no existe.");
    }

    if (!this.workoutRepository) {
      throw new Error("No se puede verificar el historial de entrenamientos.");
    }

    const sessions = await this.workoutRepository.findAllSessions();
    if (sessions.some((session) => session.templateId === id)) {
      throw new Error("No se puede eliminar una rutina utilizada en el historial de entrenamientos.");
    }

    await this.routineRepository.deleteById(id);
  }

  async create(input: RoutineInput): Promise<RoutineTemplate> {
    const routine = await this.buildRoutine(input, this.routineIdGenerator());

    await this.routineRepository.create(routine);
    return routine;
  }

  async update(input: RoutineUpdateInput): Promise<RoutineTemplate> {
    const existingRoutine = await this.routineRepository.findById(input.id);
    if (!existingRoutine) throw new Error("La rutina no existe.");

    const routine = await this.buildRoutine(input, existingRoutine.id);
    await this.routineRepository.update(routine);
    return routine;
  }

  private async buildRoutine(input: RoutineInput, id: EntityId): Promise<RoutineTemplate> {
    const name = input.name.trim();
    if (name.length === 0) throw new Error("El nombre de la rutina no puede estar vacío.");
    if (input.daysOfWeek.length === 0) throw new Error("Seleccione al menos un día.");
    if (input.exercises.length === 0) throw new Error("Seleccione al menos un ejercicio.");

    for (const selectedExercise of input.exercises) {
      let sets: TemplateSet[];
      if (selectedExercise.sets?.length) {
        sets = selectedExercise.sets;
      } else {
        const targetSets = selectedExercise.targetSets;
        const targetReps = selectedExercise.targetReps;
        if (typeof targetSets !== "number" || !Number.isInteger(targetSets) || targetSets <= 0) {
          throw new Error("Las series objetivo deben ser mayores que cero.");
        }
        if (typeof targetReps !== "number" || !Number.isInteger(targetReps) || targetReps <= 0) {
          throw new Error("Las repeticiones objetivo deben ser mayores que cero.");
        }
        sets = Array.from({ length: targetSets }, () => ({ reps: targetReps }));
      }
      if (sets.some((set) => !Number.isInteger(set.reps) || set.reps <= 0)) {
        throw new Error("Las repeticiones objetivo deben ser mayores que cero.");
      }
      if (selectedExercise.startingWeightKg !== undefined &&
        (!Number.isFinite(selectedExercise.startingWeightKg) || selectedExercise.startingWeightKg < 0)) {
        throw new Error("El peso inicial no puede ser negativo.");
      }
      if (selectedExercise.restSeconds !== undefined && (!Number.isInteger(selectedExercise.restSeconds) || selectedExercise.restSeconds < 0)) {
        throw new Error("El descanso no puede ser negativo.");
      }
      if (!(await this.exerciseRepository.findById(selectedExercise.exerciseId))) {
        throw new Error("Uno de los ejercicios seleccionados ya no existe.");
      }
    }

    const exercises: TemplateExercise[] = input.exercises.map((selectedExercise, order) => {
      const sets = selectedExercise.sets?.length
        ? selectedExercise.sets.map((set) => ({
          reps: set.reps,
          ...(set.setType ? { setType: set.setType } : {}),
          ...(set.notes ? { notes: set.notes } : {}),
          ...(set.restSeconds === undefined ? {} : { restSeconds: set.restSeconds }),
        }))
        : Array.from({ length: selectedExercise.targetSets! }, () => ({ reps: selectedExercise.targetReps! }));
      return {
      id: this.templateExerciseIdGenerator(),
      exerciseId: selectedExercise.exerciseId,
      order,
      targetSets: sets.length,
      targetReps: sets[0].reps,
      sets,
      ...(selectedExercise.startingWeightKg === undefined ? {} : { startingWeightKg: selectedExercise.startingWeightKg }),
      ...(selectedExercise.restSeconds === undefined
        ? {}
        : { restSeconds: selectedExercise.restSeconds }),
      };
    });
    return {
      id,
      name,
      daysOfWeek: [...input.daysOfWeek],
      exercises,
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    };
  }
}
