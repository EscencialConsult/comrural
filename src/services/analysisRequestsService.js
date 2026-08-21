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
}
