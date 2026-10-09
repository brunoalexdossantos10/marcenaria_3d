-- Additive migration: existing projects/configurator are preserved.
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
 logo text, primary_color text not null default '#675443' check(primary_color ~ '^#[0-9A-Fa-f]{6}$'),
 secondary_color text not null default '#f4eee5' check(secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
 whatsapp text, phone text, email text, website text, instagram text,
 published boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text, created_at timestamptz not null default now());
create table public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('OWNER','ADMIN','STAFF','CUSTOMER')) default 'STAFF',
 created_at timestamptz not null default now(), primary key(organization_id,user_id)
);
create index organization_members_user on public.organization_members(user_id,organization_id);
-- One extensible catalog table; data references existing procedural assets.
create table public.catalog_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 kind text not null check(kind in ('model','material','handle','accessory')),
 source_id text not null, name text not null, description text not null default '', active boolean not null default true,
 data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,kind,source_id)
);
create index catalog_items_org on public.catalog_items(organization_id,kind);
create table public.organization_settings (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 settings jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table public.subscription_plans (id text primary key, name text not null, limits jsonb not null default '{}'::jsonb);
insert into public.subscription_plans values ('starter','Starter','{"models":20,"users":1}'),('professional','Professional','{"models":104,"users":5}'),('enterprise','Enterprise','{}');
create table public.subscriptions (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 plan_id text not null references public.subscription_plans(id) default 'starter', status text not null default 'trial',
 next_billing_at timestamptz, created_at timestamptz not null default now()
);
alter table public.projects alter column user_id drop not null;
alter table public.projects add column organization_id uuid references public.organizations(id) on delete cascade;
create index projects_organization_date on public.projects(organization_id,created_at desc);
create table public.leads (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 name text not null, phone text not null, email text, status text not null default 'Novo' check(status in ('Novo','Em contato','Orçamento enviado','Fechado','Perdido')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index leads_organization_date on public.leads(organization_id,created_at desc);
-- Internal lookup avoids recursive RLS on membership. No metadata authorization.
create function app_private.member_role(org uuid) returns text language sql stable security definer set search_path='' as $$
 select role from public.organization_members where organization_id=org and user_id=(select auth.uid())
$$;
revoke all on function app_private.member_role(uuid) from public;
grant execute on function app_private.member_role(uuid) to authenticated;
create function app_private.touch_updated() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger organizations_updated before update on public.organizations for each row execute function app_private.touch_updated();
create trigger catalog_updated before update on public.catalog_items for each row execute function app_private.touch_updated();
create trigger leads_updated before update on public.leads for each row execute function app_private.touch_updated();
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.catalog_items enable row level security;
alter table public.organization_settings enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.leads enable row level security;

grant select,insert,update,delete on public.organizations,public.profiles,public.organization_members,public.catalog_items,public.organization_settings,public.leads,public.projects to authenticated;
grant select on public.subscription_plans,public.subscriptions to authenticated;
create policy profiles_own on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy organizations_read on public.organizations for select to authenticated using(app_private.member_role(id) in ('OWNER','ADMIN','STAFF'));
create policy organizations_update on public.organizations for update to authenticated using(app_private.member_role(id) in ('OWNER','ADMIN')) with check(app_private.member_role(id) in ('OWNER','ADMIN'));
create policy members_read on public.organization_members for select to authenticated using(user_id=(select auth.uid()) or app_private.member_role(organization_id) in ('OWNER','ADMIN'));
-- Membership mutation is deliberately restricted to controlled onboarding, preventing privilege escalation.
create policy catalog_read on public.catalog_items for select to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN','STAFF'));
create policy catalog_write on public.catalog_items for all to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN')) with check(app_private.member_role(organization_id) in ('OWNER','ADMIN'));
create policy settings_read on public.organization_settings for select to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN','STAFF'));
create policy settings_write on public.organization_settings for all to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN')) with check(app_private.member_role(organization_id) in ('OWNER','ADMIN'));
create policy plans_read on public.subscription_plans for select to authenticated using(true);
create policy subscriptions_read on public.subscriptions for select to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN','STAFF'));
create policy leads_access on public.leads for all to authenticated using(app_private.member_role(organization_id) in ('OWNER','ADMIN','STAFF')) with check(app_private.member_role(organization_id) in ('OWNER','ADMIN','STAFF') and exists(select 1 from public.projects p where p.id=project_id and p.organization_id=leads.organization_id));
drop policy "Delete own projects" on public.projects;
drop policy "Update own projects" on public.projects;
drop policy "Insert own projects" on public.projects;
drop policy "Read own projects" on public.projects;
create policy projects_access on public.projects for all to authenticated
 using((organization_id is null and user_id=(select auth.uid())) or app_private.member_role(organization_id) in ('OWNER','ADMIN','STAFF'))
 with check((organization_id is null and user_id=(select auth.uid())) or app_private.member_role(organization_id) in ('OWNER','ADMIN','STAFF'));
-- Atomic onboarding needs elevated privileges to insert first owner membership.
create function public.create_organization(company_name text, company_slug text, profile_name text default '') returns uuid
 language plpgsql security definer set search_path='' as $$
 declare org uuid; begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 if exists(select 1 from public.organization_members where user_id=auth.uid() and role='OWNER') then raise exception 'Sua conta já possui uma marcenaria'; end if;
 insert into public.organizations(name,slug) values(trim(company_name),lower(trim(company_slug))) returning id into org;
 insert into public.organization_members values(org,auth.uid(),'OWNER',now());
 insert into public.profiles(id,name) values(auth.uid(),left(profile_name,120)) on conflict(id) do nothing;
 insert into public.subscriptions(organization_id) values(org);
 insert into public.organization_settings(organization_id) values(org);
 return org; end $$;
revoke all on function public.create_organization(text,text,text) from public,anon;
grant execute on function public.create_organization(text,text,text) to authenticated;
-- Public projection only: no membership, subscription, project or lead data.
create function public.get_public_tenant(tenant_slug text) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('organization',to_jsonb(o)-'created_at'-'updated_at','catalog',coalesce((select jsonb_agg(jsonb_build_object('kind',c.kind,'source_id',c.source_id,'name',c.name,'description',c.description,'active',c.active,'data',c.data)) from public.catalog_items c where c.organization_id=o.id),'[]'::jsonb))
 from public.organizations o where o.slug=tenant_slug and o.published=true
$$;
revoke all on function public.get_public_tenant(text) from public;
grant execute on function public.get_public_tenant(text) to anon,authenticated;
-- Anonymous visitors submit through one validated atomic endpoint, never direct table inserts.
create function public.submit_tenant_quote(tenant_slug text, configuration jsonb, estimated_price numeric, customer_data jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare org uuid; pid uuid:=gen_random_uuid(); pcode text; cname text; cphone text; begin
 select id into org from public.organizations where slug=tenant_slug and published=true;
 if org is null then raise exception 'Marcenaria indisponível'; end if;
 cname:=trim(customer_data->>'name'); cphone:=trim(customer_data->>'phone');
 if cname is null or length(cname) not between 2 and 120 or cphone is null or length(cphone) not between 8 and 30 then raise exception 'Informe nome e telefone válidos'; end if;
 if jsonb_typeof(configuration) <> 'object' or octet_length(configuration::text)>250000 or configuration->>'type' is null or (configuration->>'width')::numeric not between 1 and 1000 or (configuration->>'height')::numeric not between 1 and 1000 or (configuration->>'depth')::numeric not between 1 and 1000 then raise exception 'Configuração inválida'; end if;
 if estimated_price is null or estimated_price not between 0 and 100000000 then raise exception 'Estimativa inválida'; end if;
 if octet_length(customer_data::text)>10000 then raise exception 'Dados do cliente excedem o limite'; end if;
 pcode:='M3D-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(pid::text,'-',''),1,8));
 insert into public.projects(id,organization_id,user_id,code,config,price,customer,status) values(pid,org,null,pcode,configuration,estimated_price,customer_data,'Orçamento');
 insert into public.leads(organization_id,project_id,name,phone,email) values(org,pid,cname,cphone,left(customer_data->>'email',254));
 return jsonb_build_object('id',pid,'code',pcode); end $$;
revoke all on function public.submit_tenant_quote(text,jsonb,numeric,jsonb) from public;
grant execute on function public.submit_tenant_quote(text,jsonb,numeric,jsonb) to anon,authenticated;
