-- Repair group creation for existing users and RLS-protected clients.
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (id) do nothing;

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

create or replace function public.add_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_memberships (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;

create or replace function public.create_group(group_name text, group_description text)
returns table (
  id uuid,
  owner_id uuid,
  name text,
  description text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_name text := btrim(group_name);
  normalized_description text := coalesce(btrim(group_description), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if normalized_name is null or char_length(normalized_name) not between 2 and 80 then
    raise exception 'Group name must contain between 2 and 80 characters';
  end if;

  if char_length(normalized_description) > 500 then
    raise exception 'Group description cannot exceed 500 characters';
  end if;

  insert into public.profiles (id, display_name)
  select current_user_id, coalesce(raw_user_meta_data ->> 'display_name', '')
  from auth.users
  where auth.users.id = current_user_id
  on conflict (id) do nothing;

  if not exists (select 1 from public.profiles where profiles.id = current_user_id) then
    raise exception 'Authenticated user profile is unavailable';
  end if;

  return query
  insert into public.groups (owner_id, name, description)
  values (current_user_id, normalized_name, normalized_description)
  returning groups.id, groups.owner_id, groups.name, groups.description, groups.created_at;
end;
$$;

revoke all on function public.create_group(text, text) from public;
grant execute on function public.create_group(text, text) to authenticated;
