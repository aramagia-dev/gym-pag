import type { Group } from "@/src/domain/models/groups";

export interface GroupRepository {
  list(): Promise<Group[]>;
  create(name: string, description: string): Promise<Group>;
  createInvite(groupId: string): Promise<Group>;
  revokeInvite(inviteId: string): Promise<void>;
  joinByInviteCode(code: string): Promise<{ groupId: string; joined: boolean }>;
}
