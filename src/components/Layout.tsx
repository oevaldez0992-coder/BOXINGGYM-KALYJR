import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MENU = [
  { a: '/', t: 'Panel', i: '📊' },
  { a: '/asistencias', t: 'Asistencias', i: '✅' },
  { a: '/socios', t: 'Socios', i: '👥' },
  { a: '/pagos', t: 'Pagos', i: '💵' },
  { a: '/vencimientos', t: 'Vencimientos', i: '⏰' },
  { a: '/rin', t: 'Rin · Sparring', i: '🥊' },
  { a: '/planes', t: 'Planes', i: '⚙️' },
]

export default function Layout({ correo }: { correo: string }) {
  const [abierto, setAbierto] = useState(false)
  const loc = useLocation()
  const actual = MENU.find(m => m.a === '/' ? loc.pathname === '/' : loc.pathname.startsWith(m.a))

  return (
    <div className="app">
      <aside className={`lateral ${abierto ? 'abierto' : ''}`}>
        <div className="marca">
          <img src="/guante.svg" alt="" width={34} height={34} />
          <div>
            <strong>GYMBOXING</strong>
            <span>KALY JR</span>
          </div>
        </div>
        <nav>
          {MENU.map(m => (
            <NavLink key={m.a} to={m.a} end={m.a === '/'} onClick={() => setAbierto(false)}>
              <span aria-hidden>{m.i}</span> {m.t}
            </NavLink>
          ))}
        </nav>
        <div className="lateral-pie">
          <span className="tenue" title={correo}>{correo}</span>
          <button className="btn btn-sec" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
        </div>
      </aside>
      {abierto && <div className="lateral-fondo" onClick={() => setAbierto(false)} />}
      <main>
        <header className="barra-movil">
          <button className="btn-icono" onClick={() => setAbierto(true)} aria-label="Menú">☰</button>
          <strong>{actual?.t ?? 'GymBoxing Kaly Jr'}</strong>
        </header>
        <div className="contenido">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
