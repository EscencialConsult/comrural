// Servicio real — comrural_erp_backend/docs/lot-traceability.md, leído
// completo. Solo lectura: no hay crear/actualizar/eliminar en este módulo,
// ni los va a haber (es una vista de hitos compuesta, no dueña de ninguna
// tabla).
import { apiClient } from '../lib/apiClient'

export const lotTraceabilityService = {
  async obtener(lotId) {
    return apiClient.get(`/lots/${lotId}/traceability`)
  },

  // Kardex de quinua lavada (P-PRO-01/R-23) — ver docs/lot-traceability.md
  // §4/production-area-b.md §1. INGRESO = Volumen A cerrado, SALIDA =
  // Área B inputType='NUEVA', con saldo corrido ya calculado por el backend.
  async kardexLavada(lotId) {
    return apiClient.get(`/lots/${lotId}/kardex-lavada`)
  },
}
