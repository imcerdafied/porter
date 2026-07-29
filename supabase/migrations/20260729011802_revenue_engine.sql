create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Stay windows are seeded by the FunID import; no PMS connection is required.
create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  fun_id uuid not null references public.guest_identities(fun_id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_phone text,
  checkin_at timestamptz not null,
  checkout_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (checkout_at > checkin_at)
);
create index guest_sessions_arrival_idx on public.guest_sessions(checkin_at, property_id);
create index guest_sessions_checkout_idx on public.guest_sessions(checkout_at, property_id);

alter table public.upsell_cards
  add column attributed_revenue_usd numeric(8,2),
  add constraint upsell_cards_attributed_revenue_nonnegative
    check (attributed_revenue_usd is null or attributed_revenue_usd >= 0);

alter table public.upsell_events
  add column if not exists fun_id uuid references public.guest_identities(fun_id) on delete set null,
  add column if not exists upsell_card_id uuid references public.upsell_cards(id) on delete cascade,
  add column if not exists clicked_at timestamptz;
update public.upsell_events set clicked_at = created_at where clicked_at is null;

create or replace function public.mirror_revenue_intent_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.upsell_events(property_id, event_type, fun_id, upsell_card_id, clicked_at)
  values (new.property_id, 'upsell_click', new.fun_id, new.upsell_card_id, new.clicked_at);
  return new;
end $$;
revoke all on function public.mirror_revenue_intent_event() from public, anon, authenticated;
create trigger mirror_revenue_intent_event after insert on public.revenue_intent_events
  for each row execute function public.mirror_revenue_intent_event();

create table public.property_revenue_config (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties(id) on delete cascade,
  prearrival_window_hours integer not null default 48 check (prearrival_window_hours between 1 and 168),
  max_upsells_per_stay integer not null default 2 check (max_upsells_per_stay between 1 and 3),
  post_stay_rebook_window_hours integer not null default 72 check (post_stay_rebook_window_hours between 1 and 720),
  rebook_discount_pct numeric(5,2) check (rebook_discount_pct between 0 and 100),
  rebook_discount_flat_usd numeric(8,2) check (rebook_discount_flat_usd >= 0),
  rebook_attributed_revenue_usd numeric(8,2) check (rebook_attributed_revenue_usd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rebook_discount_pct is null or rebook_discount_flat_usd is null)
);
create trigger property_revenue_config_updated_at before update on public.property_revenue_config
  for each row execute function public.set_updated_at();

create table public.upsell_deliveries (
  id uuid primary key default gen_random_uuid(),
  guest_session_id uuid not null references public.guest_sessions(id) on delete cascade,
  upsell_card_id uuid references public.upsell_cards(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  fun_id uuid not null references public.guest_identities(fun_id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'inapp')),
  delivery_type text not null check (delivery_type in ('prearrival', 'rebook')),
  delivered_at timestamptz not null default now(),
  whatsapp_message_id text,
  check ((delivery_type = 'prearrival' and upsell_card_id is not null) or
         (delivery_type = 'rebook' and upsell_card_id is null))
);
create unique index upsell_deliveries_prearrival_once
  on public.upsell_deliveries(guest_session_id, upsell_card_id) where upsell_card_id is not null;
create unique index upsell_deliveries_rebook_once
  on public.upsell_deliveries(guest_session_id) where delivery_type = 'rebook';
create index upsell_deliveries_property_idx on public.upsell_deliveries(property_id, delivered_at desc);

create table public.upsell_conversions (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references public.upsell_deliveries(id) on delete set null,
  guest_session_id uuid references public.guest_sessions(id) on delete cascade,
  upsell_card_id uuid not null references public.upsell_cards(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  fun_id uuid references public.guest_identities(fun_id) on delete set null,
  conversion_type text not null check (conversion_type in ('click', 'booking_intent', 'rebook_click')),
  attributed_revenue_usd numeric(8,2) check (attributed_revenue_usd is null or attributed_revenue_usd >= 0),
  source text not null check (source in ('prearrival', 'inapp', 'rebook')),
  converted_at timestamptz not null default now()
);
create index upsell_conversions_property_idx on public.upsell_conversions(property_id, converted_at desc);

alter table public.guest_sessions enable row level security;
alter table public.property_revenue_config enable row level security;
alter table public.upsell_deliveries enable row level security;
alter table public.upsell_conversions enable row level security;
grant select, insert, update, delete on public.property_revenue_config, public.upsell_deliveries, public.upsell_conversions to authenticated;

create policy "owners manage revenue config" on public.property_revenue_config for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy "owners manage deliveries" on public.upsell_deliveries for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy "owners manage conversions" on public.upsell_conversions for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create or replace function public.get_upsell_intent_scores(p_fun_id uuid, p_property_id uuid, p_card_ids uuid[])
returns table(card_id uuid, score numeric, event_count bigint, display_order integer)
language sql security definer set search_path = public stable as $$
  select c.id as card_id,
    count(e.id)::numeric + count(e.id) filter (where e.fun_id = p_fun_id)::numeric * 2 as score,
    count(e.id) as event_count, c.display_order
  from public.upsell_cards c
  left join public.upsell_cards peer on peer.moment = c.moment
  left join public.upsell_events e on e.upsell_card_id = peer.id
    and coalesce(e.clicked_at, e.created_at) > now() - interval '90 days'
  where c.property_id = p_property_id and c.id = any(p_card_ids) and c.active
  group by c.id, c.display_order
  order by score desc, c.display_order asc;
$$;
revoke all on function public.get_upsell_intent_scores(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.get_upsell_intent_scores(uuid, uuid, uuid[]) to service_role;

create or replace function public.record_upsell_conversion(
  p_delivery_id uuid, p_guest_session_id uuid, p_upsell_card_id uuid, p_property_id uuid,
  p_fun_id uuid, p_conversion_type text, p_attributed_revenue_usd numeric, p_source text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_revenue numeric;
begin
  if p_conversion_type not in ('click', 'booking_intent', 'rebook_click') or p_source not in ('prearrival', 'inapp', 'rebook') then
    raise exception 'Invalid conversion';
  end if;
  select attributed_revenue_usd into v_revenue from public.upsell_cards
    where id = p_upsell_card_id and property_id = p_property_id and active;
  if not found then
    raise exception 'Offer not found';
  end if;
  if p_delivery_id is not null and not exists (
    select 1 from public.upsell_deliveries where id = p_delivery_id and property_id = p_property_id
      and (upsell_card_id = p_upsell_card_id or delivery_type = 'rebook')
  ) then raise exception 'Delivery not found'; end if;
  insert into public.upsell_conversions(delivery_id, guest_session_id, upsell_card_id, property_id,
    fun_id, conversion_type, attributed_revenue_usd, source)
  values (p_delivery_id, p_guest_session_id, p_upsell_card_id, p_property_id, p_fun_id,
    p_conversion_type, v_revenue, p_source) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.record_upsell_conversion(uuid,uuid,uuid,uuid,uuid,text,numeric,text) from public;
grant execute on function public.record_upsell_conversion(uuid,uuid,uuid,uuid,uuid,text,numeric,text) to anon, authenticated;

create or replace view public.property_revenue_summary with (security_invoker = true) as
select property_id,
  count(*) filter (where conversion_type = 'click') as total_clicks,
  count(*) filter (where conversion_type = 'rebook_click') as rebook_clicks,
  coalesce(sum(attributed_revenue_usd), 0) as total_attributed_revenue_usd,
  date_trunc('day', converted_at) as day
from public.upsell_conversions
group by property_id, date_trunc('day', converted_at);
grant select on public.property_revenue_summary to authenticated;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'dispatch-prearrival-upsells') then perform cron.unschedule('dispatch-prearrival-upsells'); end if;
  perform cron.schedule('dispatch-prearrival-upsells', '*/15 * * * *', $job$
    select net.http_post(url := current_setting('app.supabase_functions_url') || '/dispatch-prearrival-upsell',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('app.service_role_key')),
      body := '{}'::jsonb);
  $job$);
  if exists (select 1 from cron.job where jobname = 'dispatch-rebook-offers') then perform cron.unschedule('dispatch-rebook-offers'); end if;
  perform cron.schedule('dispatch-rebook-offers', '*/15 * * * *', $job$
    select net.http_post(url := current_setting('app.supabase_functions_url') || '/dispatch-rebook-offer',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('app.service_role_key')),
      body := '{}'::jsonb);
  $job$);
end $$;
