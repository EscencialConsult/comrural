// Servicio real — ver comrural_erp_backend/docs/notifications.md.
//
// El mock anterior (notificaciones.json) exponía getNotificaciones/
// marcarTodasLeidas/eliminarTodas sobre una copia en memoria. El backend
// real no tiene equivalente para "eliminarTodas" (es append-only, nunca se
// borra una notificación — ver docs/notifications.md "No-garantías") ni un
// endpoint para "marcar todas" de una sola vez (se marca de a una), así que
// esas dos funciones no se migran tal cual: se reemplazan por `listar`
// (paginada, mismo criterio keyset que peopleService) y `marcarLeida`
// (una notificación puntual). DashboardHeader.jsx se actualizó para
// consumir la forma real de la respuesta (title/message/createdAt/readAt)
// en vez de la forma mock (texto/fecha/leida).
import { apiClient } from '../lib/apiClient'

export const notificacionesService = {
  // status: 'unread' | 'all' (default 'all' del lado del backend si se omite).
  async listar({ status, cursor, limit } = {}) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    const query = params.toString()
    return apiClient.get(`/notifications${query ? `?${query}` : ''}`)
  },

  // Body vacío a propósito — el backend solo acepta `{}` (ver
  // markNotificationReadSchema en el backend), nunca contenido del cliente.
  async marcarLeida(notificationId) {
    return apiClient.post(`/notifications/${notificationId}/read`, {})
  },
}
