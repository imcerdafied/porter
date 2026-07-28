create extension if not exists "uuid-ossp";

create table public.properties (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 120),
  knowledge_base text not null default '',
  admin_token text not null check (length(admin_token) >= 16),
  logo_url text,
  accent_color text not null default '#1a56db'
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  whatsapp_phone_number_id text unique,
  twilio_number text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  channel text not null check (channel in ('web', 'whatsapp', 'sms')),
  thread_key text not null check (length(thread_key) between 1 and 180),
  created_at timestamptz not null default now(),
  unique (property_id, channel, thread_key)
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 8000),
  escalation_flag boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from anon, authenticated, public;

create trigger properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

alter table public.properties enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on table public.properties from anon, authenticated;
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

create index idx_conversations_thread
  on public.conversations(property_id, channel, thread_key);

create index idx_messages_conversation_created
  on public.messages(conversation_id, created_at desc);

create index idx_messages_escalation
  on public.messages(escalation_flag, created_at desc)
  where escalation_flag = true;

comment on table public.properties is
  'Server-only Porter property configuration. Browser access goes through Edge Functions.';
comment on column public.properties.admin_token is
  'MVP static admin token. Rotate before go-live and never expose through public property config.';
