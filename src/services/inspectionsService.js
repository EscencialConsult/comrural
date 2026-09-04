// Servicio real — ver comrural_erp_backend/docs/inspections.md +
// docs/form-items.md, leídos completos.
//
// El cliente nunca elige el formulario (el backend siempre resuelve
// I-CAL-29/R-01) ni manda `rejectedBagCount` al completar — lo calcula el
// backend leyendo la respuesta del ítem `total_rejected_bags`. Cada
// respuesta de `guardarRespuestas` manda exactamente uno de
// valueBoolean/valueNumber/valueText/valueDate/valueOption según el
// `dataType` del ítem (BOOLEAN/INTEGER-DECIMAL/TEXT/DATE/SELECT
// respectivamente), o `clear: true` para borrar una respuesta ya guardada.
import { apiClient } from '../lib/apiClient'

export const inspectionsService = {
  async iniciar(lotId, dto) {
    return apiClient.post(`/raw-material-lots/${lotId}/inspections`, dto)
  },

  async obtener(inspectionId) {
    return apiClient.get(`/inspections/${inspectionId}`)
  },

  // PATCH /inspections/:id — hoy solo corrige `startedAt`, editable mientras
  // la inspección siga INICIADA (agregado a pedido explícito, ver
  // comrural_erp_backend/docs/inspections.md §8).
  async actualizar(inspectionId, dto) {
    return apiClient.patch(`/inspections/${inspectionId}`, dto)
  },

  async guardarRespuestas(inspectionId, respuestas) {
    return apiClient.patch(`/inspections/${inspectionId}/responses`, { responses: respuestas })
  },

  async completar(inspectionId, dto) {
    return apiClient.post(`/inspections/${inspectionId}/complete`, dto)
  },
}
