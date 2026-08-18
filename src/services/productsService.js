// Servicio real — ver comrural_erp_backend/docs/products.md.
//
// Catálogo simple a propósito: solo code (autogenerado "PROD-N" por el
// servidor, nunca lo manda el cliente) + name + isActive. `code` es
// inmutable por API — el PATCH ni lo acepta (updateProductSchema).
import { apiClient } from '../lib/apiClient'

export const productsService = {
  async listar({ cursor, limit } = {}) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    const query = params.toString()
    return apiClient.get(`/products${query ? `?${query}` : ''}`)
  },

  async obtener(productId) {
    return apiClient.get(`/products/${productId}`)
  },

  async crear(dto) {
    return apiClient.post('/products', dto)
  },

  async actualizar(productId, dto) {
    return apiClient.patch(`/products/${productId}`, dto)
  },
}
