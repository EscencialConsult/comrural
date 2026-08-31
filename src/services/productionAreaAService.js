// Servicio real — comrural_erp_backend/docs/production-area-a.md +
// production-area-a-entries.schema.ts/production-area-a-entries.service.ts,
// leídos completos. `recordedBy`/`verifiedBy`/`difKg`/`closedAt` los asigna
// el servidor — nunca se mandan acá. El cierre de turno
// (avgDryer1TempC/avgDryer2TempC) es una llamada aparte de la creación.
import { apiClient } from '../lib/apiClient'

export const productionAreaAService = {
  async crear(dto) {
    return apiClient.post('/production-area-a/entries', dto)
  },

  async obtener(entryId) {
    return apiClient.get(`/production-area-a/entries/${entryId}`)
  },

  async listarPorLote(lotId) {
    return apiClient.get(`/production-area-a/lots/${lotId}/entries`)
  },

  async cerrar(entryId, dto) {
    return apiClient.patch(`/production-area-a/entries/${entryId}/close`, dto)
  },

  async balanceMasa(lotId) {
    return apiClient.get(`/production-area-a/lots/${lotId}/mass-balance`)
  },
}
