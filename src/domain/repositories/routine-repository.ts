import type { EntityId, RoutineTemplate } from "@/src/domain/models/workout";

export interface RoutineRepository {
  findById(id: EntityId): Promise<RoutineTemplate | null>;
  findAll(): Promise<RoutineTemplate[]>;
  create(routine: RoutineTemplate): Promise<void>;
  update(routine: RoutineTemplate): Promise<void>;
  deleteById(id: EntityId): Promise<void>;
}
