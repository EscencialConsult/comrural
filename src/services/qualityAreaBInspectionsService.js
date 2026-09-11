// Servicio real — comrural_erp_backend/docs/quality-area-b-inspections.md,
// leído completo. `inspectorId`/`createdAt` salen del actor autenticado;
// vobo solo se completa en POST .../vobo.
import { apiClient } from '../lib/apiClient'

export const qualityAreaBInspectionsService = {
  async crear(dto) {
    return apiClient.post('/quality-area-b-inspections', dto)
  },

  async obtener(id) {
    return apiClient.get(`/quality-area-b-inspections/${id}`)
  },

  async porCorrida(packagingEntryId) {
    return apiClient.get(`/quality-area-b-inspections/by-packaging-entry/${packagingEntryId}`)
  },

  async darVobo(id) {
    return apiClient.post(`/quality-area-b-inspections/${id}/vobo`, {})
  },

  // Rechazos/parciales del lote sin ningún reproceso enlazado todavía —
  // alimenta el selector de qualityInspectionId en
  // ModalRegistrarSalidaAreaB.jsx (entrada REPROCESO).
  async pendientesDeReproceso(lotId) {
    return apiClient.get(`/quality-area-b-inspections/lots/${lotId}/pending-reprocess`)
  },

  // Todos los controles ya registrados de un lote — usado por
  // InformesCalidadLaboratorio.jsx (pestaña "Informes Calidad/Lab" de
  // Producción).
  async listarPorLote(lotId) {
    return apiClient.get(`/quality-area-b-inspections/lots/${lotId}`)
  },
}
