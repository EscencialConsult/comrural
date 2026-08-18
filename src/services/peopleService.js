// Servicio real — ver comrural_erp_backend/docs/people.md.
//
// Mismo criterio que organizations: catálogo grande, pagina keyset por id,
// tiene vista de detalle propia. identityDocument/location/phone son
// nullable — el PATCH solo toca las claves presentes en el body (ver
// people.service.ts, update()), así que "vaciar" un campo requiere mandar
// `null` explícito, no omitir la clave. `userId` NO es un campo de este
// service: el DTO del backend directamente no lo acepta (.strict()) y acá
// ni siquiera se modela — nunca hay forma de mandarlo por accidente.
import { apiClient } from '../lib/apiClient'

export const peopleService = {
  async listar({ cursor, limit } = {}) {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (limit) params.set('limit', String(limit))
    const query = params.toString()
    return apiClient.get(`/people${query ? `?${query}` : ''}`)
  },

  async obtener(personId) {
    return apiClient.get(`/people/${personId}`)
  },

  async crear(dto) {
    return apiClient.post('/people', dto)
  },

  async actualizar(personId, dto) {
    return apiClient.patch(`/people/${personId}`, dto)
  },
}
