// Servicio real — comrural_erp_backend/docs/packaging.md, leído completo.
// `packagedKg`/`recordedBy`/`verifiedBy`/`closedAt` los asigna el servidor.
import { apiClient } from '../lib/apiClient'

export const packagingService = {
  async crear(dto) {
    return apiClient.post('/packaging/entries', dto)
  },

  async listar({ closed } = {}) {
    const params = new URLSearchParams()
    if (closed !== undefined) params.set('closed', String(closed))
    const query = params.toString()
    return apiClient.get(`/packaging/entries${query ? `?${query}` : ''}`)
  },

  async obtener(id) {
    return apiClient.get(`/packaging/entries/${id}`)
  },

  async listarFuentes(id) {
    return apiClient.get(`/packaging/entries/${id}/sources`)
  },

  async agregarFuente(id, dto) {
    return apiClient.post(`/packaging/entries/${id}/sources`, dto)
  },

  async cerrar(id) {
    return apiClient.post(`/packaging/entries/${id}/close`)
  },

  async listarPorLote(lotId) {
    return apiClient.get(`/packaging/lots/${lotId}/entries`)
  },
}
