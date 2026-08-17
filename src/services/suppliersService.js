// Servicio real (no mock) — le pega directo al backend. Ver
// comrural_erp_backend/docs/suppliers.md.
import { apiClient } from '../lib/apiClient'

export const suppliersService = {
  async listar() {
    const { data } = await apiClient.get('/suppliers?limit=100')
    return data
  },
}
