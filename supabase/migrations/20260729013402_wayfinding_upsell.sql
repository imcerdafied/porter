alter table public.properties
  add column if not exists wayfinding_tier text not null default 'none'
    check (wayfinding_tier in ('none', 'basic', 'premium')),
  add column if not exists wayfinding_enabled boolean not null default false,
  add column if not exists phunware_building_id text;

alter table public.properties
  add constraint wayfinding_enabled_requires_configuration check (
    not wayfinding_enabled or (
      wayfinding_tier <> 'none'
      and nullif(trim(phunware_building_id), '') is not null
    )
  );

-- The existing owner update policy is used by the GM dashboard. RLS policies
-- cannot reliably restrict individual columns, so enforce the billing-owned
-- tier at the row boundary; service-role requests bypass this guard.
create or replace function public.protect_wayfinding_configuration()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if (tg_op = 'INSERT' and (
      new.wayfinding_tier <> 'none' or new.phunware_building_id is not null
    )) or (tg_op = 'UPDATE' and (
      new.wayfinding_tier is distinct from old.wayfinding_tier
      or new.phunware_building_id is distinct from old.phunware_building_id
    )) then
    raise exception 'wayfinding billing configuration may only be changed by the service role';
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_wayfinding_configuration() from anon, authenticated, public;

create trigger protect_wayfinding_configuration
  before insert or update of wayfinding_tier, phunware_building_id on public.properties
  for each row execute function public.protect_wayfinding_configuration();

comment on column public.properties.wayfinding_tier is
  'Billing tier: none | basic | premium. Set by service-role only.';
comment on column public.properties.wayfinding_enabled is
  'GM-controlled toggle. Requires an active tier and building ID.';
comment on column public.properties.phunware_building_id is
  'Phunware building identifier used to construct the map iframe URL.';
