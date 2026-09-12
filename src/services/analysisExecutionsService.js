// Servicio real — comrural_erp_backend/src/laboratory/analysis-executions/.
// Ver docs/laboratory-executions-shipments-reports.md del backend.
//
// La ejecución es POR ENSAYO, no por solicitud: cada `analysis_request_item`
// asignado a INTERNAL tiene su propia fila, con `attemptNumber` para los
// reintentos. Abrir el trabajo de una solicitud crea varias ejecuciones de
// una (una por ensayo interno) — por eso `crear` devuelve un array.
import { apiClient } from '../lib/apiClient'

export const analysisExecutionsService = {
  // POST /analysis-requests/:id/executions — abre el trabajo interno. Sin
  // `itemIds` toma TODOS los ensayos activos asignados a INTERNAL.
  // `preparedQuantity`/`preparedUnit` es el peso de submuestra del grupo: el
  // backend lo copia igual a cada ejecución creada.
  async crear(requestId, dto = {}) {
    return apiClient.post(`/analysis-requests/${requestId}/executions`, dto)
  },

  // Historial completo de la solicitud, incluidos los intentos ya cerrados.
  async listarPorSolicitud(requestId) {
    return apiClient.get(`/analysis-requests/${requestId}/executions`)
  },

  async obtener(executionId) {
    return apiClient.get(`/analysis-executions/${executionId}`)
  },

  async iniciar(executionId, dto = {}) {
    return apiClient.post(`/analysis-executions/${executionId}/start`, dto)
  },

  // "Finalizada" = terminó el trabajo analítico, NO que el informe esté
  // validado — eso se resuelve aparte, en laboratoryReportsService.
  async finalizar(executionId, dto = {}) {
    return apiClient.post(`/analysis-executions/${executionId}/complete`, dto)
  },

  // Anula el intento y deja el ensayo libre para un reintento.
  async anular(executionId, cancellationReason) {
    return apiClient.post(`/analysis-executions/${executionId}/cancel`, { cancellationReason })
  },

  async actualizar(executionId, dto) {
    return apiClient.patch(`/analysis-executions/${executionId}`, dto)
  },
}
