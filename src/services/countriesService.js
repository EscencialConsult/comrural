// Servicio real (no mock) — le pega directo al backend. Ver
// comrural_erp_backend/docs/countries.md.
//
// Catálogo cerrado y chico: GET no pagina (el backend devuelve todo de
// una, ordenado por codigoIso). codigoIso es inmutable una vez creado —
// PATCH solo acepta `nombre`. No hay DELETE, un país nunca se borra.
import { apiClient } from '../lib/apiClient'

export const countriesService = {
  async listar() {
    const { data } = await apiClient.get('/countries')
    return data
  },

  async crear({ codigoIso, nombre }) {
    return apiClient.post('/countries', { codigoIso, nombre })
  },

  async actualizar(countryId, { nombre }) {
    return apiClient.patch(`/countries/${countryId}`, { nombre })
  },
}
