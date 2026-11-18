const TZ = 'America/Mexico_City'

/** Fecha de hoy (AAAA-MM-DD) en horario de la Ciudad de México. */
export function hoy(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta + 'T12:00:00Z') - Date.parse(desde + 'T12:00:00Z')) / 86400000)
}

export function inicioDeMes(fecha: string): string {
  return fecha.slice(0, 8) + '01'
}

export function finDeMes(fecha: string): string {
  const d = new Date(fecha.slice(0, 8) + '01T12:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + 1)
  d.setUTCDate(0)
  return d.toISOString().slice(0, 10)
}

/** 18/11/2026 */
export function fmtFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  const [a, m, d] = fecha.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** Miércoles, 18 de noviembre */
export function fmtFechaLarga(fecha: string): string {
  const t = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(new Date(fecha + 'T12:00:00Z'))
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function fmtHora(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
}

/** "17:30:00" → "17:30" */
export const hhmm = (t: string) => t.slice(0, 5)

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
export const fmtDinero = (n: number) => mxn.format(Number(n) || 0)

/** Enlace de WhatsApp para un teléfono mexicano de 10 dígitos. */
export function enlaceWhatsApp(telefono: string, mensaje: string): string | null {
  let digitos = telefono.replace(/\D/g, '')
  if (digitos.length === 10) digitos = '52' + digitos
  if (digitos.length < 11) return null
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`
}

export function edad(nacimiento: string | null): number | null {
  if (!nacimiento) return null
  const h = hoy()
  let e = Number(h.slice(0, 4)) - Number(nacimiento.slice(0, 4))
  if (h.slice(5) < nacimiento.slice(5, 10)) e--
  return e
}
