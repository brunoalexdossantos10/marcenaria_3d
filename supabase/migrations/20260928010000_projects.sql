create table public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  config jsonb not null,
  price numeric(12, 2) not null check (price >= 0),
  customer jsonb,
  status text not null default 'Novo projeto'
);

create index projects_user_created_idx on public.projects (user_id, created_at desc);
alter table public.projects enable row level security;

create policy "Read own projects" on public.projects for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Insert own projects" on public.projects for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own projects" on public.projects for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Delete own projects" on public.projects for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.projects to authenticated;
