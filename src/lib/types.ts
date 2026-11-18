export type Nivel = 'principiante' | 'intermedio' | 'avanzado' | 'competidor'
export type EstadoMembresia = 'al_corriente' | 'por_vencer' | 'vencido' | 'sin_pago'
export type Metodo = 'efectivo' | 'tarjeta' | 'transferencia'

export interface Plan {
  id: number
  nombre: string
  precio: number
  duracion_dias: number
  activo: boolean
}

export interface Socio {
  id: number
  nombre: string
  apellidos: string
  telefono: string
  email: string
  fecha_nacimiento: string | null
  nivel: Nivel
  peso_kg: number | null
  contacto_emergencia: string
  telefono_emergencia: string
  notas: string
  activo: boolean
  fecha_alta: string
}

export interface SocioEstado extends Socio {
  vencimiento: string | null
  estado_membresia: EstadoMembresia
  dias_restantes: number | null
  ultima_asistencia: string | null
}

export interface Pago {
  id: number
  socio_id: number
  plan_id: number | null
  concepto: string
  monto: number
  metodo: Metodo
  fecha_pago: string
  periodo_inicio: string
  periodo_fin: string
  notas: string
  socios?: { nombre: string; apellidos: string } | null
}

export interface Asistencia {
  id: number
  socio_id: number
  fecha: string
  hora: string
  socios?: { nombre: string; apellidos: string } | null
}

export interface Reserva {
  id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  socio_a: number
  socio_b: number | null
  entrenador: string
  rounds: number | null
  notas: string
  estado: 'reservada' | 'completada' | 'cancelada'
  a?: { nombre: string; apellidos: string; nivel: Nivel; peso_kg: number | null } | null
  b?: { nombre: string; apellidos: string; nivel: Nivel; peso_kg: number | null } | null
}

export const NIVELES: Nivel[] = ['principiante', 'intermedio', 'avanzado', 'competidor']
export const METODOS: Metodo[] = ['efectivo', 'tarjeta', 'transferencia']

export const nombreCompleto = (s: { nombre: string; apellidos: string } | null | undefined) =>
  s ? `${s.nombre} ${s.apellidos}`.trim() : '—'
