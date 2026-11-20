# Plano de Implementação — FinanceiroCasal 🏠

App para o casal registrar os depósitos nas caixinhas e investimentos, acompanhando quanto cada um já guardou e quanto os dois têm juntos rumo à meta de **R$ 100.000** para o apartamento.

---

## 1. Visão geral

| Item | Decisão |
|---|---|
| Tipo de app | PWA (instalável no celular pelo navegador, sem loja de apps) |
| Usuários | 2 pessoas (o casal), cada um com seu login |
| Dados | Compartilhados e sincronizados em tempo real entre os dois celulares |
| Hospedagem | Vercel (frontend) + Supabase (banco de dados e login) |
| Custo | R$ 0: os planos gratuitos dos dois serviços bastam com folga para 2 usuários |

### Por que essa arquitetura?

- **Vercel** hospeda o site de graça, com HTTPS (exigido para PWA) e deploy automático a cada `git push` na `main`.
- **Supabase** oferece banco Postgres, autenticação e atualizações em tempo real no plano gratuito, sem precisar escrever nem manter um backend próprio.
- Com **Row Level Security (RLS)** no Supabase, só os dois e-mails autorizados conseguem ler ou gravar dados, mesmo que alguém descubra a URL do app.

> ⚠️ Observação: no plano gratuito, o Supabase pausa projetos após ~7 dias sem nenhum acesso. Como vocês vão usar o app com frequência, isso dificilmente acontece; se acontecer, basta reativar com um clique no painel.

---

## 2. Stack tecnológica

- **React + TypeScript + Vite**: frontend rápido e simples (SPA, sem servidor próprio)
- **Tailwind CSS**: estilização mobile-first
- **vite-plugin-pwa**: manifest, service worker e ícones, para instalar como app
- **Supabase JS**: login, banco e realtime
- **Recharts**: gráfico da evolução do patrimônio
- **React Router**: navegação entre telas
- **date-fns**: formatação de datas em pt-BR

---

## 3. Funcionalidades

### MVP (versão 1)
1. **Login** por e-mail + senha, restrito aos 2 e-mails do casal. *(Antes o plano era link mágico, mas no iPhone o link abre no Safari e não no PWA instalado.)*
2. **Dashboard (tela inicial)**
   - Barra de progresso grande: `total juntos / R$ 100.000` e o percentual.
   - Card de cada pessoa: quanto já guardou e sua % de contribuição.
   - Quanto falta para a meta.
   - Últimos lançamentos.
3. **Novo lançamento**
   - Valor (R$), data, tipo (**depósito**, **rendimento** ou **retirada**), destino (caixinha ou investimento) e observação opcional.
   - Quem lançou é registrado automaticamente pelo usuário logado.
4. **Histórico**: lista de todos os lançamentos, com filtro por pessoa, tipo e destino; permite editar e excluir os próprios lançamentos.
5. **Destinos (caixinhas/investimentos)**: cadastro dos lugares onde o dinheiro está (ex.: "Caixinha Nubank", "CDB Inter", "Tesouro Selic") e saldo por destino.
6. **Tempo real**: quando um lança, o outro vê atualizar na hora.
7. **PWA**: instalável no Android (Chrome) e no iPhone (Safari → "Adicionar à Tela de Início"), com ícone e splash próprios.

### Versão 2 (melhorias futuras)
- Gráfico da evolução do total ao longo dos meses.
- Previsão: "no ritmo atual, vocês atingem a meta em **mês/ano**".
- Meta editável (e possibilidade de várias metas: apartamento, reserva, móveis…).
- Marcos comemorativos (25%, 50%, 75%, 100%) com animação 🎉.
- Notificações push ("Fulana guardou R$ 500!").
- Modo escuro.
- Exportar dados em CSV.

---

## 4. Modelo de dados (Supabase / Postgres)

> **Implementado no esquema `financeiro`** (e não em `public`) para poder dividir um projeto Supabase com outro app. O perfil é criado pelo próprio app no primeiro login, sem gatilho em `auth.users`. O SQL real está em `supabase/migrations/001_init.sql`.

```sql
-- Perfis (1 por usuário autenticado)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',   -- cor da pessoa nos gráficos
  created_at timestamptz default now()
);

-- Meta do casal
create table goals (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Apartamento',
  target_amount numeric(12,2) not null default 100000,
  created_at timestamptz default now()
);

-- Onde o dinheiro está
create table destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- ex.: "Caixinha Nubank"
  kind text not null check (kind in ('caixinha','investimento')),
  created_at timestamptz default now()
);

-- Lançamentos
create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) default auth.uid(),
  goal_id uuid not null references goals(id),
  destination_id uuid references destinations(id),
  type text not null check (type in ('deposito','rendimento','retirada')),
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz default now()
);
```

**Cálculo do saldo:** `depósitos + rendimentos − retiradas`, por pessoa e no total. Uma *view* SQL (`goal_summary`) devolve tudo pronto para o dashboard.

### Segurança (RLS)
- Tabela `allowed_emails` com os 2 e-mails do casal.
- Política: o usuário só lê e grava se `auth.email()` estiver em `allowed_emails`.
- Em `entries`, editar e excluir só é permitido quando `user_id = auth.uid()`.
- Desativar o cadastro público no Supabase; apenas os e-mails convidados entram.

---

## 5. Telas

```
┌──────────────────────────┐
│  🏠 Nosso Apartamento    │
│                          │
│  R$ 42.350 / R$ 100.000  │
│  ███████████░░░░░  42%   │
│  Faltam R$ 57.650        │
│                          │
│ ┌─────────┐ ┌─────────┐  │
│ │ Lucas   │ │ Ela     │  │
│ │R$ 22.100│ │R$ 20.250│  │
│ │  52%    │ │  48%    │  │
│ └─────────┘ └─────────┘  │
│                          │
│ Últimos lançamentos      │
│ • +R$ 500  Caixinha  hoje│
│ • +R$ 32   Rendim.  ontem│
│                          │
│          [ + ]           │
├──────────────────────────┤
│ 🏠 Início  📜 Histórico ⚙│
└──────────────────────────┘
```

1. **Login**: campo de e-mail → "enviamos um link para você".
2. **Início**: dashboard acima, com botão flutuante "+".
3. **Novo/editar lançamento**: formulário com teclado numérico e valor em R$.
4. **Histórico**: lista agrupada por mês, com filtros.
5. **Ajustes**: nome/cor do perfil, destinos, meta, sair.

---

## 6. Estrutura de pastas

```
FinanceiroCasal/
├─ public/
│  └─ icons/               # ícones do PWA (192, 512, maskable, apple-touch)
├─ src/
│  ├─ lib/
│  │  ├─ supabase.ts       # cliente Supabase
│  │  └─ format.ts         # moeda BRL, datas
│  ├─ hooks/               # useAuth, useEntries, useSummary (com realtime)
│  ├─ components/          # ProgressBar, PersonCard, EntryItem, BottomNav…
│  ├─ pages/               # Login, Dashboard, NewEntry, History, Settings
│  ├─ types.ts
│  ├─ App.tsx
│  └─ main.tsx
├─ supabase/
│  └─ migrations/          # SQL das tabelas, view e políticas RLS
├─ .env.example            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├─ vite.config.ts          # inclui configuração do PWA
└─ README.md
```

---

## 7. Etapas de implementação

### Fase 0: Configuração das contas (feita por você, ~15 min)
- [ ] Criar conta no [Supabase](https://supabase.com) e um projeto novo.
- [ ] Criar conta na [Vercel](https://vercel.com) entrando com o GitHub.
- [ ] Copiar a `Project URL` e a `anon key` do Supabase (*Settings → API*).

### Fase 1: Base do projeto
- [ ] Criar o projeto Vite + React + TS + Tailwind.
- [ ] Configurar ESLint/Prettier, React Router e o cliente Supabase.
- [ ] `.env.example` e `.gitignore` (o `.env` com as chaves **nunca** vai para o Git).

### Fase 2: Banco de dados
- [ ] Escrever as migrations SQL (tabelas, view `goal_summary`, RLS).
- [ ] Rodar no SQL Editor do Supabase.
- [ ] Popular a meta inicial (R$ 100.000) e os destinos iniciais.

### Fase 3: Autenticação
- [ ] Tela de login por e-mail + senha (usuários criados no painel do Supabase).
- [ ] Proteção de rotas e criação do perfil no primeiro acesso.
- [ ] Restringir aos 2 e-mails autorizados.

### Fase 4: Funcionalidades principais
- [ ] Dashboard com progresso total e por pessoa.
- [ ] Formulário de lançamento (criar e editar).
- [ ] Histórico com filtros e exclusão.
- [ ] Cadastro de destinos.
- [ ] Assinatura realtime para atualizar automaticamente.

### Fase 5: PWA
- [ ] Manifest (nome, cores, ícones), service worker e tela offline.
- [ ] Testar a instalação no Android e no iPhone.

### Fase 6: Deploy
- [ ] Importar o repositório na Vercel.
- [ ] Configurar as variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- [ ] Adicionar a URL da Vercel em *Supabase → Authentication → URL Configuration* (para o link mágico funcionar).
- [ ] Cada `git push` na `main` passa a publicar automaticamente.

### Fase 7: Melhorias (versão 2)
- [ ] Itens da seção 3, por ordem de prioridade do casal.

---

## 8. Como cada um instala o app

**Android (Chrome):** abrir a URL → menu ⋮ → "Instalar app".
**iPhone (Safari):** abrir a URL → botão Compartilhar → "Adicionar à Tela de Início".

Depois disso o app abre em tela cheia, com ícone próprio, como um app nativo.

---

## 9. Decisões em aberto

- Nome e cores do app (ícone).
- Lista inicial de caixinhas e investimentos de cada um.
- Os rendimentos serão lançados manualmente (ex.: 1x por mês) ou só os depósitos? *(Sugestão: manual, tipo "rendimento", no início.)*
- Quem pode editar o lançamento do outro? *(Sugestão: cada um edita só os seus.)*
