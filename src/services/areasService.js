// Servicio real — ver comrural_erp_backend/docs/areas.md.
//
// Catálogo chico sin paginación por cursor (a diferencia de forms/lots):
// GET devuelve `{ data }` completo, ordenado por name. Sin DELETE, un área
// nunca se borra. Se usa como referencia obligatoria de forms.areaId.
import { apiClient } from '../lib/apiClient'

export const areasService = {
  async listar() {
    return apiClient.get('/areas')
  },

  async crear({ name }) {
    return apiClient.post('/areas', { name })
  },

  async actualizar(areaId, { name }) {
    return apiClient.patch(`/areas/${areaId}`, { name })
  },
}
