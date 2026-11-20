import { createClient } from '@supabase/supabase-js'

export const isConfigured = Boolean(__SUPABASE_URL__ && __SUPABASE_KEY__)

/** Esquema isolado no Supabase: o app pode dividir o projeto com outros apps. */
export const DB_SCHEMA = 'financeiro'

export const supabase = createClient(
  __SUPABASE_URL__ || 'https://placeholder.supabase.co',
  __SUPABASE_KEY__ || 'placeholder',
  {
    db: { schema: DB_SCHEMA },
    // chave própria de sessão para não misturar com o login de outro app no mesmo navegador
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'financeiro-casal-auth' },
  },
)
