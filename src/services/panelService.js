// Capa de servicio del panel (dashboard genérico compartido por los 8
// roles de prueba). Los componentes SIEMPRE importan de acá, nunca de
// src/mock directo. Ver src/mock/README.md — esto se reemplaza por
// endpoints reales por módulo (Almacén, Calidad, etc.) a medida que se
// releven — hoy es un único bloque de datos de ejemplo ("generado por
// IA" a pedido de Facundo) para clonar la referencia visual y recién
// después ir separando qué widget pertenece a qué módulo real.
import { panelResumen } from '../mock'

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

export const panelService = {
  async getResumen() {
    await delay()
    return panelResumen
  },
}
