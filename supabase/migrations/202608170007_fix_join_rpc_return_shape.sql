-- Remove PL/pgSQL output variables from the invite join RPC return shape.
drop function if exists public.join_group_by_invite_code(text);

create function public.join_group_by_invite_code(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_code text := upper(btrim(invite_code));
  invite_row public.group_invites%rowtype;
  inserted_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select gi.*
  into invite_row
  from public.group_invites as gi
  where gi.code = normalized_code
  for update;

  if not found
    or invite_row.revoked_at is not null
    or invite_row.expires_at <= timezone('utc', now())
    or invite_row.uses >= invite_row.max_uses then
    raise exception 'Invite code is invalid or expired';
  end if;

  insert into public.group_memberships (group_id, user_id, role)
  values (invite_row.group_id, current_user_id, 'member')
  on conflict (group_id, user_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    update public.group_invites as gi
    set uses = gi.uses + 1
    where gi.id = invite_row.id;
    return jsonb_build_object('group_id', invite_row.group_id, 'joined', true);
  end if;

  return jsonb_build_object('group_id', invite_row.group_id, 'joined', false);
end;
$$;

revoke all on function public.join_group_by_invite_code(text) from public;
grant execute on function public.join_group_by_invite_code(text) to authenticated;
