// Servicio real — comrural_erp_backend/src/laboratory/reports/.
//
// Dos orígenes en una sola entidad:
//   INTERNO — lo elabora el laboratorio. Tiene `reportData` (JSONB editable
//             mientras está en BORRADOR) + el PDF final.
//   EXTERNO — llega como PDF del proveedor. Sin JSONB: el contenido técnico
//             oficial es ese archivo.
//
// Una corrección NO sobrescribe: crea OTRO informe con `replacesReportId`, y
// el anterior pasa a REEMPLAZADO.
import { apiClient } from '../lib/apiClient'

export const laboratoryReportsService = {
  // Abre el borrador de una planilla interna. `itemIds` son los ensayos que
  // cubre: todos tienen que estar asignados a INTERNAL y compartir la misma
  // planilla (`internalReportType`).
  async crearInterno(requestId, dto) {
    return apiClient.post(`/analysis-requests/${requestId}/reports/internal`, dto)
  },

  // Registra el PDF que llegó del laboratorio externo. Cuelga del ENVÍO, no
  // de la solicitud: solo puede cubrir ensayos que viajaron en ese envío.
  async crearExterno(shipmentId, dto) {
    return apiClient.post(`/external-shipments/${shipmentId}/report`, dto)
  },

  async listarPorSolicitud(requestId) {
    return apiClient.get(`/analysis-requests/${requestId}/reports`)
  },

  // "¿Qué falta para cerrar esta solicitud?" — ensayos activos todavía sin
  // un informe VALIDADO que los cubra, separados por modalidad.
  async cobertura(requestId) {
    return apiClient.get(`/analysis-requests/${requestId}/coverage`)
  },

  async obtener(reportId) {
    return apiClient.get(`/laboratory-reports/${reportId}`)
  },

  // Guardado parcial del borrador interno. `expectedDataVersion` es bloqueo
  // optimista: si otro analista guardó en el medio, el backend responde 409
  // en vez de pisarle el trabajo — hay que recargar antes de reintentar.
  async guardarDatos(reportId, { reportData, reportSchemaVersion, expectedDataVersion }) {
    return apiClient.put(`/laboratory-reports/${reportId}/data`, {
      reportData,
      reportSchemaVersion,
      expectedDataVersion,
    })
  },

  async adjuntarDocumento(reportId, documentId) {
    return apiClient.post(`/laboratory-reports/${reportId}/attach-document`, { documentId })
  },

  async enviarAValidacion(reportId) {
    return apiClient.post(`/laboratory-reports/${reportId}/submit`, {})
  },

  // La firma final. Exige PDF DISPONIBLE. Es el único punto donde el backend
  // recalcula el estado de la solicitud (ANALIZADA / PENDIENTE_EXTERNOS).
  async validar(reportId) {
    return apiClient.post(`/laboratory-reports/${reportId}/validate`, {})
  },

  async anular(reportId, cancellationReason) {
    return apiClient.post(`/laboratory-reports/${reportId}/cancel`, { cancellationReason })
  },
}
