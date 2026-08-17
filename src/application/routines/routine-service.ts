import type {
  DayOfWeek,
  EntityId,
  RoutineTemplate,
  TemplateExercise,
} from "@/src/domain/models/workout";
import type { ExerciseRepository } from "@/src/domain/repositories/exercise-repository";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";

export interface RoutineExerciseInput {
  exerciseId: EntityId;
  targetSets: number;
  targetReps: number;
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
  ) {}

  list(): Promise<RoutineTemplate[]> {
    return this.routineRepository.findAll();
  }

  get(id: EntityId): Promise<RoutineTemplate | null> {
    return this.routineRepository.findById(id);
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
      if (!Number.isInteger(selectedExercise.targetSets) || selectedExercise.targetSets <= 0) {
        throw new Error("Las series objetivo deben ser mayores que cero.");
      }
      if (!Number.isInteger(selectedExercise.targetReps) || selectedExercise.targetReps <= 0) {
        throw new Error("Las repeticiones objetivo deben ser mayores que cero.");
      }
      if (selectedExercise.restSeconds !== undefined && (!Number.isInteger(selectedExercise.restSeconds) || selectedExercise.restSeconds < 0)) {
        throw new Error("El descanso no puede ser negativo.");
      }
      if (!(await this.exerciseRepository.findById(selectedExercise.exerciseId))) {
        throw new Error("Uno de los ejercicios seleccionados ya no existe.");
      }
    }

    const exercises: TemplateExercise[] = input.exercises.map((selectedExercise, order) => ({
      id: this.templateExerciseIdGenerator(),
      exerciseId: selectedExercise.exerciseId,
      order,
      targetSets: selectedExercise.targetSets,
      targetReps: selectedExercise.targetReps,
      ...(selectedExercise.restSeconds === undefined
        ? {}
        : { restSeconds: selectedExercise.restSeconds }),
    }));
    return {
      id,
      name,
      daysOfWeek: [...input.daysOfWeek],
      exercises,
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    };
  }
}
