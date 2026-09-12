// Servicio real — comrural_erp_backend/src/laboratory/external-shipments/.
// Respalda el registro I-LAB-16/R-01 ("Registro Envío de Muestras").
//
// El envío pasa por un circuito de dos firmas antes de salir:
//   BORRADOR → (submit) PENDIENTE_GAC → (verificar) PENDIENTE_GG
//            → (autorizar) AUTORIZADO → (enviar) ENVIADO
//            → RESULTADO_RECIBIDO → CERRADO
//
// `autorizar` requiere el permiso external-shipments:authorize, que NO tiene
// el rol `calidad` — es la firma de Gerencia General.
//
// El laboratorio destino es un `supplier` con type=LABORATORY (ver
// suppliersService.listar({ type: 'LABORATORY' })), no un catálogo propio.
import { apiClient } from '../lib/apiClient'

export const externalShipmentsService = {
  // No se manda `sampleId`: sale siempre de la solicitud. No hay filas de
  // submuestra — el propio id del envío identifica la porción preparada.
  async crear(requestId, dto) {
    return apiClient.post(`/analysis-requests/${requestId}/external-shipments`, dto)
  },

  async listarPorSolicitud(requestId) {
    return apiClient.get(`/analysis-requests/${requestId}/external-shipments`)
  },

  async listar(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.set(k, String(v))
    })
    const qs = query.toString()
    return apiClient.get(`/external-shipments${qs ? `?${qs}` : ''}`)
  },

  async obtener(shipmentId) {
    return apiClient.get(`/external-shipments/${shipmentId}`)
  },

  // Solo en BORRADOR. `items`, si viene, es la lista COMPLETA deseada.
  async actualizar(shipmentId, dto) {
    return apiClient.patch(`/external-shipments/${shipmentId}`, dto)
  },

  // Manda el envío al circuito de firmas. Reinicia las dos firmas: nadie
  // hereda una aprobación anterior sobre un envío que se corrigió después.
  async enviarAFirma(shipmentId) {
    return apiClient.post(`/external-shipments/${shipmentId}/submit`)
  },

  // Firma GAC. `approved:false` lo devuelve a BORRADOR para corregirlo.
  async verificar(shipmentId, { approved, observation }) {
    return apiClient.post(`/external-shipments/${shipmentId}/verify`, { approved, ...(observation ? { observation } : {}) })
  },

  // Firma Gerencia General. Requiere verificación GAC aprobada.
  async autorizar(shipmentId, { approved, observation }) {
    return apiClient.post(`/external-shipments/${shipmentId}/authorize`, { approved, ...(observation ? { observation } : {}) })
  },

  async marcarEnviado(shipmentId, dto = {}) {
    return apiClient.post(`/external-shipments/${shipmentId}/send`, dto)
  },

  async anular(shipmentId, cancellationReason) {
    return apiClient.post(`/external-shipments/${shipmentId}/cancel`, { cancellationReason })
  },
}
