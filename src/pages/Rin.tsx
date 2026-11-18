import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase, check } from '../lib/supabase'
import { obtenerSocios } from '../lib/api'
import { useDatos } from '../lib/useDatos'
import { fmtFechaLarga, hhmm, hoy, sumarDias } from '../lib/formato'
import { nombreCompleto, type Reserva, type SocioEstado } from '../lib/types'
import { Aviso, Cargando, Modal, SocioPicker } from '../components/ui'

const APERTURA = 6   // 6:00
const CIERRE = 22    // 22:00
const HORAS = Array.from({ length: CIERRE - APERTURA }, (_, i) => APERTURA + i)

const aMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const deMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export default function Rin() {
  const [fecha, setFecha] = useState(hoy())
  const [nueva, setNueva] = useState<string | null>(null) // hora inicial sugerida
  const [msg, setMsg] = useState('')

  const { datos, error, cargando, recargar } = useDatos(async () => {
    const [socios, res] = await Promise.all([
      obtenerSocios(),
      supabase.from('reservas_rin')
        .select('*, a:socio_a(nombre, apellidos, nivel, peso_kg), b:socio_b(nombre, apellidos, nivel, peso_kg)')
        .eq('fecha', fecha).order('hora_inicio'),
    ])
    return { socios, reservas: check(res) as Reserva[] }
  }, [fecha])

  const vigentes = (datos?.reservas ?? []).filter(r => r.estado !== 'cancelada')
  const canceladas = (datos?.reservas ?? []).filter(r => r.estado === 'cancelada')

  async function cambiarEstado(r: Reserva, estado: Reserva['estado']) {
    if (estado === 'cancelada' && !confirm('¿Cancelar esta reserva? El horario quedará libre.')) return
    try { check(await supabase.from('reservas_rin').update({ estado }).eq('id', r.id)); recargar() } catch (e) { setMsg((e as Error).message) }
  }

  return (
    <>
      <div className="titulo-pagina">
        <h1>Rin · Sparring</h1>
        <div className="botones">
          <button className="btn btn-sec" onClick={() => setFecha(sumarDias(fecha, -1))} aria-label="Día anterior">‹</button>
          <input type="date" value={fecha} onChange={e => e.target.value && setFecha(e.target.value)} />
          <button className="btn btn-sec" onClick={() => setFecha(sumarDias(fecha, 1))} aria-label="Día siguiente">›</button>
          {fecha !== hoy() && <button className="btn btn-sec" onClick={() => setFecha(hoy())}>Hoy</button>}
          <button className="btn" onClick={() => setNueva('')} disabled={!datos}>+ Reservar rin</button>
        </div>
      </div>
      <p className="tenue">{fmtFechaLarga(fecha)}</p>
      <Aviso>{error || msg}</Aviso>

      {cargando && !datos ? <Cargando /> : (
        <div className="agenda">
          {HORAS.map(h => {
            const ocupadas = vigentes.filter(r => aMin(r.hora_inicio) < (h + 1) * 60 && aMin(r.hora_fin) > h * 60)
            const empiezan = vigentes.filter(r => Math.floor(aMin(r.hora_inicio) / 60) === h)
            return (
              <div key={h} className="agenda-fila">
                <div className="agenda-hora">{deMin(h * 60)}</div>
                <div className="agenda-celda">
                  {empiezan.map(r => (
                    <div key={r.id} className={`reserva reserva-${r.estado}`}>
                      <div>
                        <strong>{hhmm(r.hora_inicio)}–{hhmm(r.hora_fin)}</strong>{' '}
                        {r.a && <Link to={`/socios/${r.socio_a}`}>{nombreCompleto(r.a)}</Link>}
                        {r.b ? <> <span className="tenue">vs</span> <Link to={`/socios/${r.socio_b}`}>{nombreCompleto(r.b)}</Link></> : <span className="tenue"> (sin compañero asignado)</span>}
                        <div className="tenue pequeno">
                          {[r.entrenador && `Entrenador: ${r.entrenador}`, r.rounds && `${r.rounds} rounds`, r.notas, r.estado === 'completada' && '✓ completada'].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {r.estado === 'reservada' && (
                        <div className="botones">
                          <button className="btn btn-sec btn-chico" onClick={() => cambiarEstado(r, 'completada')}>✓ Hecho</button>
                          <button className="btn btn-sec btn-chico" onClick={() => cambiarEstado(r, 'cancelada')}>Cancelar</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {empiezan.length === 0 && ocupadas.length > 0 && (
                    <div className="agenda-continua">Ocupado (continúa la reserva de {hhmm(ocupadas[0].hora_inicio)})</div>
                  )}
                  {ocupadas.length === 0 && (
                    <button className="agenda-libre" onClick={() => setNueva(deMin(h * 60))}>Libre · reservar</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {canceladas.length > 0 && (
        <details className="seccion">
          <summary className="tenue">{canceladas.length} reserva(s) cancelada(s)</summary>
          <ul className="lista">
            {canceladas.map(r => <li key={r.id} className="tachado">{hhmm(r.hora_inicio)}–{hhmm(r.hora_fin)} · {nombreCompleto(r.a)}{r.b ? ` vs ${nombreCompleto(r.b)}` : ''}</li>)}
          </ul>
        </details>
      )}

      {nueva !== null && datos && (
        <ReservaForm fecha={fecha} horaInicial={nueva} socios={datos.socios} reservas={vigentes}
          onClose={() => setNueva(null)} onGuardado={() => { setNueva(null); recargar() }} />
      )}
    </>
  )
}

function ReservaForm({ fecha, horaInicial, socios, reservas, onClose, onGuardado }: {
  fecha: string; horaInicial: string; socios: SocioEstado[]; reservas: Reserva[]
  onClose: () => void; onGuardado: () => void
}) {
  const [inicio, setInicio] = useState(horaInicial || primeraLibre(reservas))
  const [duracion, setDuracion] = useState(30)
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [entrenador, setEntrenador] = useState('')
  const [rounds, setRounds] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const fin = deMin(Math.min(aMin(inicio) + duracion, 24 * 60 - 1))
  const choque = reservas.find(r => aMin(r.hora_inicio) < aMin(fin) && aMin(r.hora_fin) > aMin(inicio))
  const sa = socios.find(s => s.id === a), sb = socios.find(s => s.id === b)

  const advertencias: string[] = []
  for (const s of [sa, sb]) {
    if (s && (s.estado_membresia === 'vencido' || s.estado_membresia === 'sin_pago'))
      advertencias.push(`${nombreCompleto(s)} no tiene la membresía vigente.`)
  }
  if (sa?.peso_kg && sb?.peso_kg && Math.abs(sa.peso_kg - sb.peso_kg) > 10)
    advertencias.push(`Diferencia de peso de ${Math.abs(sa.peso_kg - sb.peso_kg).toFixed(1)} kg.`)
  if (sa && sb && sa.nivel !== sb.nivel)
    advertencias.push(`Niveles distintos: ${sa.nivel} vs ${sb.nivel}.`)

  const opcionesHora: string[] = []
  for (let m = APERTURA * 60; m < CIERRE * 60; m += 15) opcionesHora.push(deMin(m))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!a) return setError('Elige al menos un boxeador.')
    setGuardando(true)
    setError('')
    try {
      check(await supabase.from('reservas_rin').insert({
        fecha, hora_inicio: inicio, hora_fin: fin, socio_a: a, socio_b: b,
        entrenador: entrenador.trim(), rounds: rounds ? Number(rounds) : null, notas: notas.trim(),
      }))
      onGuardado()
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Reservar rin para sparring" onClose={onClose} ancho={620}>
      <form onSubmit={guardar} className="formulario">
        <p className="tenue">{fmtFechaLarga(fecha)}</p>
        <div className="fila-3">
          <label>Hora de inicio
            <select value={inicio} onChange={e => setInicio(e.target.value)}>
              {opcionesHora.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label>Duración
            <select value={duracion} onChange={e => setDuracion(Number(e.target.value))}>
              {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </label>
          <label>Termina<input value={fin} readOnly /></label>
        </div>
        {choque && <Aviso>El rin ya está ocupado de {hhmm(choque.hora_inicio)} a {hhmm(choque.hora_fin)} ({nombreCompleto(choque.a)}).</Aviso>}
        <label>Boxeador 1 *</label>
        <SocioPicker socios={socios} valor={a} onChange={setA} excluir={b} />
        <label>Boxeador 2 (compañero de sparring)</label>
        <SocioPicker socios={socios} valor={b} onChange={setB} excluir={a} placeholder="Opcional: buscar compañero…" />
        <div className="fila-2">
          <label>Entrenador / esquina<input value={entrenador} onChange={e => setEntrenador(e.target.value)} /></label>
          <label>Rounds<input type="number" min="1" value={rounds} onChange={e => setRounds(e.target.value)} /></label>
        </div>
        <label>Notas<input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej. guantes de 16 oz, preparación para pelea…" /></label>
        {advertencias.length > 0 && <Aviso tipo="info">{advertencias.map(t => <div key={t}>⚠️ {t}</div>)}</Aviso>}
        <Aviso>{error}</Aviso>
        <div className="acciones">
          <button type="button" className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={guardando || !!choque}>{guardando ? 'Guardando…' : 'Reservar'}</button>
        </div>
      </form>
    </Modal>
  )
}

function primeraLibre(reservas: Reserva[]): string {
  const ahora = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' }).format(new Date())
  let m = Math.max(APERTURA * 60, Math.ceil(aMin(ahora) / 15) * 15)
  if (m >= CIERRE * 60) m = APERTURA * 60
  while (reservas.some(r => aMin(r.hora_inicio) <= m && aMin(r.hora_fin) > m) && m < CIERRE * 60) m += 15
  return deMin(Math.min(m, CIERRE * 60 - 15))
}
