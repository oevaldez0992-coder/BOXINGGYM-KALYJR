import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { obtenerSocios } from '../lib/api'
import { useDatos } from '../lib/useDatos'
import { fmtFecha } from '../lib/formato'
import { nombreCompleto, type EstadoMembresia } from '../lib/types'
import { Aviso, Cargando, EstadoBadge, Vacio, normalizar } from '../components/ui'
import SocioForm from '../components/SocioForm'

const FILTROS: { v: EstadoMembresia | 'todos' | 'bajas'; t: string }[] = [
  { v: 'todos', t: 'Todos' },
  { v: 'al_corriente', t: 'Al corriente' },
  { v: 'por_vencer', t: 'Por vencer' },
  { v: 'vencido', t: 'Vencidos' },
  { v: 'sin_pago', t: 'Sin pago' },
  { v: 'bajas', t: 'Bajas' },
]

export default function Socios() {
  const { datos, error, cargando } = useDatos(obtenerSocios)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['v']>('todos')
  const [nuevo, setNuevo] = useState(false)
  const navigate = useNavigate()

  const lista = useMemo(() => {
    const q = normalizar(busqueda)
    return (datos ?? [])
      .filter(s => filtro === 'bajas' ? !s.activo : s.activo && (filtro === 'todos' || s.estado_membresia === filtro))
      .filter(s => !q || normalizar(`${s.nombre} ${s.apellidos} ${s.telefono} ${s.email} ${s.id}`).includes(q))
  }, [datos, busqueda, filtro])

  return (
    <>
      <div className="titulo-pagina">
        <h1>Socios</h1>
        <button className="btn" onClick={() => setNuevo(true)}>+ Nuevo socio</button>
      </div>

      <div className="barra-filtros">
        <input className="buscador" placeholder="Buscar por nombre, teléfono, correo o número…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <div className="chips">
          {FILTROS.map(f => (
            <button key={f.v} className={`chip ${filtro === f.v ? 'activo' : ''}`} onClick={() => setFiltro(f.v)}>{f.t}</button>
          ))}
        </div>
      </div>

      <Aviso>{error}</Aviso>
      {cargando && !datos ? <Cargando /> : lista.length === 0 ? <Vacio>No hay socios que coincidan.</Vacio> : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr><th>#</th><th>Nombre</th><th>Teléfono</th><th>Nivel</th><th>Vence</th><th>Estado</th><th>Última asistencia</th></tr>
            </thead>
            <tbody>
              {lista.map(s => (
                <tr key={s.id} onClick={() => navigate(`/socios/${s.id}`)} className="clic">
                  <td className="tenue">{s.id}</td>
                  <td><Link to={`/socios/${s.id}`} onClick={e => e.stopPropagation()}>{nombreCompleto(s)}</Link></td>
                  <td>{s.telefono || '—'}</td>
                  <td className="capital">{s.nivel}</td>
                  <td>{fmtFecha(s.vencimiento)}</td>
                  <td><EstadoBadge estado={s.estado_membresia} dias={s.dias_restantes} /></td>
                  <td>{fmtFecha(s.ultima_asistencia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="tenue pequeno">{lista.length} socio(s)</p>

      {nuevo && <SocioForm onClose={() => setNuevo(false)} onGuardado={id => navigate(`/socios/${id}`)} />}
    </>
  )
}
