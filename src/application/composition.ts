import { ExerciseCatalogService } from "@/src/application/exercises/exercise-catalog-service";
import { RoutineService } from "@/src/application/routines/routine-service";
import { ActiveWorkoutService } from "@/src/application/workouts/active-workout-service";
import { WorkoutAnalyticsService } from "@/src/application/workouts/workout-analytics-service";
import { WorkoutHistoryService } from "@/src/application/workouts/workout-history-service";
import { ExerciseDexieRepository } from "@/src/infrastructure/persistence/indexed-db/exercise-dexie-repository";
import { RoutineDexieRepository } from "@/src/infrastructure/persistence/indexed-db/routine-dexie-repository";
import { WorkoutDexieRepository } from "@/src/infrastructure/persistence/indexed-db/workout-dexie-repository";
import { DataBackupService } from "@/src/application/data-backup/data-backup-service";
import { BackupDexieRepository } from "@/src/infrastructure/persistence/indexed-db/backup-dexie-repository";
import { RepositoryExerciseReferenceReader } from "@/src/application/exercises/exercise-reference-reader";
import { HomeDashboardService } from "@/src/application/home/home-dashboard-service";
import { seedDefaultExercises } from "@/src/infrastructure/persistence/indexed-db/exercise-catalog-seeder";
import { SeededExerciseRepository } from "@/src/infrastructure/persistence/indexed-db/seeded-exercise-repository";
import { database } from "@/src/infrastructure/persistence/indexed-db/database";

const exerciseRepository = new SeededExerciseRepository(
  new ExerciseDexieRepository(database),
  typeof window === "undefined"
    ? Promise.resolve()
    : seedDefaultExercises(database),
);
const routineRepository = new RoutineDexieRepository();
const workoutRepository = new WorkoutDexieRepository();

export const exerciseCatalogService = new ExerciseCatalogService(
  exerciseRepository,
  undefined,
  new RepositoryExerciseReferenceReader(routineRepository, workoutRepository),
);

export const routineService = new RoutineService(
  routineRepository,
  exerciseRepository,
  undefined,
  undefined,
  workoutRepository,
);

export const activeWorkoutService = new ActiveWorkoutService(
  workoutRepository,
  routineRepository,
);

export const workoutAnalyticsService = new WorkoutAnalyticsService(
  workoutRepository,
  routineRepository,
  exerciseRepository,
);

export const workoutHistoryService = new WorkoutHistoryService(workoutRepository);

export const homeDashboardService = new HomeDashboardService(
  routineRepository,
  workoutRepository,
);

export const dataBackupService = new DataBackupService(new BackupDexieRepository());
