import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, check } from '../lib/supabase'
import { obtenerSocios } from '../lib/api'
import { useDatos } from '../lib/useDatos'
import { fmtFecha, fmtFechaLarga, fmtHora, hoy } from '../lib/formato'
import { nombreCompleto, type Asistencia } from '../lib/types'
import { Aviso, Cargando, EstadoBadge, SocioPicker, Vacio } from '../components/ui'

export default function Asistencias() {
  const [fecha, setFecha] = useState(hoy())
  const [socioId, setSocioId] = useState<number | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error' | 'info'; t: string } | null>(null)

  const { datos, error, cargando, recargar } = useDatos(async () => {
    const [socios, asist] = await Promise.all([
      obtenerSocios(),
      supabase.from('asistencias').select('*, socios(nombre, apellidos)').eq('fecha', fecha).order('hora', { ascending: false }),
    ])
    return { socios, asistencias: check(asist) as Asistencia[] }
  }, [fecha])

  const elegido = datos?.socios.find(s => s.id === socioId)
  const esHoy = fecha === hoy()

  async function registrar() {
    if (!elegido) return
    try {
      check(await supabase.from('asistencias').insert({ socio_id: elegido.id, fecha }))
      const advert = elegido.estado_membresia === 'vencido' || elegido.estado_membresia === 'sin_pago'
      setAviso(advert
        ? { tipo: 'error', t: `Asistencia registrada para ${nombreCompleto(elegido)}, pero su membresía ${elegido.estado_membresia === 'vencido' ? `venció el ${fmtFecha(elegido.vencimiento)}` : 'no tiene pagos'}. Recuerda cobrarle.` }
        : { tipo: 'ok', t: `✓ Asistencia registrada: ${nombreCompleto(elegido)}` })
      setSocioId(null)
      recargar()
    } catch (e) {
      setAviso({ tipo: 'error', t: (e as Error).message })
    }
  }

  async function borrar(a: Asistencia) {
    if (!confirm(`¿Quitar la asistencia de ${nombreCompleto(a.socios)}?`)) return
    try { check(await supabase.from('asistencias').delete().eq('id', a.id)); recargar() } catch (e) { setAviso({ tipo: 'error', t: (e as Error).message }) }
  }

  return (
    <>
      <div className="titulo-pagina">
        <h1>Asistencias</h1>
        <input type="date" value={fecha} max={hoy()} onChange={e => e.target.value && setFecha(e.target.value)} />
      </div>

      <section className="caja checkin">
        <h2>{esHoy ? 'Registrar entrada' : `Registrar asistencia del ${fmtFecha(fecha)}`}</h2>
        {datos && <SocioPicker socios={datos.socios} valor={socioId} onChange={id => { setSocioId(id); setAviso(null) }} />}
        {elegido && (
          <div className="checkin-info">
            <span>Vence: <strong>{fmtFecha(elegido.vencimiento)}</strong></span>
            <EstadoBadge estado={elegido.estado_membresia} dias={elegido.dias_restantes} />
            <button className="btn" onClick={registrar}>✅ Registrar asistencia</button>
          </div>
        )}
        {aviso && <Aviso tipo={aviso.tipo}>{aviso.t}</Aviso>}
      </section>

      <Aviso>{error}</Aviso>
      <section className="seccion">
        <h2>{fmtFechaLarga(fecha)} · {datos?.asistencias.length ?? 0} asistencias</h2>
        {cargando && !datos ? <Cargando /> : !datos?.asistencias.length ? <Vacio>Nadie ha registrado asistencia.</Vacio> : (
          <ul className="lista caja">
            {datos.asistencias.map(a => (
              <li key={a.id}>
                <span className="tenue">{fmtHora(a.hora)}</span>
                <Link to={`/socios/${a.socio_id}`}>{nombreCompleto(a.socios)}</Link>
                <button className="btn-icono" title="Quitar" onClick={() => borrar(a)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
