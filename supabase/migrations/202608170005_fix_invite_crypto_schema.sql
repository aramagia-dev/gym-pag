-- Resolve pgcrypto explicitly while keeping the invite RPC search path fixed.
create or replace function public.create_group_invite(target_group_id uuid)
returns setof public.group_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  invite public.group_invites%rowtype;
  code_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_code text;
  random_bytes bytea;
  created_timestamp timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.groups
    where id = target_group_id and owner_id = current_user_id
  ) then
    raise exception 'Group not found or caller is not the owner';
  end if;

  loop
    random_bytes := extensions.gen_random_bytes(8);
    select string_agg(
      substr(code_alphabet, (get_byte(random_bytes, position) % 32) + 1, 1),
      '' order by position
    )
    into generated_code
    from generate_series(0, 7) as positions(position);

    insert into public.group_invites (group_id, code, expires_at, max_uses, created_at)
    values (target_group_id, generated_code, created_timestamp + interval '7 days', 3, created_timestamp)
    on conflict (code) do nothing
    returning public.group_invites.* into invite;

    if found then
      return query select invite.*;
      return;
    end if;
  end loop;
end;
$$;

revoke all on function public.create_group_invite(uuid) from public;
grant execute on function public.create_group_invite(uuid) to authenticated;
