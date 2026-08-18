// Servicio real — ver comrural_erp_backend/docs/suppliers.md.
//
// Un proveedor ES una persona física (people) o una organización
// (organizations), nunca ambas ni ninguna — el alta admite 4 alternativas
// excluyentes (personId | organizationId | person:{...} | organization:{...})
// y el backend las valida con superRefine (ver supplier.dto.ts). La
// identidad es inmutable: el PATCH acá solo acepta `type`/`isActive`.
import { apiClient } from '../lib/apiClient'

export const suppliersService = {
  async listar({ cursor, limit } = {}) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    const query = params.toString()
    return apiClient.get(`/suppliers${query ? `?${query}` : ''}`)
  },

  async obtener(supplierId) {
    return apiClient.get(`/suppliers/${supplierId}`)
  },

  async crear(dto) {
    return apiClient.post('/suppliers', dto)
  },

  async actualizar(supplierId, dto) {
    return apiClient.patch(`/suppliers/${supplierId}`, dto)
  },
}
