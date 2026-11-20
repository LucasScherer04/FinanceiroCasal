import { createClient } from '@supabase/supabase-js'

export const isConfigured = Boolean(__SUPABASE_URL__ && __SUPABASE_KEY__)

export const supabase = createClient(
  __SUPABASE_URL__ || 'https://placeholder.supabase.co',
  __SUPABASE_KEY__ || 'placeholder',
  { auth: { persistSession: true, autoRefreshToken: true } },
)
