create extension if not exists pgcrypto;

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  pricing_tier text not null default 'starter' check (pricing_tier in ('starter', 'growth', 'enterprise')),
  created_at timestamptz not null default now()
);

create table public.portfolio_properties (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (portfolio_id, property_id),
  unique (property_id)
);

create table public.knowledge_templates (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  category text not null default 'general' check (category in ('general', 'dining', 'transport', 'activities', 'amenities')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_template_deployments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.knowledge_templates(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  deployed_at timestamptz not null default now(),
  deployed_by uuid not null references auth.users(id),
  unique (template_id, property_id)
);

create or replace function public.can_view_portfolio(p_portfolio_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.portfolios pf where pf.id = p_portfolio_id and
      (pf.owner_user_id = auth.uid() or exists (
        select 1 from public.portfolio_properties pp join public.properties p on p.id = pp.property_id
        where pp.portfolio_id = pf.id and (p.owner_id = auth.uid() or exists (
          select 1 from public.user_profiles u where u.id = auth.uid() and u.property_id = p.id
        ))
      ))
  );
$$;
revoke all on function public.can_view_portfolio(uuid) from public, anon;
grant execute on function public.can_view_portfolio(uuid) to authenticated;

alter table public.portfolios enable row level security;
alter table public.portfolio_properties enable row level security;
alter table public.knowledge_templates enable row level security;
alter table public.knowledge_template_deployments enable row level security;
grant select, insert, update, delete on public.portfolios, public.portfolio_properties, public.knowledge_templates, public.knowledge_template_deployments to authenticated;

create policy "portfolio members view portfolios" on public.portfolios for select to authenticated using (public.can_view_portfolio(id));
create policy "owners create portfolios" on public.portfolios for insert to authenticated with check (owner_user_id = auth.uid());
create policy "owners update portfolios" on public.portfolios for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "owners delete portfolios" on public.portfolios for delete to authenticated using (owner_user_id = auth.uid());
create policy "portfolio members view properties" on public.portfolio_properties for select to authenticated using (public.can_view_portfolio(portfolio_id));
create policy "owners add properties" on public.portfolio_properties for insert to authenticated with check (
  exists (select 1 from public.portfolios pf join public.properties p on p.id = property_id
    where pf.id = portfolio_id and pf.owner_user_id = auth.uid() and p.owner_id = auth.uid())
);
create policy "owners remove properties" on public.portfolio_properties for delete to authenticated using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.owner_user_id = auth.uid()));

create or replace function public.refresh_portfolio_pricing_tier()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_portfolio_id uuid;
begin
  v_portfolio_id := case when tg_op = 'DELETE' then old.portfolio_id else new.portfolio_id end;
  update public.portfolios p set pricing_tier = case
    when p.pricing_tier = 'enterprise' then 'enterprise'
    when (select count(*) from public.portfolio_properties pp where pp.portfolio_id = v_portfolio_id) >= 3 then 'growth'
    else 'starter' end
  where p.id = v_portfolio_id;
  return null;
end;
$$;
revoke all on function public.refresh_portfolio_pricing_tier() from public, anon, authenticated;
create trigger refresh_portfolio_pricing_tier after insert or delete on public.portfolio_properties
  for each row execute function public.refresh_portfolio_pricing_tier();

create policy "portfolio members view templates" on public.knowledge_templates for select to authenticated using (public.can_view_portfolio(portfolio_id));
create policy "owners create templates" on public.knowledge_templates for insert to authenticated with check (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.owner_user_id = auth.uid()));
create policy "owners update templates" on public.knowledge_templates for update to authenticated using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.owner_user_id = auth.uid())) with check (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.owner_user_id = auth.uid()));
create policy "owners delete templates" on public.knowledge_templates for delete to authenticated using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.owner_user_id = auth.uid()));
create policy "portfolio members view deployments" on public.knowledge_template_deployments for select to authenticated using (exists (select 1 from public.knowledge_templates t where t.id = template_id and public.can_view_portfolio(t.portfolio_id)));
create policy "owners deploy templates" on public.knowledge_template_deployments for insert to authenticated with check (deployed_by = auth.uid() and exists (select 1 from public.knowledge_templates t join public.portfolios p on p.id = t.portfolio_id where t.id = template_id and p.owner_user_id = auth.uid()) and exists (select 1 from public.knowledge_templates t join public.portfolio_properties pp on pp.portfolio_id = t.portfolio_id where t.id = template_id and pp.property_id = property_id));

create trigger knowledge_templates_updated_at before update on public.knowledge_templates
  for each row execute function public.set_updated_at();

create or replace function public.deploy_knowledge_template()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_template public.knowledge_templates;
begin
  select * into v_template from public.knowledge_templates where id = new.template_id;
  insert into public.knowledge_entries (property_id, source_type, title, body, status)
  values (new.property_id, 'manual', v_template.title, v_template.body, 'approved');
  return new;
end;
$$;
revoke all on function public.deploy_knowledge_template() from public, anon, authenticated;
create trigger deploy_knowledge_template after insert on public.knowledge_template_deployments
  for each row execute function public.deploy_knowledge_template();

create or replace function public.get_portfolio_dashboard(p_portfolio_id uuid, p_since timestamptz default now() - interval '30 days')
returns table (property_id uuid, property_name text, conversations_30d bigint, avg_guest_rating numeric, coverage_gap boolean, top_unanswered_category text)
language sql security definer stable set search_path = public as $$
  select p.id, p.name, count(c.id), null::numeric,
    count(c.id) filter (where not c.resolved) > 0,
    (select coalesce(nullif(trim(c2.intent), ''), 'Unknown') from public.conversations c2
      where c2.property_id = p.id and c2.created_at >= p_since and not c2.resolved
      group by coalesce(nullif(trim(c2.intent), ''), 'Unknown') order by count(*) desc limit 1)
  from public.portfolio_properties pp join public.properties p on p.id = pp.property_id
  left join public.conversations c on c.property_id = p.id and c.created_at >= p_since
  where pp.portfolio_id = p_portfolio_id and public.can_view_portfolio(p_portfolio_id)
  group by p.id, p.name;
$$;
revoke all on function public.get_portfolio_dashboard(uuid, timestamptz) from public, anon;
grant execute on function public.get_portfolio_dashboard(uuid, timestamptz) to authenticated;
