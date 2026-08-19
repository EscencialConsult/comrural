// Servicio real — ver comrural_erp_backend/docs/quality-resolutions.md,
// leído completo.
//
// `authorizedPackageCount` siempre lo calcula el backend (nunca se manda) —
// APROBADA = receivedPackageCount - rejectedPackageCount, RECHAZADA = 0.
// `decisionNotes` es obligatorio si `decision: 'RECHAZADA'`. `PATCH` (corregir)
// solo puede tocar `decisionNotes`, nunca `decision` — y solo mientras
// `reviewStatus: 'PENDIENTE'`. `aprobar` manda body vacío: no registra una
// decisión nueva, solo quién y cuándo dio el visto bueno (nunca puede ser la
// misma persona que emitió la resolución, el backend lo bloquea con 409).
//
// `listar()` sigue el mismo sobre paginado { data, nextCursor, hasMore } que
// el resto del proyecto — alimenta la cola de pendientes de Calidad
// (reviewStatus: 'PENDIENTE'), ordenada por el backend `resolvedAt ASC, id ASC`
// (la más antigua primero).
import { apiClient } from '../lib/apiClient'

export const qualityResolutionsService = {
  async emitir(inspectionId, dto) {
    return apiClient.post(`/inspections/${inspectionId}/quality-resolution`, dto)
  },

  async listar({ cursor, limit, reviewStatus, decision, search } = {}) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    if (reviewStatus) params.set('reviewStatus', reviewStatus)
    if (decision) params.set('decision', decision)
    if (search) params.set('search', search)
    const query = params.toString()
    return apiClient.get(`/quality-resolutions${query ? `?${query}` : ''}`)
  },

  async obtener(resolutionId) {
    return apiClient.get(`/quality-resolutions/${resolutionId}`)
  },

  async corregir(resolutionId, dto) {
    return apiClient.patch(`/quality-resolutions/${resolutionId}`, dto)
  },

  async aprobar(resolutionId) {
    return apiClient.post(`/quality-resolutions/${resolutionId}/approve`, {})
  },
}
