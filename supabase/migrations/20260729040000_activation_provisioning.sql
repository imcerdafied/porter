create or replace function public.activate_porter_property(p_property_id uuid)
returns setof public.properties
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.properties%rowtype;
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
  approved_knowledge text;
begin
  select *
  into target
  from public.properties
  where id = p_property_id
    and owner_id = auth.uid();

  if not found then
    raise exception 'Property not found or access denied';
  end if;

  if target.slug is null then
    base_slug := trim(both '-' from regexp_replace(
      lower(trim(target.name)),
      '[^a-z0-9]+',
      '-',
      'g'
    ));
    if base_slug = '' then base_slug := 'porter'; end if;
    candidate_slug := base_slug;
    while exists (
      select 1 from public.properties
      where slug = candidate_slug and id <> p_property_id
    ) loop
      suffix := suffix + 1;
      candidate_slug := base_slug || '-' || suffix;
    end loop;
  else
    candidate_slug := target.slug;
  end if;

  select string_agg(title || E'\n' || body, E'\n\n' order by created_at)
  into approved_knowledge
  from public.knowledge_entries
  where property_id = p_property_id
    and status = 'approved';

  update public.properties
  set slug = candidate_slug,
      admin_token = coalesce(admin_token, replace(gen_random_uuid()::text, '-', '')),
      knowledge_base = coalesce(approved_knowledge, ''),
      status = 'active',
      activated_at = coalesce(activated_at, now()),
      pilot_start_date = coalesce(pilot_start_date, current_date),
      wizard_step = 5
  where id = p_property_id
  returning * into target;

  return next target;
end;
$$;

revoke all on function public.activate_porter_property(uuid)
  from public, anon;
grant execute on function public.activate_porter_property(uuid)
  to authenticated;

comment on function public.activate_porter_property(uuid) is
  'Atomically provisions an owned onboarding property as a live Porter concierge.';
