// Servicio real — ver comrural_erp_backend/docs/organizations.md.
//
// Catálogo grande (a diferencia de countries): pagina keyset por id
// (`?cursor&limit`, ver uuidCursorPaginationSchema en el backend). Tiene
// vista de detalle propia (GET /organizations/:id) además del listado.
// tradeName/address/phone/email son nullable — el backend solo toca en el
// PATCH las claves que vengan presentes en el body (`dto.X !== undefined`),
// así que para "vaciar" un campo hay que mandar explícitamente `null`, no
// omitir la clave (ver organizations.service.ts, update()).
import { apiClient } from '../lib/apiClient'

export const organizationsService = {
  async listar({ cursor, limit } = {}) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    const query = params.toString()
    return apiClient.get(`/organizations${query ? `?${query}` : ''}`)
  },

  async obtener(organizationId) {
    return apiClient.get(`/organizations/${organizationId}`)
  },

  async crear(dto) {
    return apiClient.post('/organizations', dto)
  },

  async actualizar(organizationId, dto) {
    return apiClient.patch(`/organizations/${organizationId}`, dto)
  },
}
