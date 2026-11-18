import { useState } from 'react'
import { Link } from 'react-router-dom'
import { obtenerPlanes, obtenerSocios } from '../lib/api'
import { useDatos } from '../lib/useDatos'
import { enlaceWhatsApp, fmtFecha } from '../lib/formato'
import { nombreCompleto, type SocioEstado } from '../lib/types'
import { Aviso, Cargando, EstadoBadge, Vacio } from '../components/ui'
import PagoForm from '../components/PagoForm'

export default function Vencimientos() {
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const [socios, planes] = await Promise.all([obtenerSocios(), obtenerPlanes(true)])
    return { socios, planes }
  })
  const [cobrar, setCobrar] = useState<number | null>(null)

  if (cargando && !datos) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  if (!datos) return null

  const activos = datos.socios.filter(s => s.activo)
  const orden = (a: SocioEstado, b: SocioEstado) => (a.dias_restantes ?? 0) - (b.dias_restantes ?? 0)
  const porVencer = activos.filter(s => s.estado_membresia === 'por_vencer').sort(orden)
  const vencidos = activos.filter(s => s.estado_membresia === 'vencido').sort((a, b) => -orden(a, b))
  const sinPago = activos.filter(s => s.estado_membresia === 'sin_pago')

  const tabla = (lista: SocioEstado[], tipo: 'por_vencer' | 'vencido' | 'sin_pago') =>
    lista.length === 0 ? <Vacio>Nadie en esta lista.</Vacio> : (
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th>Socio</th><th>Teléfono</th><th>Vence</th><th>Estado</th><th>Última asistencia</th><th></th></tr></thead>
          <tbody>
            {lista.map(s => {
              const texto = tipo === 'por_vencer'
                ? `Hola ${s.nombre} 👋 te recordamos que tu membresía en GymBoxing Kaly Jr vence el ${fmtFecha(s.vencimiento)}. ¡Te esperamos para renovar! 🥊`
                : `Hola ${s.nombre} 👋 tu membresía en GymBoxing Kaly Jr ${s.vencimiento ? `venció el ${fmtFecha(s.vencimiento)}` : 'está pendiente de pago'}. ¡Te esperamos de vuelta en el gym! 🥊`
              const wa = enlaceWhatsApp(s.telefono, texto)
              return (
                <tr key={s.id}>
                  <td><Link to={`/socios/${s.id}`}>{nombreCompleto(s)}</Link></td>
                  <td>{s.telefono || '—'}</td>
                  <td>{fmtFecha(s.vencimiento)}</td>
                  <td><EstadoBadge estado={s.estado_membresia} dias={s.dias_restantes} /></td>
                  <td>{fmtFecha(s.ultima_asistencia)}</td>
                  <td className="botones">
                    {wa && <a className="btn btn-sec btn-chico" href={wa} target="_blank" rel="noreferrer">Recordar por WhatsApp</a>}
                    <button className="btn btn-chico" onClick={() => setCobrar(s.id)}>Cobrar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )

  return (
    <>
      <div className="titulo-pagina"><h1>Vencimientos</h1></div>
      <section className="seccion">
        <h2>⏳ Por vencer (próximos 7 días) · {porVencer.length}</h2>
        {tabla(porVencer, 'por_vencer')}
      </section>
      <section className="seccion">
        <h2>⛔ Vencidos · {vencidos.length}</h2>
        {tabla(vencidos, 'vencido')}
      </section>
      <section className="seccion">
        <h2>Sin ningún pago · {sinPago.length}</h2>
        {tabla(sinPago, 'sin_pago')}
      </section>

      {cobrar && <PagoForm socios={datos.socios} planes={datos.planes} socioInicial={cobrar}
        onClose={() => setCobrar(null)} onGuardado={() => { setCobrar(null); recargar() }} />}
    </>
  )
}
