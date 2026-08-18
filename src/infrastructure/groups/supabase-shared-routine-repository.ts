import type { SupabaseClient } from "@supabase/supabase-js";
import type { SharedRoutineRepository } from "@/src/domain/repositories/shared-routine-repository";
import type { SharedRoutineShare, SharedRoutineSnapshot } from "@/src/domain/models/shared-routine";
import { sanitizeSharedRoutineSnapshot } from "@/src/application/shared-routines/shared-routine-service";

type ShareRow = {
  id: string;
  group_id: string;
  publisher_id: string;
  source_routine_id: string;
  snapshot: SharedRoutineSnapshot;
  published_at: string;
  revoked_at: string | null;
};

function mapShare(row: ShareRow): SharedRoutineShare {
  return {
    id: row.id,
    groupId: row.group_id,
    publisherId: row.publisher_id,
    sourceRoutineId: row.source_routine_id,
    snapshot: sanitizeSharedRoutineSnapshot(row.snapshot),
    publishedAt: row.published_at,
    ...(row.revoked_at ? { revokedAt: row.revoked_at } : {}),
  };
}

export class SupabaseSharedRoutineRepository implements SharedRoutineRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<SharedRoutineShare[]> {
    const { data, error } = await this.client
      .from("group_routine_shares")
      .select("id, group_id, publisher_id, source_routine_id, snapshot, published_at, revoked_at")
      .is("revoked_at", null)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as ShareRow[]).map(mapShare);
  }

  async publish(groupId: string, snapshot: SharedRoutineSnapshot): Promise<SharedRoutineShare> {
    const { data: userData, error: userError } = await this.client.auth.getUser();
    if (userError) throw userError;
    if (!userData.user) throw new Error("Authentication required");
    const { data, error } = await this.client
      .from("group_routine_shares")
      .insert({ group_id: groupId, publisher_id: userData.user.id, source_routine_id: snapshot.sourceRoutineId, snapshot })
      .select("id, group_id, publisher_id, source_routine_id, snapshot, published_at, revoked_at")
      .single();
    if (error) throw error;
    return mapShare(data as ShareRow);
  }

  async revoke(shareId: string): Promise<void> {
    const { error } = await this.client
      .from("group_routine_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", shareId);
    if (error) throw error;
  }
}
