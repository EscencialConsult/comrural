// Servicio real — ver comrural_erp_backend/docs/suppliers.md.
//
// Un proveedor ES una persona física (people) o una organización
// (organizations), nunca ambas ni ninguna — el alta admite 4 alternativas
// excluyentes (personId | organizationId | person:{...} | organization:{...})
// y el backend las valida con superRefine (ver supplier.dto.ts). La
// identidad es inmutable: el PATCH acá solo acepta `type`/`isActive`.
import { apiClient } from '../lib/apiClient'

export const suppliersService = {
  // `type` (PRODUCER | LABORATORY | OTHER) e `isActive` filtran del lado del
  // servidor — los usa Laboratorio para ofrecer solo laboratorios activos al
  // armar un envío externo, sin traerse todo el padrón de proveedores.
  async listar({ cursor, limit, type, isActive } = {}) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    if (type) params.set('type', type)
    if (isActive !== undefined) params.set('isActive', String(isActive))
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
