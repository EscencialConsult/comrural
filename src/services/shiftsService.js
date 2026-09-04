// Servicio real — comrural_erp_backend/src/shifts/. Catálogo de turnos, sin
// paginar (pocas filas). Requiere shifts:read (agregado en 0036, ver
// comrural_erp_backend/src/database/migrations/0036_shifts_and_users_read_permissions.sql).
import { apiClient } from '../lib/apiClient'

export const shiftsService = {
  async listar() {
    return apiClient.get('/shifts')
  },
}
