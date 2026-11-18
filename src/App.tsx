import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { configurado, supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Panel from './pages/Panel'
import Socios from './pages/Socios'
import SocioDetalle from './pages/SocioDetalle'
import Pagos from './pages/Pagos'
import Vencimientos from './pages/Vencimientos'
import Asistencias from './pages/Asistencias'
import Rin from './pages/Rin'
import Planes from './pages/Planes'
import { Cargando } from './components/ui'

export default function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configurado) return <SinConfigurar />
  if (sesion === undefined) return <Cargando />
  if (!sesion) return <Login />

  return (
    <Routes>
      <Route element={<Layout correo={sesion.user.email ?? ''} />}>
        <Route index element={<Panel />} />
        <Route path="socios" element={<Socios />} />
        <Route path="socios/:id" element={<SocioDetalle />} />
        <Route path="pagos" element={<Pagos />} />
        <Route path="vencimientos" element={<Vencimientos />} />
        <Route path="asistencias" element={<Asistencias />} />
        <Route path="rin" element={<Rin />} />
        <Route path="planes" element={<Planes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function SinConfigurar() {
  return (
    <div className="login">
      <div className="login-caja">
        <h1>Falta configurar Supabase</h1>
        <p>Crea un archivo <code>.env</code> (o variables de entorno en tu hosting) con:</p>
        <pre>{`VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key`}</pre>
        <p>Consulta el README para los pasos completos.</p>
      </div>
    </div>
  )
}
