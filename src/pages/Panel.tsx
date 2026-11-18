import { Link } from 'react-router-dom'
import { supabase, check } from '../lib/supabase'
import { obtenerSocios } from '../lib/api'
import { useDatos } from '../lib/useDatos'
import { fmtDinero, fmtFechaLarga, hhmm, hoy, inicioDeMes } from '../lib/formato'
import { nombreCompleto, type Reserva } from '../lib/types'
import { Aviso, Cargando, EstadoBadge, Vacio } from '../components/ui'

export default function Panel() {
  const { datos, error, cargando } = useDatos(async () => {
    const h = hoy()
    const [socios, asist, pagos, reservas] = await Promise.all([
      obtenerSocios(),
      supabase.from('asistencias').select('id', { count: 'exact', head: true }).eq('fecha', h),
      supabase.from('pagos').select('monto').gte('fecha_pago', inicioDeMes(h)).lte('fecha_pago', h),
      supabase.from('reservas_rin')
        .select('*, a:socio_a(nombre, apellidos, nivel, peso_kg), b:socio_b(nombre, apellidos, nivel, peso_kg)')
        .eq('fecha', h).neq('estado', 'cancelada').order('hora_inicio'),
    ])
    if (asist.error) throw new Error(asist.error.message)
    return {
      socios,
      asistenciasHoy: asist.count ?? 0,
      ingresosMes: (check(pagos) as { monto: number }[]).reduce((s, p) => s + Number(p.monto), 0),
      reservas: check(reservas) as Reserva[],
    }
  })

  if (cargando && !datos) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  if (!datos) return null

  const activos = datos.socios.filter(s => s.activo)
  const cuenta = (e: string) => activos.filter(s => s.estado_membresia === e).length
  const alertas = activos
    .filter(s => s.estado_membresia === 'por_vencer' || s.estado_membresia === 'vencido')
    .sort((a, b) => (a.dias_restantes ?? 0) - (b.dias_restantes ?? 0))
    .filter(s => (s.dias_restantes ?? 0) >= -30)
    .slice(0, 8)

  return (
    <>
      <div className="titulo-pagina">
        <h1>Panel</h1>
        <span className="tenue">{fmtFechaLarga(hoy())}</span>
      </div>

      <div className="tarjetas">
        <Tarjeta n={datos.asistenciasHoy} t="Asistencias hoy" a="/asistencias" />
        <Tarjeta n={cuenta('al_corriente') + cuenta('por_vencer')} t="Socios con membresía vigente" a="/socios" />
        <Tarjeta n={cuenta('por_vencer')} t="Vencen en los próximos 7 días" a="/vencimientos" tono="ambar" />
        <Tarjeta n={cuenta('vencido')} t="Membresías vencidas" a="/vencimientos" tono="rojo" />
        <Tarjeta n={fmtDinero(datos.ingresosMes)} t="Ingresos del mes" a="/pagos" />
      </div>

      <div className="rejilla-2">
        <section className="caja">
          <div className="caja-cabecera">
            <h2>Rin hoy</h2>
            <Link to="/rin">Ver agenda →</Link>
          </div>
          {datos.reservas.length === 0
            ? <Vacio>No hay sparring reservado para hoy.</Vacio>
            : <ul className="lista">
                {datos.reservas.map(r => (
                  <li key={r.id}>
                    <strong>{hhmm(r.hora_inicio)}–{hhmm(r.hora_fin)}</strong>
                    <span>{nombreCompleto(r.a)}{r.b ? ` vs ${nombreCompleto(r.b)}` : ''}</span>
                  </li>
                ))}
              </ul>}
        </section>

        <section className="caja">
          <div className="caja-cabecera">
            <h2>Requieren atención</h2>
            <Link to="/vencimientos">Ver todos →</Link>
          </div>
          {alertas.length === 0
            ? <Vacio>Todos los socios están al corriente. 💪</Vacio>
            : <ul className="lista">
                {alertas.map(s => (
                  <li key={s.id}>
                    <Link to={`/socios/${s.id}`}>{nombreCompleto(s)}</Link>
                    <EstadoBadge estado={s.estado_membresia} dias={s.dias_restantes} />
                  </li>
                ))}
              </ul>}
        </section>
      </div>
    </>
  )
}

function Tarjeta({ n, t, a, tono }: { n: number | string; t: string; a: string; tono?: 'rojo' | 'ambar' }) {
  return (
    <Link to={a} className={`tarjeta ${tono ? 'tarjeta-' + tono : ''}`}>
      <span className="tarjeta-num">{n}</span>
      <span className="tarjeta-txt">{t}</span>
    </Link>
  )
}
