import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { EstadoMembresia, SocioEstado } from '../lib/types'
import { nombreCompleto } from '../lib/types'
import { fmtFecha } from '../lib/formato'

export function Modal({ titulo, onClose, children, ancho }: {
  titulo: string; onClose: () => void; children: ReactNode; ancho?: number
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="modal-fondo" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={ancho ? { maxWidth: ancho } : undefined} role="dialog" aria-label={titulo}>
        <div className="modal-cabecera">
          <h2>{titulo}</h2>
          <button className="btn-icono" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const ETIQUETAS: Record<EstadoMembresia, string> = {
  al_corriente: 'Al corriente',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  sin_pago: 'Sin pago',
}

export function EstadoBadge({ estado, dias }: { estado: EstadoMembresia; dias?: number | null }) {
  let texto = ETIQUETAS[estado]
  if (estado === 'por_vencer' && dias != null) texto = dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`
  if (estado === 'vencido' && dias != null) texto = `Vencido hace ${-dias} d`
  return <span className={`badge badge-${estado}`}>{texto}</span>
}

export function Aviso({ tipo = 'error', children }: { tipo?: 'error' | 'ok' | 'info'; children: ReactNode }) {
  if (!children) return null
  return <div className={`aviso aviso-${tipo}`}>{children}</div>
}

export function Cargando() {
  return <div className="cargando">Cargando…</div>
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="vacio">{children}</div>
}

/** Buscador de socios con lista desplegable. */
export function SocioPicker({ socios, valor, onChange, placeholder, excluir }: {
  socios: SocioEstado[]
  valor: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  excluir?: number | null
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const elegido = socios.find(s => s.id === valor) || null

  useEffect(() => {
    const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', f)
    return () => document.removeEventListener('mousedown', f)
  }, [])

  const opciones = useMemo(() => {
    const q = normalizar(texto)
    return socios
      .filter(s => s.activo && s.id !== excluir)
      .filter(s => !q || normalizar(`${s.nombre} ${s.apellidos} ${s.telefono} ${s.id}`).includes(q))
      .slice(0, 8)
  }, [socios, texto, excluir])

  if (elegido) {
    return (
      <div className="picker-elegido">
        <span><strong>{nombreCompleto(elegido)}</strong> <span className="tenue">#{elegido.id}</span></span>
        <EstadoBadge estado={elegido.estado_membresia} dias={elegido.dias_restantes} />
        <button type="button" className="btn-icono" onClick={() => { onChange(null); setTexto('') }} aria-label="Quitar">✕</button>
      </div>
    )
  }

  return (
    <div className="picker" ref={ref}>
      <input
        value={texto}
        placeholder={placeholder || 'Buscar socio por nombre, teléfono o número…'}
        onChange={e => { setTexto(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' && opciones[0]) { e.preventDefault(); onChange(opciones[0].id); setAbierto(false) }
        }}
      />
      {abierto && (
        <ul className="picker-lista">
          {opciones.length === 0 && <li className="tenue">Sin resultados</li>}
          {opciones.map(s => (
            <li key={s.id}>
              <button type="button" onClick={() => { onChange(s.id); setAbierto(false) }}>
                <span>{nombreCompleto(s)} <span className="tenue">#{s.id}</span></span>
                <span className="tenue">{s.vencimiento ? `vence ${fmtFecha(s.vencimiento)}` : 'sin pago'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function normalizar(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
