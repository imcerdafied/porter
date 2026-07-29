create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

alter table public.properties
  add column if not exists staff_role text not null default 'gm'
    check (staff_role in ('gm', 'admin')),
  add column if not exists pilot_start_date date,
  add column if not exists pilot_report_status text not null default 'pending'
    check (pilot_report_status in ('pending', 'generating', 'ready', 'failed'));

update public.properties
set pilot_start_date = coalesce(activated_at::date, created_at::date)
where status = 'active' and pilot_start_date is null;

alter table public.conversations
  add column if not exists resolved boolean not null default false,
  add column if not exists escalated boolean not null default false,
  add column if not exists intent text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text;

create table if not exists public.upsell_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);
alter table public.upsell_events enable row level security;
grant select on public.upsell_events to authenticated;
create policy "owners read upsell events" on public.upsell_events for select to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create table if not exists public.dashboard_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.dashboard_events enable row level security;
grant insert on public.dashboard_events to authenticated;
create policy "owners record dashboard events" on public.dashboard_events for insert to authenticated
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create index if not exists idx_conversations_property_created on public.conversations(property_id, created_at desc);
create index if not exists idx_upsell_events_property_created on public.upsell_events(property_id, created_at desc);

create or replace function public.get_dashboard_stats(
  p_property_id uuid, p_since timestamptz, p_until timestamptz default now()
) returns table (
  total_conversations bigint, resolved_conversations bigint,
  escalated_conversations bigint, upsell_clicks bigint, identities_captured bigint
) language sql security definer set search_path = public stable as $$
  with allowed as materialized (
    select 1 where auth.role() = 'service_role' or exists (
      select 1 from public.properties p where p.id = p_property_id and p.owner_id = auth.uid()
        and p.staff_role in ('gm', 'admin')
    )
  )
  select count(*),
    count(*) filter (where c.resolved and not c.escalated),
    count(*) filter (where c.escalated),
    (select count(*) from public.upsell_events u where u.property_id = p_property_id
      and u.event_type = 'upsell_click' and u.created_at >= p_since and u.created_at < p_until
      and exists (select 1 from allowed)),
    count(*) filter (where nullif(trim(c.guest_email), '') is not null or nullif(trim(c.guest_phone), '') is not null)
  from public.conversations c cross join allowed
  where c.property_id = p_property_id and c.created_at >= p_since and c.created_at < p_until
  ;
$$;
revoke all on function public.get_dashboard_stats(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_dashboard_stats(uuid, timestamptz, timestamptz) to authenticated, service_role;

create or replace function public.get_top_intents(
  p_property_id uuid, p_since timestamptz, p_limit integer default 5, p_until timestamptz default now()
) returns table (intent text, conversation_count bigint)
language sql security definer set search_path = public stable as $$
  select coalesce(nullif(trim(c.intent), ''), 'Unknown'), count(*)
  from public.conversations c
  where c.property_id = p_property_id and c.created_at >= p_since and c.created_at < p_until
    and (auth.role() = 'service_role' or exists (
      select 1 from public.properties p where p.id = p_property_id and p.owner_id = auth.uid()
        and p.staff_role in ('gm', 'admin')
    ))
  group by coalesce(nullif(trim(c.intent), ''), 'Unknown')
  order by count(*) desc, coalesce(nullif(trim(c.intent), ''), 'Unknown')
  limit least(greatest(p_limit, 1), 20);
$$;
revoke all on function public.get_top_intents(uuid, timestamptz, integer, timestamptz) from public, anon;
grant execute on function public.get_top_intents(uuid, timestamptz, integer, timestamptz) to authenticated, service_role;

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('pilot-reports', 'pilot-reports', false, array['application/pdf'])
on conflict (id) do update set public = false, allowed_mime_types = excluded.allowed_mime_types;
create policy "staff read own pilot reports" on storage.objects for select to authenticated using (
  bucket_id = 'pilot-reports' and (storage.foldername(name))[1] in (
    select id::text from public.properties where owner_id = auth.uid() and staff_role in ('gm', 'admin')
  )
);

alter publication supabase_realtime add table public.conversations;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'porter-pilot-report-check') then
    perform cron.unschedule('porter-pilot-report-check');
  end if;
  perform cron.schedule('porter-pilot-report-check', '5 0 * * *', $job$
    select net.http_post(
      url := current_setting('app.supabase_functions_url') || '/generate-pilot-report',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')),
      body := '{}'::jsonb
    );
  $job$);
end $$;

comment on column public.properties.pilot_start_date is 'UTC calendar date on which the 30-day Porter pilot begins.';
comment on column public.properties.pilot_report_status is 'Lifecycle state for the generated day-30 report.';
