import { useCallback, useState } from 'react'

// Hook transversal (tarea "FE · M0 · Requisitos transversales", subtarea
// "deshabilitar botones mientras una petición está en curso") — pensado
// para las pantallas de M1-M6 (Países, Personas, Organizaciones,
// Proveedores, Productos, Lotes), pero sirve para cualquier acción
// contra un service real.
//
// Uso:
//   const { enviando, error, ejecutar } = useSolicitud()
//   const onSubmit = () => ejecutar(() => proveedoresService.crearProveedor(datos))
//   <Button disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</Button>
//
// `error` ya viene con el mensaje resuelto por apiClient.js (400/403/404/
// 409/500 tienen mensaje legible listo para mostrar, ver apiClient.js).
export function useSolicitud() {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const ejecutar = useCallback(async (accion) => {
    setEnviando(true)
    setError(null)
    try {
      return await accion()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setEnviando(false)
    }
  }, [])

  return { enviando, error, ejecutar, limpiarError: () => setError(null) }
}
