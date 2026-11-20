# Nosso Apê 🏠💚

PWA para o casal registrar os depósitos nas caixinhas e investimentos rumo à meta de **R$ 100.000** para o apartamento.

Stack: React + TypeScript + Vite + Tailwind · Supabase (banco, login, tempo real) · Vercel (hospedagem).
Plano completo: [PLANO_DE_IMPLEMENTACAO.md](PLANO_DE_IMPLEMENTACAO.md).

---

## Configuração (uma vez só)

### 1. Supabase: banco de dados
1. Abra o projeto no Supabase → **SQL Editor** → **New query**.
2. Cole o conteúdo de [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql).
3. **Troque os 2 e-mails** na seção 7 do script pelos e-mails de vocês.
4. Clique em **Run**.

### 2. Supabase: usuários
1. **Authentication → Users → Add user → Create new user**.
2. Crie um usuário para cada um (e-mail + senha), marcando **Auto Confirm User**.
3. Em **Authentication → Sign In / Providers**, **desative "Allow new users to sign up"**, para ninguém mais conseguir se cadastrar.

> Login é por e-mail + senha (e não por link mágico) porque, no iPhone, o link do e-mail abre no Safari e não no app instalado.

### 3. Vercel: variáveis de ambiente e deploy
1. Na Vercel: **Add New → Project → importe `FinanceiroCasal`** do GitHub (o preset "Vite" é detectado sozinho).
2. Em **Settings → Environment Variables**, cadastre (pegue os valores em *Supabase → Project Settings → API*):

   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | chave `anon` / `publishable` |

   *Alternativa:* conectar pela integração Supabase ↔ Vercel. O app também entende os nomes que ela cria (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` etc.).
3. **Deployments → Redeploy** (as variáveis só valem para builds feitos depois de cadastradas).

#### 🔐 Sobre segurança das chaves
- A URL e a chave **anon/publishable** são feitas para ficar no navegador: qualquer app web com Supabase as expõe no JavaScript. Ficar na Vercel serve para não estarem no GitHub, mas elas **não são segredo**.
- Quem protege os dados é o **RLS** (Row Level Security) do script SQL: só os 2 e-mails autorizados e logados conseguem ler ou gravar qualquer coisa, e cada um só edita os próprios lançamentos.
- **Nunca** cadastre a `service_role` key como variável `VITE_*`. O [`vite.config.ts`](vite.config.ts) lê só as variáveis públicas, por nome, então mesmo que a integração crie a `SUPABASE_SERVICE_ROLE_KEY` na Vercel, ela não entra no app.

### 4. Instalar no celular
- **Android (Chrome):** abrir a URL da Vercel → menu ⋮ → **Instalar app**.
- **iPhone (Safari):** abrir a URL → **Compartilhar** → **Adicionar à Tela de Início**.

---

## Rodar localmente (opcional)

```bash
npm install
npx vercel link            # liga a pasta ao projeto da Vercel
npx vercel env pull .env.local   # baixa as variáveis (o arquivo é ignorado pelo git)
npm run dev
```

Outros comandos: `npm run build` (gera `dist/`), `npm run icons` (regera os ícones a partir de `public/icon.svg`).

## Estrutura

```
src/
  lib/          cliente Supabase e formatação (R$, datas)
  hooks/        useAuth (sessão) e useData (dados + tempo real)
  components/   Layout/abas, barra de progresso, item de lançamento, campo de valor
  pages/        Login, Dashboard, EntryForm, History, Settings
supabase/migrations/001_init.sql   tabelas, RLS, realtime e dados iniciais
```
