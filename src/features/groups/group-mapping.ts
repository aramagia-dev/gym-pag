import type { Group, GroupInvite, GroupMember } from "@/src/domain/models/groups";

export interface GroupRow { id: string; owner_id: string; name: string; description: string; created_at: string; }
export interface MembershipRow { group_id: string; user_id: string; role: "owner" | "member"; joined_at: string; profiles?: { display_name: string }[] | null; }
export interface InviteRow { id: string; group_id: string; code: string; expires_at: string; uses: number; max_uses: number; revoked_at: string | null; }

export function mapGroup(row: GroupRow, memberships: MembershipRow[], invite?: InviteRow): Group {
  const members: GroupMember[] = memberships.filter((item) => item.group_id === row.id).map((item) => ({
    userId: item.user_id,
    displayName: item.profiles?.[0]?.display_name?.trim() || "Miembro",
    role: item.role,
    joinedAt: item.joined_at,
  }));
  const activeInvite: GroupInvite | undefined = invite && !invite.revoked_at && new Date(invite.expires_at) > new Date()
    ? { id: invite.id, groupId: invite.group_id, code: invite.code, expiresAt: invite.expires_at, uses: invite.uses, maxUses: invite.max_uses }
    : undefined;
  return { id: row.id, name: row.name, description: row.description, ownerId: row.owner_id, createdAt: row.created_at, members, activeInvite };
}
