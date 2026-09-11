// Servicio real — comrural_erp_backend/docs/warehouse-deliveries.md, leído
// completo. `entregadoPor`/`estado`/`recibidoPor`/`confirmadoEn` los asigna
// el servidor — nunca se mandan al crear.
import { apiClient } from '../lib/apiClient'

export const warehouseDeliveriesService = {
  async crear(dto) {
    return apiClient.post('/warehouse-deliveries', dto)
  },

  async obtener(id) {
    return apiClient.get(`/warehouse-deliveries/${id}`)
  },

  async confirmar(id, dto = {}) {
    return apiClient.post(`/warehouse-deliveries/${id}/confirm`, dto)
  },

  async listarPorLote(lotId) {
    return apiClient.get(`/lots/${lotId}/warehouse-deliveries`)
  },

  async listar({ estado } = {}) {
    const params = new URLSearchParams()
    if (estado) params.set('estado', estado)
    const query = params.toString()
    return apiClient.get(`/warehouse-deliveries${query ? `?${query}` : ''}`)
  },
}
