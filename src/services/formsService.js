// Servicio real — ver comrural_erp_backend/docs/forms.md +
// form.dto.ts/forms.service.ts, leídos completos.
//
// `code` es inmutable una vez creado — PATCH solo acepta
// `name`/`areaId`/`isActive`. No hay DELETE, solo `isActive: false`.
// Paginado por cursor (mismo criterio que lots/people/organizations).
import { apiClient } from '../lib/apiClient'

export const formsService = {
  async listar({ cursor, limit } = {}) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    const query = params.toString()
    return apiClient.get(`/forms${query ? `?${query}` : ''}`)
  },

  async obtener(formId) {
    return apiClient.get(`/forms/${formId}`)
  },

  async crear({ code, name, areaId }) {
    return apiClient.post('/forms', { code, name, areaId })
  },

  async actualizar(formId, dto) {
    return apiClient.patch(`/forms/${formId}`, dto)
  },
}
