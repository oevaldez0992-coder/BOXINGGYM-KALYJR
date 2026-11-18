import { useCallback, useEffect, useState } from 'react'

/** Carga datos asíncronos con estado de carga/error y función para recargar. */
export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(cargar, deps)

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      setDatos(await fn())
      setError('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }, [fn])

  useEffect(() => { recargar() }, [recargar])

  return { datos, error, cargando, recargar }
}
