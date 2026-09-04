// Servicio real — ver comrural_erp_backend/docs/lots.md + lot.dto.ts/
// lots.service.ts, leídos completos.
//
// `code`/`currentStatus`/campos de auditoría los asigna el servidor, nunca
// se mandan. `nature` (PM/PT) es inmutable. El PATCH real solo reprograma
// `supplierId`/`scheduledReceptionAt`, y el backend lo rechaza con 409 si
// el lote no es PM o ya no está en PROGRAMADO (ver docs/lots.md §3).
//
// `listar()` sigue el mismo criterio que countries/people/organizations/
// suppliers/products: devuelve el sobre paginado { data, nextCursor,
// hasMore } completo, no solo el array — PanelCompras.jsx y PanelAlmacen.jsx
// ya consumen `.data` explícito (ver el fix aplicado ahí junto con este
// cambio, no después).
import { apiClient } from '../lib/apiClient'

export const lotsService = {
  // `code`: búsqueda parcial (ILIKE '%code%' del lado del servidor, ver
  // LotsService.list del backend) — para un buscador con debounce, no exige
  // coincidencia exacta ni por prefijo.
  async listar({ cursor, limit, code } = {}) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    if (code) params.set('code', code)
    const query = params.toString()
    return apiClient.get(`/lots${query ? `?${query}` : ''}`)
  },

  async obtener(lotId) {
    return apiClient.get(`/lots/${lotId}`)
  },

  async crear({ nature, productId, supplierId, scheduledReceptionAt }) {
    return apiClient.post('/lots', { nature, productId, supplierId, scheduledReceptionAt })
  },

  async actualizar(lotId, dto) {
    return apiClient.patch(`/lots/${lotId}`, dto)
  },
}
