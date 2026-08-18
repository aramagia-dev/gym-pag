import type { SharedRoutineShare, SharedRoutineSnapshot } from "@/src/domain/models/shared-routine";

export interface SharedRoutineRepository {
  list(): Promise<SharedRoutineShare[]>;
  publish(groupId: string, snapshot: SharedRoutineSnapshot): Promise<SharedRoutineShare>;
  revoke(shareId: string): Promise<void>;
}
