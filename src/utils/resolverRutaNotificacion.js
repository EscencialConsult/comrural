import { RUTAS_NOTIFICACION } from '../config/notificacionesRutas'

// Recorre los candidatos de RUTAS_NOTIFICACION[notificacion.type] en orden y
// devuelve la ruta del primero que el usuario pueda usar (permisos.has) y
// que además tenga un destino real para esta notificación puntual (ruta(n)
// puede descartarse a sí misma devolviendo null/undefined). null si no hay
// ningún candidato válido, o si el type no está mapeado — nunca navega a
// ciegas.
export function resolverRutaNotificacion(notificacion, permisos) {
  const candidatos = RUTAS_NOTIFICACION[notificacion.type]
  if (!candidatos) {
    if (import.meta.env.DEV) {
      console.warn(`[notificaciones] "${notificacion.type}" no tiene ruta mapeada en notificacionesRutas.js`)
    }
    return null
  }

  for (const { permiso, ruta } of candidatos) {
    if (!permisos.has(permiso)) continue
    const destino = ruta(notificacion)
    if (destino) return destino
  }

  return null
}
