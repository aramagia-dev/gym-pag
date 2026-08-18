import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupRepository } from "@/src/domain/repositories/group-repository";
import type { Group } from "@/src/domain/models/groups";
import { mapGroup, type GroupRow, type InviteRow, type MembershipRow } from "@/src/features/groups/group-mapping";
import { normalizeGroupDescription, normalizeGroupName, normalizeInviteCode } from "@/src/features/groups/group-validation";

type SupabaseGroupOperation = "authenticate" | "list" | "create" | "invite" | "revoke" | "join";

function groupOperationError(operation: SupabaseGroupOperation, reason: unknown): Error & { code?: string; details?: string; hint?: string; operation: SupabaseGroupOperation } {
  const source = reason as { code?: unknown; details?: unknown; hint?: unknown };
  return Object.assign(new Error(`Supabase group operation failed: ${operation}`), {
    code: typeof source.code === "string" ? source.code : undefined,
    details: typeof source.details === "string" ? source.details : undefined,
    hint: typeof source.hint === "string" ? source.hint : undefined,
    operation,
  });
}

export class SupabaseGroupRepository implements GroupRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<Group[]> {
    const { data: groups, error } = await this.client.from("groups").select("id, owner_id, name, description, created_at").order("created_at", { ascending: false });
    if (error) throw groupOperationError("list", error);
    const rows = (groups ?? []) as GroupRow[];
    if (!rows.length) return [];
    const ids = rows.map((group) => group.id);
    const [{ data: memberships, error: membershipError }, { data: invites, error: inviteError }] = await Promise.all([
      this.client.from("group_memberships").select("group_id, user_id, role, joined_at, profiles(display_name)").in("group_id", ids),
      this.client.from("group_invites").select("id, group_id, code, expires_at, uses, max_uses, revoked_at").in("group_id", ids).is("revoked_at", null).order("created_at", { ascending: false }),
    ]);
    if (membershipError) throw groupOperationError("list", membershipError);
    if (inviteError) throw groupOperationError("list", inviteError);
    const membershipRows = (memberships ?? []) as MembershipRow[];
    const inviteRows = (invites ?? []) as InviteRow[];
    return rows.map((row) => mapGroup(row, membershipRows, inviteRows.find((invite) => invite.group_id === row.id)));
  }

  async create(name: string, description: string): Promise<Group> {
    const { data: userData, error: userError } = await this.client.auth.getUser();
    if (userError) throw groupOperationError("authenticate", userError);
    if (!userData.user) throw groupOperationError("authenticate", new Error("Authentication required"));
    const { data, error } = await this.client.rpc("create_group", {
      group_name: normalizeGroupName(name),
      group_description: normalizeGroupDescription(description),
    }).single();
    if (error) throw groupOperationError("create", error);
    const row = data as GroupRow;
    try {
      const groups = await this.list();
      return groups.find((group) => group.id === row.id) ?? this.mapCreatedGroup(row, userData.user.user_metadata?.display_name);
    } catch {
      // Creation already succeeded; keep the owner membership consistent in the returned entity.
      return this.mapCreatedGroup(row, userData.user.user_metadata?.display_name);
    }
  }

  private mapCreatedGroup(row: GroupRow, displayName?: string): Group {
    return mapGroup(row, [{
      group_id: row.id,
      user_id: row.owner_id,
      role: "owner",
      joined_at: row.created_at,
      profiles: [{ display_name: displayName ?? "" }],
    }]);
  }

  async createInvite(groupId: string): Promise<Group> {
    const { error } = await this.client.rpc("create_group_invite", { target_group_id: groupId }).single();
    if (error) throw groupOperationError("invite", error);
    const groups = await this.list();
    return groups.find((group) => group.id === groupId) as Group;
  }

  async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await this.client.from("group_invites").update({ revoked_at: new Date().toISOString() }).eq("id", inviteId);
    if (error) throw groupOperationError("revoke", error);
  }

  async joinByInviteCode(code: string): Promise<{ groupId: string; joined: boolean }> {
    const { data, error } = await this.client.rpc("join_group_by_invite_code", { invite_code: normalizeInviteCode(code) }).single();
    if (error) throw groupOperationError("join", error);
    const result = data as { group_id: string; joined: boolean };
    return { groupId: result.group_id, joined: result.joined };
  }
}
