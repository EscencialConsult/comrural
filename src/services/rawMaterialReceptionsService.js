// Servicio real — ver comrural_erp_backend/docs/raw-material-receptions.md,
// leído completo.
//
// Un solo endpoint de solo lectura: compone lote + inspección + recepción de
// Almacén + resolución de Calidad en una vista consolidada, con todos los
// flags ya calculados por el backend (canRegisterWeight,
// canCompleteWithoutWeight, canApprove, storageAuthorized,
// receptionAccepted). El frontend nunca recalcula estos flags — siempre se
// vuelve a pedir esta vista después de cada mutación (iniciar/actualizar
// recepción, guardar/completar inspección, emitir/aprobar resolución) en vez
// de confiar en el estado local.
//
// `inspection`/`warehouseReceipt`/`qualityResolution` en la respuesta son
// `null` si ese recurso todavía no existe para el lote — nunca 404 por eso.
// 404 real solo si el lote no existe; 409 si el lote no es PM.
import { apiClient } from '../lib/apiClient'

export const rawMaterialReceptionsService = {
  async obtener(lotId) {
    return apiClient.get(`/raw-material-lots/${lotId}/reception`)
  },
}
