export type GroupRole = "owner" | "member";

export interface GroupMember {
  userId: string;
  displayName: string;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  code: string;
  expiresAt: string;
  uses: number;
  maxUses: number;
  revokedAt?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  members: GroupMember[];
  activeInvite?: GroupInvite;
}
