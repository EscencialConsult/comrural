// Servicio real (no mock) — le pega directo al backend. Ver
// comrural_erp_backend/docs/lots.md. code/status los asigna el servidor,
// nunca se mandan en el alta.
import { apiClient } from '../lib/apiClient'

export const lotsService = {
  async listar() {
    const { data } = await apiClient.get('/lots?limit=100')
    return data
  },

  async crear({ nature, productId, supplierId, scheduledReceptionAt }) {
    return apiClient.post('/lots', { nature, productId, supplierId, scheduledReceptionAt })
  },
}
