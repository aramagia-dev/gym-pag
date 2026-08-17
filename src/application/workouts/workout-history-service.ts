import type { EntityId, WorkoutSession } from "@/src/domain/models/workout";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";

export class WorkoutHistoryService {
  constructor(
    private readonly workoutRepository: WorkoutRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async deleteSessionById(id: EntityId): Promise<void> {
    const session = await this.workoutRepository.findSessionById(id);
    this.assertDeletable(session);
    await this.workoutRepository.deleteSessionsWithSets([id]);
  }

  async deleteAllCompletedSessions(): Promise<number> {
    const sessions = await this.workoutRepository.findAllSessions();
    const completed = sessions.filter((session) => Boolean(session.endTime));
    await this.workoutRepository.deleteSessionsWithSets(completed.map((session) => session.id));
    return completed.length;
  }

  async deleteCompletedSessionsFromLastMonth(): Promise<number> {
    const cutoff = this.monthBefore(this.clock()).toISOString();
    const sessions = await this.workoutRepository.findAllSessions();
    const completed = sessions.filter(
      (session) => Boolean(session.endTime) && session.startTime >= cutoff,
    );
    await this.workoutRepository.deleteSessionsWithSets(completed.map((session) => session.id));
    return completed.length;
  }

  private assertDeletable(session: WorkoutSession | null): asserts session is WorkoutSession {
    if (!session) throw new Error("La sesión no existe.");
    if (!session.endTime) throw new Error("No se puede borrar una sesión en curso.");
  }

  private monthBefore(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - 1);
    return result;
  }
}
