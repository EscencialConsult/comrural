// Servicio real — comrural_erp_backend/docs/lot-traceability.md, leído
// completo. Solo lectura: no hay crear/actualizar/eliminar en este módulo,
// ni los va a haber (es una vista de hitos compuesta, no dueña de ninguna
// tabla).
import { apiClient } from '../lib/apiClient'

export const lotTraceabilityService = {
  async obtener(lotId) {
    return apiClient.get(`/lots/${lotId}/traceability`)
  },
}
