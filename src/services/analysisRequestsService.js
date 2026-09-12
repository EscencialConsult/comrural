// Servicio real — comrural_erp_backend/src/laboratory/analysis-requests/.
// Segundo paso del flujo de "Solicitud de análisis" (después de crear la
// muestra, ver samplesService). shiftId/operationalDate/status/effectiveType
// los resuelve el servidor solo — nunca se mandan acá (ver
// createAnalysisRequestSchema, .strict()).
import { apiClient } from '../lib/apiClient'

export const analysisRequestsService = {
  async crear(sampleId, dto) {
    return apiClient.post(`/samples/${sampleId}/analysis-requests`, dto)
  },

  async listar(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.set(k, String(v))
    })
    const qs = query.toString()
    return apiClient.get(`/analysis-requests${qs ? `?${qs}` : ''}`)
  },

  async obtener(requestId) {
    return apiClient.get(`/analysis-requests/${requestId}`)
  },

  async disponibilidadExpress() {
    return apiClient.get('/analysis-requests/express-availability')
  },

  async disponibilidadRegular() {
    return apiClient.get('/analysis-requests/regular-availability')
  },

  // POST .../receive-sample — el laboratorio confirma que recibió la
  // muestra físicamente. `dto` es una unión discriminada por
  // acceptanceCriteriaMet: { acceptanceCriteriaMet: true, expectedResultDate,
  // receptionNotes? } o { acceptanceCriteriaMet: false, rejectionReason }.
  async recibirMuestra(requestId, dto) {
    return apiClient.post(`/analysis-requests/${requestId}/receive-sample`, dto)
  },

  // POST .../start-analysis — transición real RECIBIDA -> EN_PROCESO
  // (también mueve lots.currentStatus a EN_ANALISIS del lado del
  // servidor). Sin body. Devuelve el mismo detalle completo que
  // `obtener()`, así que una sola llamada alcanza tanto para actualizar el
  // estado en la lista de Pendientes como para abrir
  // FormularioIniciarAnalisis.jsx con los ensayos ya agrupados por
  // categoría.
  async iniciarAnalisis(requestId) {
    return apiClient.post(`/analysis-requests/${requestId}/start-analysis`)
  },

  // POST .../assign-modality — Laboratorio decide, ensayo por ensayo, si lo
  // procesa internamente o lo deriva a un externo. Es PARCIAL: solo van los
  // ensayos que se están asignando o corrigiendo ahora.
  //
  // `assignments`: [{ itemId, executionMode: 'INTERNAL'|'EXTERNAL', observation? }]
  //
  // El backend rechaza (409) si el ensayo ya tiene su ruta iniciada (hay
  // ejecución o viaja en un envío vigente), o si se pide INTERNAL para un
  // ensayo sin planilla interna en el catálogo. Devuelve el detalle completo
  // de la solicitud, con `items[].assignedExecutionMode` actualizado.
  async asignarModalidad(requestId, assignments) {
    return apiClient.post(`/analysis-requests/${requestId}/assign-modality`, { assignments })
  },
}
