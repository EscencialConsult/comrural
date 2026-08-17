// Servicio real (no mock) — le pega directo al backend. Ver
// comrural_erp_backend/docs/products.md.
import { apiClient } from '../lib/apiClient'

export const productsService = {
  async listar() {
    const { data } = await apiClient.get('/products?limit=100')
    return data
  },
}
