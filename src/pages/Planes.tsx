import { useState, type FormEvent } from 'react'
import { supabase, check } from '../lib/supabase'
import { obtenerPlanes } from '../lib/api'
import { useDatos } from '../lib/useDatos'
import { fmtDinero } from '../lib/formato'
import type { Plan } from '../lib/types'
import { Aviso, Cargando, Modal, Vacio } from '../components/ui'

export default function Planes() {
  const { datos, error, cargando, recargar } = useDatos(() => obtenerPlanes())
  const [editando, setEditando] = useState<Plan | 'nuevo' | null>(null)
  const [msg, setMsg] = useState('')

  async function alternar(p: Plan) {
    try { check(await supabase.from('planes').update({ activo: !p.activo }).eq('id', p.id)); recargar() } catch (e) { setMsg((e as Error).message) }
  }

  return (
    <>
      <div className="titulo-pagina">
        <h1>Planes y precios</h1>
        <button className="btn" onClick={() => setEditando('nuevo')}>+ Nuevo plan</button>
      </div>
      <p className="tenue">Los planes aparecen al registrar un pago. La duración define la fecha de vencimiento.</p>
      <Aviso>{error || msg}</Aviso>
      {cargando && !datos ? <Cargando /> : !datos?.length ? <Vacio>No hay planes.</Vacio> : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead><tr><th>Plan</th><th className="der">Precio</th><th className="der">Duración</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {datos.map(p => (
                <tr key={p.id} className={p.activo ? '' : 'tenue'}>
                  <td><strong>{p.nombre}</strong></td>
                  <td className="der">{fmtDinero(p.precio)}</td>
                  <td className="der">{p.duracion_dias} día(s)</td>
                  <td>{p.activo ? 'Activo' : 'Oculto'}</td>
                  <td className="botones">
                    <button className="btn btn-sec btn-chico" onClick={() => setEditando(p)}>Editar</button>
                    <button className="btn btn-sec btn-chico" onClick={() => alternar(p)}>{p.activo ? 'Ocultar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editando && <PlanForm plan={editando === 'nuevo' ? null : editando}
        onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); recargar() }} />}
    </>
  )
}

function PlanForm({ plan, onClose, onGuardado }: { plan: Plan | null; onClose: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(plan?.nombre ?? '')
  const [precio, setPrecio] = useState(plan ? String(plan.precio) : '')
  const [dias, setDias] = useState(plan ? String(plan.duracion_dias) : '30')
  const [error, setError] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const datos = { nombre: nombre.trim(), precio: Number(precio), duracion_dias: Number(dias) }
    try {
      check(plan
        ? await supabase.from('planes').update(datos).eq('id', plan.id)
        : await supabase.from('planes').insert(datos))
      onGuardado()
    } catch (err) { setError((err as Error).message) }
  }

  return (
    <Modal titulo={plan ? 'Editar plan' : 'Nuevo plan'} onClose={onClose} ancho={460}>
      <form onSubmit={guardar} className="formulario">
        <label>Nombre<input value={nombre} onChange={e => setNombre(e.target.value)} required autoFocus placeholder="Ej. Mensualidad estudiante" /></label>
        <div className="fila-2">
          <label>Precio (MXN)<input type="number" min="0" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} required /></label>
          <label>Duración (días)<input type="number" min="1" value={dias} onChange={e => setDias(e.target.value)} required /></label>
        </div>
        <Aviso>{error}</Aviso>
        <div className="acciones">
          <button type="button" className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
