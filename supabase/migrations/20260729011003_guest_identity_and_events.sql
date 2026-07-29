create extension if not exists pgcrypto;

create table public.guest_identities (
  fun_id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('web', 'whatsapp', 'sms')),
  email text,
  phone_e164 text,
  phone_hash text,
  browser_hash text,
  opt_in_email boolean not null default false,
  opt_in_phone boolean not null default false,
  property_id uuid references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opt_in_email or email is null),
  check (opt_in_phone or phone_e164 is null)
);

create unique index guest_identities_phone_hash_property_idx on public.guest_identities
  (phone_hash, coalesce(property_id, '00000000-0000-0000-0000-000000000000'::uuid)) where phone_hash is not null;
create unique index guest_identities_email_property_idx on public.guest_identities
  (lower(email), coalesce(property_id, '00000000-0000-0000-0000-000000000000'::uuid)) where email is not null;
create unique index guest_identities_browser_hash_property_idx on public.guest_identities
  (browser_hash, coalesce(property_id, '00000000-0000-0000-0000-000000000000'::uuid)) where browser_hash is not null;

create table public.concierge_events (
  id uuid primary key default gen_random_uuid(),
  fun_id uuid not null references public.guest_identities(fun_id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  channel text not null check (channel in ('web', 'whatsapp', 'sms')),
  property_id uuid references public.properties(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index concierge_events_fun_id_idx on public.concierge_events(fun_id);
create index concierge_events_created_at_idx on public.concierge_events(created_at desc);

alter table public.conversations add column fun_id uuid references public.guest_identities(fun_id);
alter table public.revenue_intent_events add column fun_id uuid references public.guest_identities(fun_id);

create trigger guest_identities_updated_at before update on public.guest_identities
  for each row execute function public.set_updated_at();

create or replace function public.upsert_guest_identity(
  p_channel text, p_phone_hash text default null, p_email text default null,
  p_property_id uuid default null, p_browser_hash text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_fun_id uuid;
begin
  if p_channel not in ('web', 'whatsapp', 'sms') then raise exception 'Unsupported channel'; end if;
  if p_email is not null then
    select fun_id into v_fun_id from public.guest_identities
      where lower(email) = lower(trim(p_email)) and property_id is not distinct from p_property_id limit 1;
  end if;
  if v_fun_id is null and p_phone_hash is not null then
    select fun_id into v_fun_id from public.guest_identities
      where phone_hash = p_phone_hash and property_id is not distinct from p_property_id limit 1;
  end if;
  if v_fun_id is null and p_browser_hash is not null then
    select fun_id into v_fun_id from public.guest_identities
      where browser_hash = p_browser_hash and property_id is not distinct from p_property_id limit 1;
  end if;
  if v_fun_id is null then
    insert into public.guest_identities(channel, phone_hash, browser_hash, property_id)
      values (p_channel, p_phone_hash, p_browser_hash, p_property_id) returning fun_id into v_fun_id;
  end if;
  return v_fun_id;
end; $$;

-- Opting in with an email already known to Porter returns the canonical FunID.
create or replace function public.opt_in_guest_email(p_fun_id uuid, p_email text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_fun_id uuid; v_property_id uuid;
begin
  select property_id into v_property_id from public.guest_identities where fun_id = p_fun_id for update;
  if not found then raise exception 'Identity not found'; end if;
  select fun_id into v_fun_id from public.guest_identities
    where lower(email) = lower(trim(p_email)) and property_id is not distinct from v_property_id limit 1;
  if v_fun_id is null or v_fun_id = p_fun_id then
    update public.guest_identities set email = lower(trim(p_email)), opt_in_email = true where fun_id = p_fun_id;
    return p_fun_id;
  end if;
  update public.concierge_events set fun_id = v_fun_id where fun_id = p_fun_id;
  update public.conversations set fun_id = v_fun_id where fun_id = p_fun_id;
  update public.revenue_intent_events set fun_id = v_fun_id where fun_id = p_fun_id;
  delete from public.guest_identities where fun_id = p_fun_id;
  return v_fun_id;
end; $$;

revoke execute on function public.upsert_guest_identity(text,text,text,uuid,text) from anon, authenticated, public;
revoke execute on function public.opt_in_guest_email(uuid,text) from anon, authenticated, public;
alter table public.guest_identities enable row level security;
alter table public.concierge_events enable row level security;
revoke all on table public.guest_identities from anon, authenticated;
revoke all on table public.concierge_events from anon, authenticated;

