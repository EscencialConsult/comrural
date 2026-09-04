// Servicio real — comrural_erp_backend/docs/control-proceso-a.md +
// control-proceso-a.schema.ts/control-proceso-a.service.ts, leídos
// completos. `inspectorId`/`purezaPct`/`voboSupervisorCalidadId`/`voboEn`
// los asigna el servidor — nunca se mandan acá. Dar el visto bueno es un
// endpoint aparte de la creación.
import { apiClient } from '../lib/apiClient'

export const controlProcesoAService = {
  async crear(dto) {
    return apiClient.post('/control-proceso-a', dto)
  },

  async obtener(id) {
    return apiClient.get(`/control-proceso-a/${id}`)
  },

  async listarPorLote(lotId) {
    return apiClient.get(`/control-proceso-a/lots/${lotId}`)
  },

  // Editable mientras el registro no tenga vobo (agregado a pedido
  // explícito, ver docs/control-proceso-a.md §4/§8) — 409 si ya lo tiene.
  async actualizar(id, dto) {
    return apiClient.patch(`/control-proceso-a/${id}`, dto)
  },

  async darVobo(id, dto = {}) {
    return apiClient.patch(`/control-proceso-a/${id}/vobo`, dto)
  },
}
