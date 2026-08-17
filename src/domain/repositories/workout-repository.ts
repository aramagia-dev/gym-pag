import type {
  EntityId,
  WorkoutSession,
  WorkoutSet,
} from "@/src/domain/models/workout";

export interface WorkoutRepository {
  findSessionById(id: EntityId): Promise<WorkoutSession | null>;
  findAllSessions(): Promise<WorkoutSession[]>;
  createSession(session: WorkoutSession): Promise<void>;
  createSessionWithSets(session: WorkoutSession, sets: WorkoutSet[]): Promise<void>;
  updateSession(session: WorkoutSession): Promise<void>;
  deleteSessionById(id: EntityId): Promise<void>;
  deleteSessionsWithSets(ids: EntityId[]): Promise<void>;

  findSetById(id: EntityId): Promise<WorkoutSet | null>;
  findSetsBySessionId(sessionId: EntityId): Promise<WorkoutSet[]>;
  createSet(set: WorkoutSet): Promise<void>;
  updateSet(set: WorkoutSet): Promise<void>;
  deleteSetById(id: EntityId): Promise<void>;
  findPreviousCompletedSets(
    exerciseId: EntityId,
    context?: { currentSessionId?: EntityId },
  ): Promise<WorkoutSet[]>;
}
