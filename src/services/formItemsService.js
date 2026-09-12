// Servicio real — ver comrural_erp_backend/docs/form-items.md +
// form-item.dto.ts/form-items.service.ts, leídos completos.
//
// Un ítem, una vez creado, solo tiene DOS cosas mutables por API: `label`
// (PATCH .../label) y pasar de activo a inactivo (PATCH .../status, sin
// vuelta atrás — updateFormItemStatusSchema fuerza isActive: literal(false)).
// dataType/config/unit/isRequired/section/sortOrder/occurrences NUNCA se
// editan, ni acá ni en el backend — no hay endpoint para eso.
import { apiClient } from '../lib/apiClient'

export const formItemsService = {
  async listar(formId, { status, section, cursor, limit } = {}) {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (section) params.set('section', section)
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    const query = params.toString()
    return apiClient.get(`/forms/${formId}/items${query ? `?${query}` : ''}`)
  },

  async crear(formId, dto) {
    return apiClient.post(`/forms/${formId}/items`, dto)
  },

  async actualizarLabel(formId, itemId, label) {
    return apiClient.patch(`/forms/${formId}/items/${itemId}/label`, { label })
  },

  async desactivar(formId, itemId, reason) {
    return apiClient.patch(`/forms/${formId}/items/${itemId}/status`, { isActive: false, reason })
  },
}
