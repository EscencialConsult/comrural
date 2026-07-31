// Capa de servicio de notificaciones. Los componentes SIEMPRE importan de
// acá, nunca de src/mock directo. Ver src/mock/README.md.
import { notificaciones as notificacionesIniciales } from '../mock'

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

// Copia mutable en memoria — simula el estado que tendría el backend
// mientras no existe. Se resetea al recargar la página (antes ni
// siquiera había notificaciones, así que no es una regresión).
let notificaciones = notificacionesIniciales.map((n) => ({ ...n }))

export const notificacionesService = {
  async getNotificaciones() {
    await delay()
    return [...notificaciones]
  },

  async marcarTodasLeidas() {
    await delay(100)
    notificaciones = notificaciones.map((n) => ({ ...n, leida: true }))
    return [...notificaciones]
  },

  async eliminarTodas() {
    await delay(100)
    notificaciones = []
    return [...notificaciones]
  },
}
