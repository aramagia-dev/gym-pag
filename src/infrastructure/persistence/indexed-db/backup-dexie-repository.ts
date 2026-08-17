import type { BackupCollections, BackupRepository } from "@/src/application/data-backup/data-backup-service";
import { database, type GymDatabase } from "./database";

export class BackupDexieRepository implements BackupRepository {
  constructor(private readonly db: GymDatabase = database) {}

  async readAll(): Promise<BackupCollections> {
    const [exercises, routines, workoutSessions, workoutSets] = await Promise.all([
      this.db.exercises.toArray(), this.db.routines.toArray(), this.db.workoutSessions.toArray(), this.db.workoutSets.toArray(),
    ]);
    return { exercises, routines, workoutSessions, workoutSets };
  }

  async replaceAll(collections: BackupCollections): Promise<void> {
    await this.db.transaction("rw", this.db.exercises, this.db.routines, this.db.workoutSessions, this.db.workoutSets, async () => {
      await this.db.exercises.clear();
      await this.db.routines.clear();
      await this.db.workoutSessions.clear();
      await this.db.workoutSets.clear();
      await this.db.exercises.bulkPut(collections.exercises);
      await this.db.routines.bulkPut(collections.routines);
      await this.db.workoutSessions.bulkPut(collections.workoutSessions);
      await this.db.workoutSets.bulkPut(collections.workoutSets);
    });
  }
}
