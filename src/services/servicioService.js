// Capa de servicio para la pantalla /servicio.
// Los componentes SIEMPRE importan de acá, nunca de src/mock directo.
// Ver src/mock/README.md — este archivo es lo único que backend necesita reescribir.
import { plataforma, modulos, descargas, novedades } from '../mock'

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

export const servicioService = {
  async getPlataforma() {
    await delay()
    return { ...plataforma }
  },

  async getModulos() {
    await delay()
    return [...modulos].sort((a, b) => a.orden - b.orden)
  },

  async getDescargas() {
    await delay()
    return [...descargas]
  },

  async getNovedades() {
    await delay()
    return [...novedades].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  },
}
