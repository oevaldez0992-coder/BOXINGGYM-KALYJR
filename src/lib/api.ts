import { supabase, check } from './supabase'
import type { Plan, SocioEstado } from './types'

export async function obtenerSocios(): Promise<SocioEstado[]> {
  return check(await supabase.from('socios_estado').select('*').order('nombre')) as SocioEstado[]
}

export async function obtenerPlanes(soloActivos = false): Promise<Plan[]> {
  let q = supabase.from('planes').select('*').order('duracion_dias')
  if (soloActivos) q = q.eq('activo', true)
  return check(await q) as Plan[]
}
