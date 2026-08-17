import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";
import type {
  EntityId,
  WorkoutSession,
  WorkoutSet,
} from "@/src/domain/models/workout";
import { database, type GymDatabase } from "./database";

export class WorkoutDexieRepository implements WorkoutRepository {
  constructor(private readonly db: GymDatabase = database) {}

  findSessionById(id: EntityId): Promise<WorkoutSession | null> {
    return this.db.workoutSessions.get(id).then((session) => session ?? null);
  }

  findAllSessions(): Promise<WorkoutSession[]> {
    return this.db.workoutSessions.toArray();
  }

  async createSession(session: WorkoutSession): Promise<void> {
    await this.db.workoutSessions.put(session);
  }

  async createSessionWithSets(session: WorkoutSession, sets: WorkoutSet[]): Promise<void> {
    await this.db.transaction("rw", this.db.workoutSessions, this.db.workoutSets, async () => {
      await this.db.workoutSessions.put(session);
      for (const set of sets) await this.db.workoutSets.put(set);
    });
  }

  async updateSession(session: WorkoutSession): Promise<void> {
    await this.db.workoutSessions.put(session);
  }

  async deleteSessionById(id: EntityId): Promise<void> {
    await this.db.workoutSessions.delete(id);
  }

  findSetById(id: EntityId): Promise<WorkoutSet | null> {
    return this.db.workoutSets.get(id).then((set) => set ?? null);
  }

  findSetsBySessionId(sessionId: EntityId): Promise<WorkoutSet[]> {
    return this.db.workoutSets.where("sessionId").equals(sessionId).toArray();
  }

  async createSet(set: WorkoutSet): Promise<void> {
    await this.db.workoutSets.put(set);
  }

  async updateSet(set: WorkoutSet): Promise<void> {
    await this.db.workoutSets.put(set);
  }

  async deleteSetById(id: EntityId): Promise<void> {
    await this.db.workoutSets.delete(id);
  }

  async findPreviousCompletedSets(
    exerciseId: EntityId,
    context?: { currentSessionId?: EntityId },
  ): Promise<WorkoutSet[]> {
    const completedSets = await this.db.workoutSets
      .where("exerciseId")
      .equals(exerciseId)
      .filter((set) => set.isCompleted)
      .toArray();

    const sessionIds = [...new Set(completedSets.map((set) => set.sessionId))];
    const sessions = await this.db.workoutSessions.bulkGet(sessionIds);
    const currentSession = context?.currentSessionId
      ? await this.db.workoutSessions.get(context.currentSessionId)
      : undefined;
    const eligibleSessions = sessions.filter((session) =>
      session?.endTime &&
      session.id !== context?.currentSessionId &&
      (!currentSession || session.startTime < currentSession.startTime),
    );
    const latestSession = eligibleSessions
      .sort((left, right) => right!.startTime.localeCompare(left!.startTime))[0];
    if (!latestSession) return [];

    return completedSets
      .filter((set) => set.sessionId === latestSession.id)
      .sort((left, right) => left.setNumber - right.setNumber);
  }
}
