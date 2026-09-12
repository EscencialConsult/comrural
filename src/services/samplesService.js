// Servicio real — comrural_erp_backend/src/laboratory/samples/. Crear una
// muestra es el primer paso del flujo de "Solicitud de análisis": el lote
// tiene que estar en ACEPTADO_RECEPCION (el backend lo valida con 409 si no,
// ver SamplesService.create). code/status/sampledBy/sampledAt los asigna el
// servidor — nunca se mandan acá.
import { apiClient } from '../lib/apiClient'

export const samplesService = {
  async crear(lotId, dto) {
    return apiClient.post(`/raw-material-lots/${lotId}/samples`, dto)
  },

  async listarPorLote(lotId) {
    return apiClient.get(`/raw-material-lots/${lotId}/samples`)
  },

  async obtener(sampleId) {
    return apiClient.get(`/samples/${sampleId}`)
  },
}
