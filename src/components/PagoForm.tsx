import { useEffect, useState, type FormEvent } from 'react'
import { supabase, check } from '../lib/supabase'
import { METODOS, type Metodo, type Plan, type SocioEstado } from '../lib/types'
import { fmtDinero, fmtFecha, hoy, sumarDias } from '../lib/formato'
import { Aviso, Modal, SocioPicker } from './ui'

/**
 * Registrar un pago. Si el socio aún tiene días vigentes, el nuevo periodo
 * empieza al día siguiente de su vencimiento (no pierde días); si no, empieza hoy.
 */
export default function PagoForm({ socios, planes, socioInicial, onClose, onGuardado }: {
  socios: SocioEstado[]
  planes: Plan[]
  socioInicial?: number | null
  onClose: () => void
  onGuardado: () => void
}) {
  const [socioId, setSocioId] = useState<number | null>(socioInicial ?? null)
  const [planId, setPlanId] = useState<number | ''>(planes.find(p => p.duracion_dias === 30)?.id ?? planes[0]?.id ?? '')
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState<Metodo>('efectivo')
  const [fechaPago, setFechaPago] = useState(hoy())
  const [inicio, setInicio] = useState(hoy())
  const [fin, setFin] = useState(hoy())
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const socio = socios.find(s => s.id === socioId) || null
  const plan = planes.find(p => p.id === planId) || null

  // Recalcular periodo y monto al cambiar socio o plan
  useEffect(() => {
    const h = hoy()
    const ini = socio?.vencimiento && socio.vencimiento >= h ? sumarDias(socio.vencimiento, 1) : h
    setInicio(ini)
    if (plan) {
      setFin(sumarDias(ini, plan.duracion_dias - 1))
      setMonto(String(plan.precio))
    }
  }, [socioId, planId]) // eslint-disable-line react-hooks/exhaustive-deps

  function cambiarInicio(v: string) {
    setInicio(v)
    if (plan && v) setFin(sumarDias(v, plan.duracion_dias - 1))
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!socioId) return setError('Elige un socio.')
    if (fin < inicio) return setError('La fecha final no puede ser anterior a la inicial.')
    setGuardando(true)
    setError('')
    try {
      check(await supabase.from('pagos').insert({
        socio_id: socioId,
        plan_id: plan?.id ?? null,
        concepto: plan?.nombre ?? 'Pago',
        monto: Number(monto),
        metodo,
        fecha_pago: fechaPago,
        periodo_inicio: inicio,
        periodo_fin: fin,
        notas,
      }))
      onGuardado()
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Registrar pago" onClose={onClose} ancho={600}>
      <form onSubmit={guardar} className="formulario">
        <label>Socio *</label>
        <SocioPicker socios={socios} valor={socioId} onChange={setSocioId} />
        {socio && (
          <p className="tenue pequeno">
            {socio.vencimiento ? `Vencimiento actual: ${fmtFecha(socio.vencimiento)}` : 'Primer pago de este socio.'}
          </p>
        )}
        <div className="fila-2">
          <label>Plan
            <select value={planId} onChange={e => setPlanId(e.target.value ? Number(e.target.value) : '')}>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} · {fmtDinero(p.precio)} · {p.duracion_dias} días</option>)}
              <option value="">Otro / personalizado</option>
            </select>
          </label>
          <label>Monto (MXN) *<input type="number" step="0.01" min="0" value={monto} onChange={e => setMonto(e.target.value)} required /></label>
        </div>
        <div className="fila-2">
          <label>Método
            <select value={metodo} onChange={e => setMetodo(e.target.value as Metodo)}>
              {METODOS.map(m => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
            </select>
          </label>
          <label>Fecha de pago<input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} required /></label>
        </div>
        <div className="fila-2">
          <label>Cubre desde<input type="date" value={inicio} onChange={e => cambiarInicio(e.target.value)} required /></label>
          <label>Hasta (vencimiento)<input type="date" value={fin} onChange={e => setFin(e.target.value)} required /></label>
        </div>
        <label>Notas<input value={notas} onChange={e => setNotas(e.target.value)} /></label>
        <Aviso>{error}</Aviso>
        <div className="acciones">
          <button type="button" className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={guardando}>{guardando ? 'Guardando…' : `Cobrar ${monto ? fmtDinero(Number(monto)) : ''}`}</button>
        </div>
      </form>
    </Modal>
  )
}
