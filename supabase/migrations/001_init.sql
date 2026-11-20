-- =====================================================================
-- FinanceiroCasal: estrutura inicial
-- Rode este arquivo INTEIRO no Supabase: SQL Editor > New query > Run.
-- ANTES de rodar, troque os 2 e-mails no final (seção 7).
-- =====================================================================

-- 1. E-mails autorizados (só eles acessam qualquer dado)
create table if not exists public.allowed_emails (
  email text primary key
);
alter table public.allowed_emails enable row level security;
-- sem políticas: ninguém lê/escreve pelo app; só pelo painel do Supabase

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2. Perfis
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#059669',
  created_at timestamptz not null default now()
);

-- cria o perfil automaticamente quando o usuário é criado
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Meta
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Nosso apartamento',
  target_amount numeric(12,2) not null default 100000 check (target_amount > 0),
  created_at timestamptz not null default now()
);

-- 4. Destinos (caixinhas / investimentos)
create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('caixinha', 'investimento')),
  created_at timestamptz not null default now()
);

-- 5. Lançamentos
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  destination_id uuid references public.destinations(id) on delete set null,
  type text not null check (type in ('deposito', 'rendimento', 'retirada')),
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists entries_date_idx on public.entries (date desc);

-- 6. Segurança (RLS)
alter table public.profiles     enable row level security;
alter table public.goals        enable row level security;
alter table public.destinations enable row level security;
alter table public.entries      enable row level security;

-- perfis: membros leem todos; cada um edita só o seu
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (public.is_member());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (public.is_member() and id = auth.uid())
  with check (id = auth.uid());

-- metas e destinos: membros fazem tudo
drop policy if exists "goals_all" on public.goals;
create policy "goals_all" on public.goals
  for all to authenticated using (public.is_member()) with check (public.is_member());
drop policy if exists "destinations_all" on public.destinations;
create policy "destinations_all" on public.destinations
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- lançamentos: membros veem todos; cada um cria/edita/apaga só os seus
drop policy if exists "entries_select" on public.entries;
create policy "entries_select" on public.entries
  for select to authenticated using (public.is_member());
drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own" on public.entries
  for insert to authenticated with check (public.is_member() and user_id = auth.uid());
drop policy if exists "entries_update_own" on public.entries;
create policy "entries_update_own" on public.entries
  for update to authenticated
  using (public.is_member() and user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own" on public.entries
  for delete to authenticated using (public.is_member() and user_id = auth.uid());

-- 7. Dados iniciais  >>> TROQUE OS E-MAILS ABAIXO <<<
insert into public.allowed_emails (email) values
  ('seu-email@exemplo.com'),
  ('email-dela@exemplo.com')
on conflict do nothing;

-- perfis de usuários que já existiam antes deste script
insert into public.profiles (id, name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

insert into public.goals (title, target_amount)
select 'Nosso apartamento', 100000
where not exists (select 1 from public.goals);

-- 8. Tempo real (o outro celular atualiza sozinho)
do $$
declare t text;
begin
  foreach t in array array['entries', 'destinations', 'goals', 'profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
