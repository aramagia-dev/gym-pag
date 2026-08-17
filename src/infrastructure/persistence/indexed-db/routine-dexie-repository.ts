import type { RoutineRepository } from "@/src/domain/repositories/routine-repository";
import {
  normalizeRoutineTemplate,
  type EntityId,
  type RoutineTemplate,
} from "@/src/domain/models/workout";
import { database, type GymDatabase } from "./database";

export class RoutineDexieRepository implements RoutineRepository {
  constructor(private readonly db: GymDatabase = database) {}

  findById(id: EntityId): Promise<RoutineTemplate | null> {
    return this.db.routines.get(id).then((routine) => routine ? normalizeRoutineTemplate(routine) : null);
  }

  findAll(): Promise<RoutineTemplate[]> {
    return this.db.routines.toArray().then((routines) => routines.map(normalizeRoutineTemplate));
  }

  async create(routine: RoutineTemplate): Promise<void> {
    await this.db.routines.put(routine);
  }

  async update(routine: RoutineTemplate): Promise<void> {
    await this.db.routines.put(routine);
  }

  async deleteById(id: EntityId): Promise<void> {
    await this.db.routines.delete(id);
  }
}
