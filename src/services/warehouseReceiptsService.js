// Servicio real — ver comrural_erp_backend/docs/warehouse-receipts.md, leído
// completo.
//
// Campos que el backend calcula y NUNCA se mandan desde acá:
// qualityInspectionId, rejectedPackageCount, acceptedPackageCount,
// storedPackageCount, averageAcceptedNetWeightKg, status. `receivedPackageCount`
// se puede editar por PATCH solo hasta que exista una resolución de Calidad
// para esta recepción — después queda bloqueado (400 si se intenta). Los
// pesos (`acceptedGrossWeightKg`/`acceptedNetWeightKg`) solo se aceptan junto
// con `complete: true`, y solo si hay envases autorizados > 0 — si la
// decisión de Calidad fue RECHAZADA (0 autorizados), cerrar es
// `{ complete: true }` solo, sin pesos. Los quintales son conversión de
// presentación del frontend — la API solo habla en kilogramos.
import { apiClient } from '../lib/apiClient'

export const warehouseReceiptsService = {
  async iniciar(lotId, dto) {
    return apiClient.post(`/raw-material-lots/${lotId}/warehouse-receipts`, dto)
  },

  async obtener(warehouseReceiptId) {
    return apiClient.get(`/warehouse-receipts/${warehouseReceiptId}`)
  },

  async actualizar(warehouseReceiptId, dto) {
    return apiClient.patch(`/warehouse-receipts/${warehouseReceiptId}`, dto)
  },
}
