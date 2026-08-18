-- Private, read-only routine snapshots. Local Dexie routines remain the source of truth.
create table if not exists public.group_routine_shares (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  publisher_id uuid not null references public.profiles(id) on delete cascade,
  source_routine_id text not null check (char_length(btrim(source_routine_id)) between 1 and 200),
  snapshot jsonb not null,
  published_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  constraint group_routine_shares_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint group_routine_shares_snapshot_required check (
    snapshot ? 'sourceRoutineId' and jsonb_typeof(snapshot->'sourceRoutineId') = 'string'
    and snapshot ? 'name' and jsonb_typeof(snapshot->'name') = 'string'
    and snapshot ? 'daysOfWeek' and jsonb_typeof(snapshot->'daysOfWeek') = 'array'
    and snapshot ? 'exercises' and jsonb_typeof(snapshot->'exercises') = 'array'
    and jsonb_array_length(snapshot->'exercises') > 0
    and char_length(snapshot->>'name') between 1 and 120
    and pg_column_size(snapshot) <= 100000
  ),
  constraint group_routine_shares_source_matches check (snapshot->>'sourceRoutineId' = source_routine_id)
);

create unique index if not exists group_routine_shares_unique_source_idx
  on public.group_routine_shares(group_id, publisher_id, source_routine_id);
create index if not exists group_routine_shares_group_published_idx
  on public.group_routine_shares(group_id, published_at desc);
create index if not exists group_routine_shares_publisher_idx
  on public.group_routine_shares(publisher_id);

alter table public.group_routine_shares enable row level security;
revoke all on public.group_routine_shares from anon;
revoke all on public.group_routine_shares from authenticated;
grant select, insert on public.group_routine_shares to authenticated;
grant update (revoked_at) on public.group_routine_shares to authenticated;

create policy group_routine_shares_select_members on public.group_routine_shares
  for select to authenticated
  using (public.is_group_member(group_id));

create policy group_routine_shares_insert_self on public.group_routine_shares
  for insert to authenticated
  with check (
    publisher_id = (select auth.uid())
    and public.is_group_member(group_id)
    and revoked_at is null
  );

create policy group_routine_shares_revoke_self on public.group_routine_shares
  for update to authenticated
  using (publisher_id = (select auth.uid()) and public.is_group_member(group_id))
  with check (publisher_id = (select auth.uid()) and revoked_at is not null);
