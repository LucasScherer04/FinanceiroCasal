-- =====================================================================
-- FinanceiroCasal: estrutura inicial (esquema isolado "financeiro")
--
-- Tudo fica dentro do esquema "financeiro", então pode rodar num projeto
-- Supabase que já tem outro app: nada no esquema "public" nem em
-- "auth.users" é criado, alterado ou apagado.
--
-- Rode este arquivo INTEIRO em: SQL Editor > New query > Run.
-- ANTES de rodar, troque os 2 e-mails na seção 6.
-- DEPOIS, exponha o esquema: Project Settings > Data API > Exposed schemas
-- (adicione "financeiro" sem remover os que já estão lá).
-- =====================================================================

create schema if not exists financeiro;

-- 1. E-mails autorizados (só eles acessam qualquer dado deste app)
create table if not exists financeiro.allowed_emails (
  email text primary key
);
alter table financeiro.allowed_emails enable row level security;
-- sem políticas: ninguém lê/escreve pelo app; só pelo painel do Supabase

create or replace function financeiro.is_member()
returns boolean
language sql
stable
security definer
set search_path = financeiro
as $$
  select exists (
    select 1 from financeiro.allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2. Perfis (criados pelo próprio app no primeiro login)
create table if not exists financeiro.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#059669',
  created_at timestamptz not null default now()
);

-- 3. Meta
create table if not exists financeiro.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Nosso apartamento',
  target_amount numeric(12,2) not null default 100000 check (target_amount > 0),
  created_at timestamptz not null default now()
);

-- 4. Destinos (caixinhas / investimentos)
create table if not exists financeiro.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('caixinha', 'investimento')),
  created_at timestamptz not null default now()
);

-- 5. Lançamentos
create table if not exists financeiro.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references financeiro.profiles(id) on delete cascade,
  goal_id uuid not null references financeiro.goals(id) on delete cascade,
  destination_id uuid references financeiro.destinations(id) on delete set null,
  type text not null check (type in ('deposito', 'rendimento', 'retirada')),
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists entries_date_idx on financeiro.entries (date desc);

-- 6. Dados iniciais  >>> TROQUE OS E-MAILS ABAIXO <<<
insert into financeiro.allowed_emails (email) values
  ('seu-email@exemplo.com'),
  ('email-dela@exemplo.com')
on conflict do nothing;

insert into financeiro.goals (title, target_amount)
select 'Nosso apartamento', 100000
where not exists (select 1 from financeiro.goals);

-- 7. Permissões do esquema (a API do Supabase só enxerga o que for liberado)
grant usage on schema financeiro to authenticated;
grant select, insert, update, delete on all tables in schema financeiro to authenticated;
revoke all on financeiro.allowed_emails from authenticated;
grant execute on function financeiro.is_member() to authenticated;

-- 8. Segurança (RLS)
alter table financeiro.profiles     enable row level security;
alter table financeiro.goals        enable row level security;
alter table financeiro.destinations enable row level security;
alter table financeiro.entries      enable row level security;

-- perfis: membros leem todos; cada um cria/edita só o seu
drop policy if exists "profiles_select" on financeiro.profiles;
create policy "profiles_select" on financeiro.profiles
  for select to authenticated using (financeiro.is_member());
drop policy if exists "profiles_insert_own" on financeiro.profiles;
create policy "profiles_insert_own" on financeiro.profiles
  for insert to authenticated with check (financeiro.is_member() and id = auth.uid());
drop policy if exists "profiles_update_own" on financeiro.profiles;
create policy "profiles_update_own" on financeiro.profiles
  for update to authenticated
  using (financeiro.is_member() and id = auth.uid())
  with check (id = auth.uid());

-- metas e destinos: membros fazem tudo
drop policy if exists "goals_all" on financeiro.goals;
create policy "goals_all" on financeiro.goals
  for all to authenticated using (financeiro.is_member()) with check (financeiro.is_member());
drop policy if exists "destinations_all" on financeiro.destinations;
create policy "destinations_all" on financeiro.destinations
  for all to authenticated using (financeiro.is_member()) with check (financeiro.is_member());

-- lançamentos: membros veem todos; cada um cria/edita/apaga só os seus
drop policy if exists "entries_select" on financeiro.entries;
create policy "entries_select" on financeiro.entries
  for select to authenticated using (financeiro.is_member());
drop policy if exists "entries_insert_own" on financeiro.entries;
create policy "entries_insert_own" on financeiro.entries
  for insert to authenticated with check (financeiro.is_member() and user_id = auth.uid());
drop policy if exists "entries_update_own" on financeiro.entries;
create policy "entries_update_own" on financeiro.entries
  for update to authenticated
  using (financeiro.is_member() and user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "entries_delete_own" on financeiro.entries;
create policy "entries_delete_own" on financeiro.entries
  for delete to authenticated using (financeiro.is_member() and user_id = auth.uid());

-- 9. Tempo real (o outro celular atualiza sozinho)
do $$
declare t text;
begin
  foreach t in array array['entries', 'destinations', 'goals', 'profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'financeiro' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table financeiro.%I', t);
    end if;
  end loop;
end $$;
