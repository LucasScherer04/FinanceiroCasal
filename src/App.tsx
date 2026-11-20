import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { DataProvider, useData } from './hooks/useData'
import { isConfigured } from './lib/supabase'
import { Dashboard } from './pages/Dashboard'
import { EntryForm } from './pages/EntryForm'
import { History } from './pages/History'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center p-6 text-center text-slate-500">{children}</div>
}

function AuthedApp() {
  const { loading, error } = useData()
  if (loading) return <Centered>Carregando…</Centered>
  if (error) return <Centered>Não foi possível carregar os dados: {error}</Centered>
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="historico" element={<History />} />
        <Route path="ajustes" element={<Settings />} />
      </Route>
      <Route path="novo" element={<EntryForm />} />
      <Route path="editar/:id" element={<EntryForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <Centered>Carregando…</Centered>
  if (!session) return <Login />
  return (
    <DataProvider>
      <AuthedApp />
    </DataProvider>
  )
}

export default function App() {
  if (!isConfigured) {
    return (
      <Centered>
        App sem configuração do Supabase. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).
      </Centered>
    )
  }
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}
