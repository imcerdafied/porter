create table public.upsell_cards (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  moment text not null check (moment in ('late_checkout', 'spa', 'dining', 'general')),
  title text not null check (char_length(title) <= 60),
  body text not null check (char_length(body) <= 160),
  cta_label text not null check (char_length(cta_label) <= 30),
  destination_url text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger upsell_cards_updated_at
  before update on public.upsell_cards
  for each row execute function public.set_updated_at();

create index upsell_cards_property_active_idx
  on public.upsell_cards(property_id, active, display_order);

create table public.revenue_intent_events (
  id uuid primary key default uuid_generate_v4(),
  upsell_card_id uuid not null references public.upsell_cards(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  session_id text not null,
  moment text not null check (moment in ('late_checkout', 'spa', 'dining', 'general')),
  destination_url text not null,
  clicked_at timestamptz not null default now()
);

create index revenue_intent_events_property_clicked_idx
  on public.revenue_intent_events(property_id, clicked_at desc);

alter table public.upsell_cards enable row level security;
alter table public.revenue_intent_events enable row level security;

revoke all on table public.upsell_cards from anon, authenticated;
revoke all on table public.revenue_intent_events from anon, authenticated;
grant select on table public.upsell_cards to anon, authenticated;
grant insert on table public.revenue_intent_events to anon, authenticated;

create policy "upsell_cards_public_select"
  on public.upsell_cards for select
  using (active = true);

create policy "revenue_intent_events_anon_insert"
  on public.revenue_intent_events for insert
  with check (true);

comment on table public.upsell_cards is
  'Property-configured offers managed through Supabase Studio for v1.';
comment on table public.revenue_intent_events is
  'Append-only anonymous upsell click events; Porter does not handle payment.';
