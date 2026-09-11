// Servicio real — comrural_erp_backend/docs/production-area-b.md +
// production-area-b-entries.schema.ts/production-area-b-entries.service.ts,
// leídos completos. `recordedBy`/`verifiedBy`/`closedAt` los asigna el
// servidor — nunca se mandan acá. El cierre es una llamada aparte de la
// creación (sin body, a diferencia de production-area-a).
import { apiClient } from '../lib/apiClient'

export const productionAreaBService = {
  async crear(dto) {
    return apiClient.post('/production-area-b/entries', dto)
  },

  async obtener(entryId) {
    return apiClient.get(`/production-area-b/entries/${entryId}`)
  },

  async listarPorLote(lotId) {
    return apiClient.get(`/production-area-b/lots/${lotId}/entries`)
  },

  async cerrar(entryId) {
    return apiClient.patch(`/production-area-b/entries/${entryId}/close`, {})
  },

  // disponible_lavada(lotId) — ver docs/production-area-b.md §4.
  async saldoLavado(lotId) {
    return apiClient.get(`/production-area-b/lots/${lotId}/washed-balance`)
  },
}
