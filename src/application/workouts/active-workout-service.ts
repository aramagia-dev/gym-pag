import type {
  EntityId,
  ISODateString,
  RoutineTemplate,
  WorkoutSession,
  WorkoutSet,
} from "@/src/domain/models/workout";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";

export type WorkoutClock = () => ISODateString;
export type WorkoutIdGenerator = () => EntityId;

export interface ActiveWorkout {
  session: WorkoutSession;
  sets: WorkoutSet[];
}

export type ActiveWorkoutStartDecision = "continue-existing" | "replace-existing";

export class ActiveWorkoutStartConflict extends Error {
  readonly code = "ACTIVE_WORKOUT_START_CONFLICT" as const;

  constructor(
    readonly activeSession: WorkoutSession,
    readonly activeRoutine: RoutineTemplate | null,
  ) {
    super("An active workout already exists for a different routine.");
    this.name = "ActiveWorkoutStartConflict";
  }
}

export interface WorkoutSetUpdateInput {
  id: EntityId;
  weight: number;
  reps: number;
  isCompleted: boolean;
}

const defaultClock: WorkoutClock = () => new Date().toISOString();
const defaultIdGenerator: WorkoutIdGenerator = () => crypto.randomUUID();

export class ActiveWorkoutService {
  private startQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly workoutRepository: WorkoutRepository,
    private readonly routineRepository: RoutineRepository,
    private readonly clock: WorkoutClock = defaultClock,
    private readonly sessionIdGenerator: WorkoutIdGenerator = defaultIdGenerator,
    private readonly setIdGenerator: WorkoutIdGenerator = defaultIdGenerator,
  ) {}

  startFromRoutine(
    routineId: EntityId,
    decision?: ActiveWorkoutStartDecision,
  ): Promise<ActiveWorkout> {
    const operation = this.startQueue.then(async () => {
      const routine = await this.routineRepository.findById(routineId);
      if (!routine) throw new Error("La rutina no existe.");
      return this.startOrReuseActiveSession(routine, decision);
    });
    this.startQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async startOrReuseActiveSession(
    routine: RoutineTemplate,
    decision?: ActiveWorkoutStartDecision,
  ): Promise<ActiveWorkout> {
    const activeSession = (await this.workoutRepository.findAllSessions())
      .filter((session) => !session.endTime)
      .sort((left, right) => right.startTime.localeCompare(left.startTime))[0];

    if (activeSession && activeSession.templateId !== routine.id && !decision) {
      const activeRoutine = activeSession.templateId
        ? await this.routineRepository.findById(activeSession.templateId)
        : null;
      throw new ActiveWorkoutStartConflict(activeSession, activeRoutine);
    }

    if (activeSession && (activeSession.templateId === routine.id || decision === "continue-existing")) {
      const sets = await this.workoutRepository.findSetsBySessionId(activeSession.id);
      return {
        session: activeSession,
        sets: this.orderSets(sets, activeSession, routine),
      };
    }

    if (activeSession) {
      await this.workoutRepository.updateSession({ ...activeSession, endTime: this.clock() });
    }

    const session: WorkoutSession = {
      id: this.sessionIdGenerator(),
      templateId: routine.id,
      startTime: this.clock(),
      exerciseOrder: this.orderTemplateExercises(routine).map((exercise) => exercise.exerciseId),
    };
    const sets = this.createWorkingSets(session, routine);

    await this.workoutRepository.createSessionWithSets(session, sets);
    return { session, sets };
  }

  async load(sessionId: EntityId): Promise<ActiveWorkout | null> {
    const session = await this.workoutRepository.findSessionById(sessionId);
    if (!session) return null;
    const sets = await this.workoutRepository.findSetsBySessionId(sessionId);
    const routine = session.templateId ? await this.routineRepository.findById(session.templateId) : null;
    return { session, sets: this.orderSets(sets, session, routine ?? undefined) };
  }

  private async getActiveSession(sessionId: EntityId): Promise<WorkoutSession> {
    const session = await this.workoutRepository.findSessionById(sessionId);
    if (!session) throw new Error("La sesión no existe.");
    if (session.endTime) throw new Error("La sesión ya finalizó.");
    return session;
  }

  private async loadSessionSets(sessionId: EntityId): Promise<WorkoutSet[]> {
    const session = await this.getActiveSession(sessionId);
    const routine = session.templateId ? await this.routineRepository.findById(session.templateId) : null;
    return this.orderSets(
      await this.workoutRepository.findSetsBySessionId(sessionId),
      session,
      routine ?? undefined,
    );
  }

  getPreviousCompletedSets(sessionId: EntityId, exerciseId: EntityId): Promise<WorkoutSet[]> {
    return this.workoutRepository.findPreviousCompletedSets(exerciseId, { currentSessionId: sessionId });
  }

  async updateSet(input: WorkoutSetUpdateInput): Promise<WorkoutSet> {
    this.validateValue(input.weight, "El peso");
    this.validateValue(input.reps, "Las repeticiones");
    const existing = await this.workoutRepository.findSetById(input.id);
    if (!existing) throw new Error("La serie no existe.");
    await this.getActiveSession(existing.sessionId);

    const updated: WorkoutSet = {
      ...existing,
      weight: input.weight,
      reps: input.reps,
      isCompleted: input.isCompleted,
    };
    await this.workoutRepository.updateSet(updated);
    return updated;
  }

  async addExercise(sessionId: EntityId, exerciseId: EntityId): Promise<WorkoutSet> {
    const session = await this.getActiveSession(sessionId);
    const existingSets = await this.workoutRepository.findSetsBySessionId(sessionId);
    const existingExerciseSet = this.orderSets(
      existingSets.filter((set) => set.exerciseId === exerciseId),
    )[0];
    if (existingExerciseSet) return existingExerciseSet;

    const routine = session.templateId ? await this.routineRepository.findById(session.templateId) : null;
    await this.persistExerciseOrder(session, existingSets, exerciseId, routine ?? undefined);

    const set: WorkoutSet = {
      id: this.setIdGenerator(),
      sessionId,
      exerciseId,
      setNumber: 1,
      setType: "working",
      weight: 0,
      reps: 0,
      isCompleted: false,
    };
    await this.workoutRepository.createSet(set);
    return set;
  }

  async addSet(sessionId: EntityId, exerciseId: EntityId): Promise<WorkoutSet> {
    await this.getActiveSession(sessionId);
    const exerciseSets = (await this.workoutRepository.findSetsBySessionId(sessionId))
      .filter((set) => set.exerciseId === exerciseId);
    if (exerciseSets.length === 0) throw new Error("El ejercicio no pertenece a la sesión.");

    const set: WorkoutSet = {
      id: this.setIdGenerator(),
      sessionId,
      exerciseId,
      setNumber: Math.max(...exerciseSets.map((item) => item.setNumber)) + 1,
      setType: "working",
      weight: 0,
      reps: 0,
      isCompleted: false,
    };
    await this.workoutRepository.createSet(set);
    return set;
  }

  async removeSet(sessionId: EntityId, setId: EntityId): Promise<WorkoutSet[]> {
    await this.getActiveSession(sessionId);
    const set = await this.workoutRepository.findSetById(setId);
    if (!set || set.sessionId !== sessionId) throw new Error("La serie no pertenece a la sesión.");

    await this.workoutRepository.deleteSetById(setId);
    const remainingExerciseSets = this.orderSets(
      (await this.workoutRepository.findSetsBySessionId(sessionId))
        .filter((item) => item.exerciseId === set.exerciseId),
    );
    for (const [index, remainingSet] of remainingExerciseSets.entries()) {
      const setNumber = index + 1;
      if (remainingSet.setNumber !== setNumber) {
        await this.workoutRepository.updateSet({ ...remainingSet, setNumber });
      }
    }
    return this.loadSessionSets(sessionId);
  }

  async removeExercise(sessionId: EntityId, exerciseId: EntityId): Promise<WorkoutSet[]> {
    const session = await this.getActiveSession(sessionId);
    const exerciseSets = (await this.workoutRepository.findSetsBySessionId(sessionId))
      .filter((set) => set.exerciseId === exerciseId);
    for (const set of exerciseSets) await this.workoutRepository.deleteSetById(set.id);
    const routine = session.templateId ? await this.routineRepository.findById(session.templateId) : null;
    const remainingSets = await this.workoutRepository.findSetsBySessionId(sessionId);
    const exerciseOrder = this.exerciseOrder(session, remainingSets, routine ?? undefined)
      .filter((id) => id !== exerciseId);
    await this.workoutRepository.updateSession({ ...session, exerciseOrder });
    return this.loadSessionSets(sessionId);
  }

  async moveExercise(
    sessionId: EntityId,
    exerciseId: EntityId,
    direction: "up" | "down",
  ): Promise<WorkoutSet[]> {
    const session = await this.getActiveSession(sessionId);
    const sets = await this.workoutRepository.findSetsBySessionId(sessionId);
    const routine = session.templateId ? await this.routineRepository.findById(session.templateId) : null;
    const order = this.exerciseOrder(session, sets, routine ?? undefined);
    const index = order.indexOf(exerciseId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= order.length) {
      return this.orderSets(sets, session, routine ?? undefined);
    }
    [order[index], order[target]] = [order[target], order[index]];
    await this.workoutRepository.updateSession({ ...session, exerciseOrder: order });
    return this.orderSets(sets, { ...session, exerciseOrder: order });
  }

  async finish(sessionId: EntityId): Promise<WorkoutSession> {
    const existing = await this.getActiveSession(sessionId);
    const session: WorkoutSession = { ...existing, endTime: this.clock() };
    await this.workoutRepository.updateSession(session);
    return session;
  }

  private createWorkingSets(session: WorkoutSession, routine: RoutineTemplate): WorkoutSet[] {
    return this.orderTemplateExercises(routine).flatMap((exercise) =>
      Array.from({ length: exercise.targetSets }, (_, index) => ({
        id: this.setIdGenerator(),
        sessionId: session.id,
        exerciseId: exercise.exerciseId,
        setNumber: index + 1,
        setType: "working" as const,
        weight: 0,
        reps: exercise.targetReps,
        isCompleted: false,
      })),
    );
  }

  private orderTemplateExercises(routine: RoutineTemplate) {
    return [...routine.exercises].sort((left, right) => left.order - right.order);
  }

  private orderSets(sets: WorkoutSet[], session?: WorkoutSession, routine?: RoutineTemplate) {
    const order = session ? this.exerciseOrder(session, sets, routine) : [];
    const positions = new Map(order.map((id, index) => [id, index]));
    return [...sets].sort((left, right) =>
      (positions.get(left.exerciseId) ?? Number.MAX_SAFE_INTEGER) -
        (positions.get(right.exerciseId) ?? Number.MAX_SAFE_INTEGER) ||
      left.exerciseId.localeCompare(right.exerciseId) ||
      left.setNumber - right.setNumber,
    );
  }

  private exerciseOrder(
    session: WorkoutSession,
    sets: WorkoutSet[],
    routine?: RoutineTemplate,
  ): EntityId[] {
    const fallback = routine
      ? this.orderTemplateExercises(routine).map((exercise) => exercise.exerciseId)
      : [];
    const known = session.exerciseOrder ?? fallback;
    const idsInSets = [...new Set(sets.map((set) => set.exerciseId))].sort((left, right) => left.localeCompare(right));
    return [...new Set([...known, ...idsInSets])];
  }

  private async persistExerciseOrder(
    session: WorkoutSession,
    sets: WorkoutSet[],
    exerciseId: EntityId,
    routine?: RoutineTemplate,
  ) {
    const exerciseOrder = [...this.exerciseOrder(session, sets, routine), exerciseId].filter(
      (id, index, ids) => ids.indexOf(id) === index,
    );
    await this.workoutRepository.updateSession({ ...session, exerciseOrder });
  }

  private validateValue(value: number, label: string) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${label} debe ser un valor finito no negativo.`);
    }
  }
}
