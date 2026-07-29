create extension if not exists pg_net schema extensions;

-- Extend the existing concierge property record so onboarding and guest chat
-- continue to share one property identity.
alter table public.properties
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists address text,
  add column if not exists star_rating smallint check (star_rating between 1 and 5),
  add column if not exists primary_language text not null default 'en',
  add column if not exists contact_email text,
  add column if not exists status text not null default 'onboarding'
    check (status in ('onboarding', 'ingesting', 'review', 'active')),
  add column if not exists wizard_step smallint not null default 1
    check (wizard_step between 1 and 5),
  add column if not exists wizard_started_at timestamptz not null default now(),
  add column if not exists activated_at timestamptz;

-- These legacy fields are populated when a concierge is provisioned, after
-- onboarding. Existing rows retain their values.
alter table public.properties alter column slug drop not null;
alter table public.properties alter column admin_token drop not null;

grant select, insert, update on public.properties to authenticated;
create policy "onboarding owner select" on public.properties
  for select to authenticated using (auth.uid() = owner_id);
create policy "onboarding owner insert" on public.properties
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "onboarding owner update" on public.properties
  for update to authenticated using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create table public.ingestion_sources (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source_type text not null check (source_type in ('url', 'pdf', 'faq')),
  label text,
  storage_path text,
  raw_content text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'done', 'error')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ingestion_sources enable row level security;
grant select, insert, update on public.ingestion_sources to authenticated;

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source_id uuid references public.ingestion_sources(id) on delete set null,
  source_type text not null check (source_type in ('url', 'pdf', 'faq', 'manual')),
  title text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.knowledge_entries enable row level security;
grant select, insert, update on public.knowledge_entries to authenticated;

create table public.wizard_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  event_name text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.wizard_events enable row level security;
grant select, insert on public.wizard_events to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['ingestion_sources', 'knowledge_entries', 'wizard_events'] loop
    execute format('create policy "owner select" on public.%I for select to authenticated using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))', table_name);
  end loop;
end $$;
create policy "owner insert" on public.ingestion_sources for insert to authenticated with check
  (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy "owner update" on public.ingestion_sources for update to authenticated using
  (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy "owner insert" on public.knowledge_entries for insert to authenticated with check
  (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy "owner update" on public.knowledge_entries for update to authenticated using
  (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy "owner insert" on public.wizard_events for insert to authenticated with check
  (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create trigger ingestion_sources_updated_at before update on public.ingestion_sources
  for each row execute function public.set_updated_at();
create trigger knowledge_entries_updated_at before update on public.knowledge_entries
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-docs', 'property-docs', false, 20971520, array['application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "owners upload property documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-docs' and (storage.foldername(name))[1] in
    (select id::text from public.properties where owner_id = auth.uid()));
create policy "owners read property documents" on storage.objects for select to authenticated
  using (bucket_id = 'property-docs' and (storage.foldername(name))[1] in
    (select id::text from public.properties where owner_id = auth.uid()));

alter publication supabase_realtime add table public.ingestion_sources;
