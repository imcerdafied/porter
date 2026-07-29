create extension if not exists pg_net with schema extensions;

alter table public.properties
  add column if not exists staff_sms_numbers text[] not null default '{}',
  add column if not exists staff_email_addresses text[] not null default '{}',
  add column if not exists escalation_confidence_threshold numeric not null default 0.6
    check (escalation_confidence_threshold between 0 and 1),
  add column if not exists escalation_keywords text[] not null default
    array['emergency','fire','ambulance','police','assault','help me'];

alter table public.conversations
  add column if not exists guest_name text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.messages drop constraint if exists messages_role_check;
alter table public.messages add constraint messages_role_check
  check (role in ('user', 'assistant', 'staff'));

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.escalations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  reason text not null check (reason in ('low_confidence', 'guest_request', 'keyword', 'manual', 'ai_handoff')),
  assigned_staff_id uuid references auth.users(id) on delete set null,
  opened_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index escalations_one_active_per_conversation
  on public.escalations(conversation_id) where status <> 'resolved';
create index escalations_property_active on public.escalations(property_id, created_at desc)
  where status <> 'resolved';
create index messages_conversation_asc on public.messages(conversation_id, created_at);

create table public.inbox_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  escalation_id uuid references public.escalations(id) on delete set null,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger conversations_escalation_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();
create trigger escalations_updated_at before update on public.escalations
  for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.escalations enable row level security;
alter table public.inbox_events enable row level security;
grant select, update on public.escalations to authenticated;
grant select on public.conversations, public.messages to authenticated;
grant insert on public.messages, public.inbox_events to authenticated;
grant select, update on public.user_profiles to authenticated;

create policy "staff read own profile" on public.user_profiles for select to authenticated using (id = auth.uid());
create policy "staff update own profile" on public.user_profiles for update to authenticated using (id = auth.uid());
create policy "staff read escalations" on public.escalations for select to authenticated using (
  exists (select 1 from public.user_profiles u where u.id = auth.uid() and u.property_id = property_id)
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
);
create policy "staff update escalations" on public.escalations for update to authenticated using (
  exists (select 1 from public.user_profiles u where u.id = auth.uid() and u.property_id = property_id)
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.user_profiles u where u.id = auth.uid() and u.property_id = property_id)
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
);
create policy "staff read escalation conversations" on public.conversations for select to authenticated using (
  exists (select 1 from public.user_profiles u where u.id = auth.uid() and u.property_id = property_id)
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
);
create policy "staff read escalation messages" on public.messages for select to authenticated using (
  exists (select 1 from public.conversations c left join public.user_profiles u
    on u.property_id = c.property_id and u.id = auth.uid()
    left join public.properties p on p.id = c.property_id and p.owner_id = auth.uid()
    where c.id = conversation_id and (u.id is not null or p.id is not null))
);
create policy "staff insert replies" on public.messages for insert to authenticated with check (
  role = 'staff' and exists (select 1 from public.conversations c left join public.user_profiles u
    on u.property_id = c.property_id and u.id = auth.uid()
    left join public.properties p on p.id = c.property_id and p.owner_id = auth.uid()
    where c.id = conversation_id and (u.id is not null or p.id is not null))
);
create policy "staff record inbox events" on public.inbox_events for insert to authenticated with check (
  exists (select 1 from public.user_profiles u where u.id = auth.uid() and u.property_id = property_id)
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
);

alter publication supabase_realtime add table public.escalations;
alter publication supabase_realtime add table public.messages;

create or replace function public.resolve_stale_escalations()
returns void language sql security definer set search_path = public as $$
  update public.escalations e set status = 'resolved', resolved_at = now()
  where e.status <> 'resolved' and e.created_at <= now() - interval '4 hours'
    and not exists (select 1 from public.messages m where m.conversation_id = e.conversation_id
      and m.role = 'user' and m.created_at > e.created_at);
$$;
revoke all on function public.resolve_stale_escalations() from public, anon, authenticated;
select cron.schedule('porter-resolve-stale-escalations', '*/10 * * * *',
  'select public.resolve_stale_escalations()');

comment on table public.escalations is 'Active and resolved Philoxenia-rule human handoffs.';
