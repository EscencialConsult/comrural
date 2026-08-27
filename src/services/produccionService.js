// Servicio de Producción — el backend todavía no existe (ver PRODUCT.md),
// así que esto devuelve datos mock EN MEMORIA con la misma forma que va a
// tener la API real (mismo criterio de aislar el mock en la capa de
// servicio que ya usaban otros módulos mientras no tenían backend). El día
// que exista el backend, solo cambia el cuerpo de estos métodos — ninguna
// pantalla se toca porque ya consumen esta capa de servicio, nunca datos
// sueltos.
//
// `delay()` simulado con el mismo criterio que servicioService.js: evita que
// la UI salte de "carga instantánea" a "carga real" el día que esto hable
// con un backend de verdad.
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

const LOTES = [
  {
    id: 'lp-1',
    code: 'PT-2026-0142',
    product: 'Quinua Real Perlada',
    area: 'A',
    etapa: 'Escarificado',
    turnoActual: 1,
    kilosProcesados: 2400,
    kilosTotal: 4000,
    currentStatus: 'EN_PROCESO',
    humedad: { valor: 13.2, min: 10, max: 13.5 },
    temperatura: { valor: 34, min: 20, max: 40 },
    updatedAt: '2026-08-26T09:10:00-04:00',
  },
  {
    id: 'lp-2',
    code: 'PT-2026-0143',
    product: 'Quinua Real Perlada',
    area: 'A',
    etapa: 'Secado',
    turnoActual: 2,
    kilosProcesados: 1800,
    kilosTotal: 3000,
    currentStatus: 'PAUSADO',
    humedad: { valor: 14.8, min: 10, max: 13.5 },
    temperatura: { valor: 41, min: 20, max: 40 },
    updatedAt: '2026-08-26T11:40:00-04:00',
  },
  {
    id: 'lp-3',
    code: 'PT-2026-0139',
    product: 'Quinua Lavada',
    area: 'B',
    etapa: 'Lavado y clasificado',
    turnoActual: 3,
    kilosProcesados: 3600,
    kilosTotal: 3600,
    currentStatus: 'ESPERA_CALIDAD',
    humedad: { valor: 12.1, min: 10, max: 13.5 },
    temperatura: { valor: 27, min: 20, max: 40 },
    updatedAt: '2026-08-25T22:05:00-04:00',
  },
  {
    id: 'lp-4',
    code: 'PT-2026-0137',
    product: 'Quinua Envasada 1kg',
    area: 'B',
    etapa: 'Envasado',
    turnoActual: 1,
    kilosProcesados: 5000,
    kilosTotal: 5000,
    currentStatus: 'ESPERA_LAB_EXTERNO',
    humedad: { valor: 11.4, min: 10, max: 13.5 },
    temperatura: { valor: 24, min: 20, max: 40 },
    updatedAt: '2026-08-25T18:20:00-04:00',
  },
  {
    id: 'lp-5',
    code: 'PT-2026-0130',
    product: 'Quinua Real Perlada',
    area: 'A',
    etapa: 'Envasado',
    turnoActual: 2,
    kilosProcesados: 4200,
    kilosTotal: 4200,
    currentStatus: 'LIBERADO',
    humedad: { valor: 12.6, min: 10, max: 13.5 },
    temperatura: { valor: 26, min: 20, max: 40 },
    updatedAt: '2026-08-24T16:00:00-04:00',
  },
  {
    id: 'lp-6',
    code: 'PT-2026-0128',
    product: 'Quinua Lavada',
    area: 'B',
    etapa: 'Clasificado',
    turnoActual: 3,
    kilosProcesados: 2900,
    kilosTotal: 2900,
    currentStatus: 'RECHAZADO',
    humedad: { valor: 15.3, min: 10, max: 13.5 },
    temperatura: { valor: 30, min: 20, max: 40 },
    updatedAt: '2026-08-24T09:30:00-04:00',
  },
  {
    id: 'lp-7',
    code: 'PT-2026-0126',
    product: 'Quinua Real Perlada',
    area: 'A',
    etapa: 'Empacado final',
    turnoActual: 1,
    kilosProcesados: 3800,
    kilosTotal: 3800,
    currentStatus: 'FINALIZADO',
    humedad: { valor: 12.0, min: 10, max: 13.5 },
    temperatura: { valor: 23, min: 20, max: 40 },
    updatedAt: '2026-08-23T15:45:00-04:00',
  },
]

const INDICADORES = [
  { area: 'A', rendimiento: 92.4, saponina: 6.8, quinuaMenuda: 1.4 },
  { area: 'B', rendimiento: 88.7, quinuaSegunda: 2.1, quinuaTercera: 1.9 },
]

// Lotes de MATERIA PRIMA disponibles para entrega a Producción — distintos
// de LOTES de arriba (esos son de producto en proceso/PT). Formato de código
// real C-NNNNN-MP (lo genera Compras, ver RP-04 del relevamiento), se
// mantiene desde recepción hasta el envasado del producto final.
const LOTES_MP = [
  { id: 'mp-1', code: 'C-00142-MP', product: 'Quinua Real Perlada', pesoDisponibleKg: 4200 },
  { id: 'mp-2', code: 'C-00143-MP', product: 'Quinua Roja', pesoDisponibleKg: 3100 },
  { id: 'mp-3', code: 'C-00144-MP', product: 'Quinua Negra', pesoDisponibleKg: 2600 },
  { id: 'mp-4', code: 'C-00145-MP', product: 'Quinua Tricolor', pesoDisponibleKg: 1800 },
]

// Registros creados desde el formulario — en memoria nomás, sin backend
// todavía (ver PRODUCT.md). Mismo shape que va a tener el POST real: el
// servidor asignaría `id`/`fecha` en vez de generarlos acá.
const NOTAS_ENTREGA_MP = []
const REGISTROS_VOLUMEN_A = []
const REGISTROS_SECADO = []
const REGISTROS_EXISTENCIAS_B = []
const REGISTROS_VOLUMEN_B = []
const REGISTROS_ENVASADO = []
const MOVIMIENTOS_KARDEX = []
const REGISTROS_PRODUCTO_ALMACEN = []

export const produccionService = {
  async listarLotes() {
    await delay()
    return [...LOTES]
  },

  async listarIndicadores() {
    await delay()
    return [...INDICADORES]
  },

  async listarLotesMp() {
    await delay()
    return [...LOTES_MP]
  },

  async registrarNotaEntregaMp(dto) {
    await delay()
    const registro = { id: `nota-${NOTAS_ENTREGA_MP.length + 1}`, fecha: new Date().toISOString(), ...dto }
    NOTAS_ENTREGA_MP.push(registro)
    return registro
  },

  async registrarVolumenA(dto) {
    await delay()
    const registro = { id: `vol-a-${REGISTROS_VOLUMEN_A.length + 1}`, registradoEn: new Date().toISOString(), ...dto }
    REGISTROS_VOLUMEN_A.push(registro)
    return registro
  },

  async registrarSecado(dto) {
    await delay()
    const registro = { id: `secado-${REGISTROS_SECADO.length + 1}`, registradoEn: new Date().toISOString(), ...dto }
    REGISTROS_SECADO.push(registro)
    return registro
  },

  async registrarExistenciasB(dto) {
    await delay()
    const registro = {
      id: `exist-b-${REGISTROS_EXISTENCIAS_B.length + 1}`,
      registradoEn: new Date().toISOString(),
      ...dto,
    }
    REGISTROS_EXISTENCIAS_B.push(registro)
    return registro
  },

  async registrarVolumenB(dto) {
    await delay()
    const registro = { id: `vol-b-${REGISTROS_VOLUMEN_B.length + 1}`, registradoEn: new Date().toISOString(), ...dto }
    REGISTROS_VOLUMEN_B.push(registro)
    return registro
  },

  async registrarEnvasado(dto) {
    await delay()
    const registro = { id: `envasado-${REGISTROS_ENVASADO.length + 1}`, registradoEn: new Date().toISOString(), ...dto }
    REGISTROS_ENVASADO.push(registro)
    return registro
  },

  async registrarMovimientoKardex(dto) {
    await delay()
    const registro = { id: `kardex-${MOVIMIENTOS_KARDEX.length + 1}`, registradoEn: new Date().toISOString(), ...dto }
    MOVIMIENTOS_KARDEX.push(registro)
    return registro
  },

  async registrarProductoAlmacen(dto) {
    await delay()
    const registro = {
      id: `almacen-pt-${REGISTROS_PRODUCTO_ALMACEN.length + 1}`,
      registradoEn: new Date().toISOString(),
      ...dto,
    }
    REGISTROS_PRODUCTO_ALMACEN.push(registro)
    return registro
  },
}
