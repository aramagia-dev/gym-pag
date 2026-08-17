import type { DayOfWeek, RoutineTemplate, WorkoutSession, WorkoutSet } from "@/src/domain/models/workout";
import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import type { WorkoutRepository } from "@/src/domain/repositories/workout-repository";

export interface HomeRoutine {
  id: string;
  name: string;
  exerciseCount: number;
}

export interface ActiveSessionSummary {
  id: string;
  routineName: string;
}

export interface WeeklySummary {
  sessions: number;
  completedSets: number;
  volumeKg: number;
}

export interface HomeDashboard {
  todayRoutines: HomeRoutine[];
  activeSession: ActiveSessionSummary | null;
  weeklySummary: WeeklySummary;
}

const dayNames: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export class HomeDashboardService {
  constructor(
    private readonly routineRepository: RoutineRepository,
    private readonly workoutRepository: WorkoutRepository,
  ) {}

  async getDashboard(now: Date = new Date()): Promise<HomeDashboard> {
    const [routines, sessions] = await Promise.all([
      this.routineRepository.findAll(),
      this.workoutRepository.findAllSessions(),
    ]);
    const routinesById = new Map(routines.map((routine) => [routine.id, routine]));
    const currentDay = dayNames[now.getDay()];
    const weekStart = this.startOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weeklySessions = sessions.filter((session) => {
      const startTime = new Date(session.startTime);
      return Boolean(session.endTime) && startTime >= weekStart && startTime < weekEnd;
    });
    const weeklySets = await Promise.all(
      weeklySessions.map((session) => this.workoutRepository.findSetsBySessionId(session.id)),
    );
    const completedSets = weeklySets.flat().filter((set) => set.isCompleted);
    const activeSession = sessions
      .filter((session) => !session.endTime)
      .sort((left, right) => right.startTime.localeCompare(left.startTime))[0];

    return {
      todayRoutines: routines
        .filter((routine) => routine.daysOfWeek.includes(currentDay))
        .map((routine) => this.toHomeRoutine(routine)),
      activeSession: activeSession ? {
        id: activeSession.id,
        routineName: this.routineName(activeSession, routinesById),
      } : null,
      weeklySummary: {
        sessions: weeklySessions.length,
        completedSets: completedSets.length,
        volumeKg: completedSets.reduce((total, set) => total + this.volumeOf(set), 0),
      },
    };
  }

  private startOfWeek(date: Date): Date {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    return start;
  }

  private toHomeRoutine(routine: RoutineTemplate): HomeRoutine {
    return { id: routine.id, name: routine.name, exerciseCount: routine.exercises.length };
  }

  private routineName(session: WorkoutSession, routinesById: Map<string, RoutineTemplate>): string {
    return routinesById.get(session.templateId ?? "")?.name ?? "Entrenamiento libre";
  }

  private volumeOf(set: WorkoutSet): number {
    return set.weight * set.reps;
  }
}
