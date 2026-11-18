import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configurado = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost', key || 'sin-configurar')

/** Lanza el error de Supabase con un mensaje legible en español. */
export function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(traducirError(res.error))
  return res.data
}

export function traducirError(e: { message: string; code?: string }): string {
  if (e.code === '23P01') return 'El rin ya está reservado en ese horario.'
  if (e.code === '23505') return 'Ese registro ya existe (por ejemplo, la asistencia de hoy ya fue registrada).'
  if (e.code === '23503') return 'No se puede completar: el registro está ligado a otros datos.'
  if (e.message.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  return e.message
}
