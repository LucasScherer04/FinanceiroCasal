import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Destination, Entry, Goal, Profile } from '../types'
import { useAuth } from './useAuth'

interface DataState {
  loading: boolean
  error: string | null
  profiles: Profile[]
  goal: Goal | null
  destinations: Destination[]
  entries: Entry[]
  me: Profile | null
  reload: () => Promise<void>
}

const DataContext = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [goal, setGoal] = useState<Goal | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [entries, setEntries] = useState<Entry[]>([])

  const reload = useCallback(async () => {
    const [p, g, d, e] = await Promise.all([
      supabase.from('profiles').select('id,name,color').order('created_at'),
      supabase.from('goals').select('id,title,target_amount').order('created_at').limit(1),
      supabase.from('destinations').select('id,name,kind').order('name'),
      supabase.from('entries').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
    ])
    const err = p.error ?? g.error ?? d.error ?? e.error
    if (err) {
      setError(err.message)
    } else {
      setError(null)
      setProfiles(p.data ?? [])
      setGoal(g.data?.[0] ? { ...g.data[0], target_amount: Number(g.data[0].target_amount) } : null)
      setDestinations((d.data ?? []) as Destination[])
      setEntries((e.data ?? []).map((x) => ({ ...x, amount: Number(x.amount) })) as Entry[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!userId) return
    reload()
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => reload())
      .subscribe()
    // ao voltar para o app (PWA em segundo plano), recarrega
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, reload])

  const me = useMemo(() => profiles.find((p) => p.id === userId) ?? null, [profiles, userId])

  return (
    <DataContext.Provider value={{ loading, error, profiles, goal, destinations, entries, me, reload }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData precisa estar dentro de DataProvider')
  return ctx
}
