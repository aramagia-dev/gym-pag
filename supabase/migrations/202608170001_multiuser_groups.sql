-- Private groups and invitation codes for the multiuser foundation slice.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.group_memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id)
);

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  code text not null unique check (code = upper(code) and code ~ '^[A-Z2-9]{6,12}$'),
  expires_at timestamptz not null,
  max_uses integer not null default 3 check (max_uses between 1 and 3),
  uses integer not null default 0 check (uses between 0 and max_uses),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (expires_at > created_at and expires_at <= created_at + interval '7 days')
);

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', '') from auth.users
on conflict (id) do nothing;

create index if not exists groups_owner_id_idx on public.groups(owner_id);
create index if not exists memberships_user_id_idx on public.group_memberships(user_id);
create index if not exists invites_group_id_idx on public.group_invites(group_id);
create index if not exists invites_active_code_idx on public.group_invites(code, expires_at)
  where revoked_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at before update on public.groups
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.add_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_memberships (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created after insert on public.groups
for each row execute function public.add_group_owner_membership();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.group_invites enable row level security;

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_memberships
    where group_id = target_group_id and user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;

create policy profiles_select_related on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.group_memberships mine
    join public.group_memberships theirs on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
  )
);
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy groups_select_members on public.groups for select to authenticated
using (public.is_group_member(groups.id));
create policy groups_insert_owner on public.groups for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy groups_update_owner on public.groups for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy groups_delete_owner on public.groups for delete to authenticated
using (owner_id = (select auth.uid()));

create policy memberships_select_members on public.group_memberships for select to authenticated
using (public.is_group_member(group_memberships.group_id));
create policy memberships_insert_self on public.group_memberships for insert to authenticated
with check (user_id = (select auth.uid()) and role = 'member');

create policy invites_select_owner on public.group_invites for select to authenticated
using (exists (select 1 from public.groups where id = group_invites.group_id and owner_id = (select auth.uid())));
create policy invites_insert_owner on public.group_invites for insert to authenticated
with check (exists (select 1 from public.groups where id = group_invites.group_id and owner_id = (select auth.uid())));
create policy invites_update_owner on public.group_invites for update to authenticated
using (exists (select 1 from public.groups where id = group_invites.group_id and owner_id = (select auth.uid())))
with check (exists (select 1 from public.groups where id = group_invites.group_id and owner_id = (select auth.uid())));

create or replace function public.join_group_by_invite_code(invite_code text)
returns table (group_id uuid, joined boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  invite public.group_invites%rowtype;
  inserted_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into invite from public.group_invites
  where code = upper(btrim(invite_code)) for update;
  if not found or invite.revoked_at is not null or invite.expires_at <= timezone('utc', now()) or invite.uses >= invite.max_uses then
    raise exception 'Invite code is invalid or expired';
  end if;

  insert into public.group_memberships (group_id, user_id, role)
  values (invite.group_id, current_user_id, 'member')
  on conflict (group_id, user_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 1 then
    update public.group_invites set uses = uses + 1 where id = invite.id;
    return query select invite.group_id, true;
  end if;
  return query select invite.group_id, false;
end;
$$;

revoke all on function public.join_group_by_invite_code(text) from public;
grant execute on function public.join_group_by_invite_code(text) to authenticated;
