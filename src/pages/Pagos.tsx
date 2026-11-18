import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, check } from '../lib/supabase'
import { obtenerPlanes, obtenerSocios } from '../lib/api'
import { useDatos } from '../lib/useDatos'
import { finDeMes, fmtDinero, fmtFecha, hoy } from '../lib/formato'
import { METODOS, nombreCompleto, type Pago } from '../lib/types'
import { Aviso, Cargando, Vacio } from '../components/ui'
import PagoForm from '../components/PagoForm'

export default function Pagos() {
  const [mes, setMes] = useState(hoy().slice(0, 7))
  const [nuevo, setNuevo] = useState(false)
  const [msg, setMsg] = useState('')

  const { datos, error, cargando, recargar } = useDatos(async () => {
    const [pagos, socios, planes] = await Promise.all([
      supabase.from('pagos').select('*, socios(nombre, apellidos)')
        .gte('fecha_pago', mes + '-01').lte('fecha_pago', finDeMes(mes + '-01'))
        .order('fecha_pago', { ascending: false }).order('id', { ascending: false }),
      obtenerSocios(),
      obtenerPlanes(true),
    ])
    return { pagos: check(pagos) as Pago[], socios, planes }
  }, [mes])

  const totales = useMemo(() => {
    const t: Record<string, number> = { total: 0 }
    for (const p of datos?.pagos ?? []) {
      t.total += Number(p.monto)
      t[p.metodo] = (t[p.metodo] ?? 0) + Number(p.monto)
    }
    return t
  }, [datos])

  async function borrar(p: Pago) {
    if (!confirm(`¿Eliminar el pago de ${fmtDinero(p.monto)} de ${nombreCompleto(p.socios)}?`)) return
    try { check(await supabase.from('pagos').delete().eq('id', p.id)); recargar() } catch (e) { setMsg((e as Error).message) }
  }

  return (
    <>
      <div className="titulo-pagina">
        <h1>Pagos</h1>
        <div className="botones">
          <input type="month" value={mes} onChange={e => e.target.value && setMes(e.target.value)} />
          <button className="btn" onClick={() => setNuevo(true)} disabled={!datos}>+ Registrar pago</button>
        </div>
      </div>

      <div className="tarjetas">
        <div className="tarjeta"><span className="tarjeta-num">{fmtDinero(totales.total)}</span><span className="tarjeta-txt">Total del mes · {datos?.pagos.length ?? 0} pagos</span></div>
        {METODOS.map(m => (
          <div key={m} className="tarjeta"><span className="tarjeta-num">{fmtDinero(totales[m] ?? 0)}</span><span className="tarjeta-txt capital">{m}</span></div>
        ))}
      </div>

      <Aviso>{error || msg}</Aviso>
      {cargando && !datos ? <Cargando /> : !datos?.pagos.length ? <Vacio>No hay pagos en este mes.</Vacio> : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead><tr><th>Fecha</th><th>Socio</th><th>Concepto</th><th>Método</th><th>Cubre</th><th className="der">Monto</th><th></th></tr></thead>
            <tbody>
              {datos.pagos.map(p => (
                <tr key={p.id}>
                  <td>{fmtFecha(p.fecha_pago)}</td>
                  <td><Link to={`/socios/${p.socio_id}`}>{nombreCompleto(p.socios)}</Link></td>
                  <td>{p.concepto}{p.notas && <span className="tenue"> · {p.notas}</span>}</td>
                  <td className="capital">{p.metodo}</td>
                  <td className="pequeno">{fmtFecha(p.periodo_inicio)} → {fmtFecha(p.periodo_fin)}</td>
                  <td className="der"><strong>{fmtDinero(p.monto)}</strong></td>
                  <td><button className="btn-icono" title="Eliminar" onClick={() => borrar(p)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nuevo && datos && <PagoForm socios={datos.socios} planes={datos.planes}
        onClose={() => setNuevo(false)} onGuardado={() => { setNuevo(false); recargar() }} />}
    </>
  )
}
