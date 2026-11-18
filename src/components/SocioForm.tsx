import { useState, type FormEvent } from 'react'
import { supabase, check } from '../lib/supabase'
import { NIVELES, type Socio } from '../lib/types'
import { Aviso, Modal } from './ui'

type Campos = Omit<Socio, 'id' | 'fecha_alta'>

const VACIO: Campos = {
  nombre: '', apellidos: '', telefono: '', email: '', fecha_nacimiento: null, nivel: 'principiante',
  peso_kg: null, contacto_emergencia: '', telefono_emergencia: '', notas: '', activo: true,
}

export default function SocioForm({ socio, onClose, onGuardado }: {
  socio?: Socio | null
  onClose: () => void
  onGuardado: (id: number) => void
}) {
  // Tomar solo los campos editables (el socio puede venir de la vista con columnas extra)
  const [f, setF] = useState<Campos>(() => socio
    ? Object.fromEntries(Object.keys(VACIO).map(k => [k, socio[k as keyof Campos]])) as unknown as Campos
    : VACIO)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setF(prev => ({ ...prev, [k]: v }))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const datos = { ...f, nombre: f.nombre.trim(), apellidos: f.apellidos.trim() }
      const res = socio
        ? await supabase.from('socios').update(datos).eq('id', socio.id).select('id').single()
        : await supabase.from('socios').insert(datos).select('id').single()
      onGuardado((check(res) as { id: number }).id)
    } catch (err) {
      setError((err as Error).message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={socio ? 'Editar socio' : 'Nuevo socio'} onClose={onClose} ancho={640}>
      <form onSubmit={guardar} className="formulario">
        <div className="fila-2">
          <label>Nombre(s) *<input value={f.nombre} onChange={e => set('nombre', e.target.value)} required autoFocus /></label>
          <label>Apellidos<input value={f.apellidos} onChange={e => set('apellidos', e.target.value)} /></label>
        </div>
        <div className="fila-2">
          <label>Teléfono (WhatsApp)<input type="tel" value={f.telefono} onChange={e => set('telefono', e.target.value)} placeholder="10 dígitos" /></label>
          <label>Correo<input type="email" value={f.email} onChange={e => set('email', e.target.value)} /></label>
        </div>
        <div className="fila-3">
          <label>Fecha de nacimiento<input type="date" value={f.fecha_nacimiento ?? ''} onChange={e => set('fecha_nacimiento', e.target.value || null)} /></label>
          <label>Nivel
            <select value={f.nivel} onChange={e => set('nivel', e.target.value as Campos['nivel'])}>
              {NIVELES.map(n => <option key={n} value={n}>{n[0].toUpperCase() + n.slice(1)}</option>)}
            </select>
          </label>
          <label>Peso (kg)<input type="number" step="0.1" min="0" value={f.peso_kg ?? ''} onChange={e => set('peso_kg', e.target.value ? Number(e.target.value) : null)} /></label>
        </div>
        <div className="fila-2">
          <label>Contacto de emergencia<input value={f.contacto_emergencia} onChange={e => set('contacto_emergencia', e.target.value)} /></label>
          <label>Tel. de emergencia<input type="tel" value={f.telefono_emergencia} onChange={e => set('telefono_emergencia', e.target.value)} /></label>
        </div>
        <label>Notas (lesiones, padecimientos, objetivos…)<textarea rows={3} value={f.notas} onChange={e => set('notas', e.target.value)} /></label>
        {socio && (
          <label className="check">
            <input type="checkbox" checked={f.activo} onChange={e => set('activo', e.target.checked)} />
            Socio activo (desmarca para dar de baja sin borrar su historial)
          </label>
        )}
        <Aviso>{error}</Aviso>
        <div className="acciones">
          <button type="button" className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  )
}
