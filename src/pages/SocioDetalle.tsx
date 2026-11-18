import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, check } from '../lib/supabase'
import { obtenerPlanes, obtenerSocios } from '../lib/api'
import { useDatos } from '../lib/useDatos'
import { edad, enlaceWhatsApp, fmtDinero, fmtFecha, fmtHora, hhmm, hoy } from '../lib/formato'
import { nombreCompleto, type Asistencia, type Pago, type Reserva } from '../lib/types'
import { Aviso, Cargando, EstadoBadge, Vacio } from '../components/ui'
import SocioForm from '../components/SocioForm'
import PagoForm from '../components/PagoForm'

export default function SocioDetalle() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [editar, setEditar] = useState(false)
  const [pagar, setPagar] = useState(false)
  const [msg, setMsg] = useState('')

  const { datos, error, cargando, recargar } = useDatos(async () => {
    const [socios, planes, pagos, asist, reservas] = await Promise.all([
      obtenerSocios(),
      obtenerPlanes(true),
      supabase.from('pagos').select('*').eq('socio_id', id).order('fecha_pago', { ascending: false }).order('id', { ascending: false }),
      supabase.from('asistencias').select('*').eq('socio_id', id).order('fecha', { ascending: false }).limit(60),
      supabase.from('reservas_rin')
        .select('*, a:socio_a(nombre, apellidos, nivel, peso_kg), b:socio_b(nombre, apellidos, nivel, peso_kg)')
        .or(`socio_a.eq.${id},socio_b.eq.${id}`).order('fecha', { ascending: false }).limit(20),
    ])
    return {
      socios, planes,
      pagos: check(pagos) as Pago[],
      asistencias: check(asist) as Asistencia[],
      reservas: check(reservas) as Reserva[],
    }
  }, [id])

  if (cargando && !datos) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  const s = datos?.socios.find(x => x.id === id)
  if (!datos || !s) return <Vacio>No se encontró el socio. <Link to="/socios">Volver</Link></Vacio>

  const asistioHoy = datos.asistencias.some(a => a.fecha === hoy())
  const mes = hoy().slice(0, 7)
  const asistMes = datos.asistencias.filter(a => a.fecha.startsWith(mes)).length
  const wa = enlaceWhatsApp(s.telefono, `Hola ${s.nombre}, te escribimos de GymBoxing Kaly Jr. `)

  async function registrarAsistencia() {
    setMsg('')
    try {
      check(await supabase.from('asistencias').insert({ socio_id: id }))
      recargar()
    } catch (e) { setMsg((e as Error).message) }
  }

  async function borrarPago(p: Pago) {
    if (!confirm(`¿Eliminar el pago de ${fmtDinero(p.monto)} del ${fmtFecha(p.fecha_pago)}?`)) return
    try { check(await supabase.from('pagos').delete().eq('id', p.id)); recargar() } catch (e) { setMsg((e as Error).message) }
  }

  async function borrarSocio() {
    if (!confirm(`¿Eliminar a ${nombreCompleto(s)} y TODO su historial (pagos, asistencias, reservas)? Esto no se puede deshacer.\n\nSi solo dejó de venir, mejor edítalo y desmarca "Socio activo".`)) return
    try { check(await supabase.from('socios').delete().eq('id', id)); navigate('/socios') } catch (e) { setMsg((e as Error).message) }
  }

  const e = edad(s.fecha_nacimiento)

  return (
    <>
      <p><Link to="/socios">← Socios</Link></p>
      <div className="titulo-pagina">
        <div>
          <h1>{nombreCompleto(s)} <span className="tenue">#{s.id}</span></h1>
          <div className="fila-chips">
            <EstadoBadge estado={s.estado_membresia} dias={s.dias_restantes} />
            {!s.activo && <span className="badge badge-sin_pago">Baja</span>}
            <span className="tenue capital">{s.nivel}</span>
          </div>
        </div>
        <div className="botones">
          <button className="btn" onClick={() => setPagar(true)}>💵 Registrar pago</button>
          <button className="btn btn-sec" onClick={registrarAsistencia} disabled={asistioHoy}>{asistioHoy ? '✓ Asistió hoy' : '✅ Asistencia'}</button>
          {wa && <a className="btn btn-sec" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
          <button className="btn btn-sec" onClick={() => setEditar(true)}>Editar</button>
        </div>
      </div>
      <Aviso>{msg}</Aviso>

      <div className="rejilla-2">
        <section className="caja">
          <h2>Datos</h2>
          <dl className="datos">
            <dt>Vence</dt><dd>{fmtFecha(s.vencimiento)}</dd>
            <dt>Teléfono</dt><dd>{s.telefono || '—'}</dd>
            <dt>Correo</dt><dd>{s.email || '—'}</dd>
            <dt>Edad</dt><dd>{e != null ? `${e} años (${fmtFecha(s.fecha_nacimiento)})` : '—'}</dd>
            <dt>Peso</dt><dd>{s.peso_kg ? `${s.peso_kg} kg` : '—'}</dd>
            <dt>Emergencia</dt><dd>{s.contacto_emergencia || '—'} {s.telefono_emergencia}</dd>
            <dt>Alta</dt><dd>{fmtFecha(s.fecha_alta)}</dd>
            <dt>Asistencias este mes</dt><dd>{asistMes}</dd>
          </dl>
          {s.notas && <p className="notas">{s.notas}</p>}
        </section>

        <section className="caja">
          <h2>Pagos</h2>
          {datos.pagos.length === 0 ? <Vacio>Sin pagos registrados.</Vacio> : (
            <ul className="lista">
              {datos.pagos.map(p => (
                <li key={p.id}>
                  <div>
                    <strong>{fmtDinero(p.monto)}</strong> <span className="tenue">· {p.concepto} · {p.metodo}</span>
                    <div className="tenue pequeno">Pagó {fmtFecha(p.fecha_pago)} · cubre {fmtFecha(p.periodo_inicio)} → {fmtFecha(p.periodo_fin)}</div>
                  </div>
                  <button className="btn-icono" title="Eliminar pago" onClick={() => borrarPago(p)}>🗑</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="caja">
          <h2>Asistencias recientes</h2>
          {datos.asistencias.length === 0 ? <Vacio>Sin asistencias.</Vacio> : (
            <div className="asist-chips">
              {datos.asistencias.map(a => <span key={a.id} className="chip" title={fmtHora(a.hora)}>{fmtFecha(a.fecha)}</span>)}
            </div>
          )}
        </section>

        <section className="caja">
          <h2>Sparring</h2>
          {datos.reservas.length === 0 ? <Vacio>Sin reservas de rin.</Vacio> : (
            <ul className="lista">
              {datos.reservas.map(r => (
                <li key={r.id} className={r.estado === 'cancelada' ? 'tachado' : ''}>
                  <span>{fmtFecha(r.fecha)} {hhmm(r.hora_inicio)}</span>
                  <span>{nombreCompleto(r.socio_a === id ? r.b : r.a) === '—' ? 'Sin compañero' : `vs ${nombreCompleto(r.socio_a === id ? r.b : r.a)}`}</span>
                  <span className="tenue">{r.estado}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="zona-peligro">
        <button className="btn-texto peligro" onClick={borrarSocio}>Eliminar socio definitivamente</button>
      </p>

      {editar && <SocioForm socio={s} onClose={() => setEditar(false)} onGuardado={() => { setEditar(false); recargar() }} />}
      {pagar && <PagoForm socios={datos.socios} planes={datos.planes} socioInicial={id}
        onClose={() => setPagar(false)} onGuardado={() => { setPagar(false); recargar() }} />}
    </>
  )
}
