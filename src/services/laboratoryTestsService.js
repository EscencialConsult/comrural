// Servicio real — GET /laboratory-tests (comrural_erp_backend/src/laboratory/
// tests/). Catálogo de ensayos de laboratorio, agrupado por category
// (PHYSICOCHEMICAL/MICROBIOLOGICAL/TOXICOLOGICAL/SENSORY/OTHER) — 53 filas
// hoy (52 ensayos reales + 'OTHER', ver migración 0029). `active: true` por
// default en el backend, no hace falta mandarlo.
import { apiClient } from '../lib/apiClient'

export const laboratoryTestsService = {
  async listar({ limit = 100, cursor, category, search } = {}) {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (cursor) params.set('cursor', cursor)
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    return apiClient.get(`/laboratory-tests?${params.toString()}`)
  },
}
