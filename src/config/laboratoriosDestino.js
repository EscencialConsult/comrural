// Catálogo de laboratorios destino para "Asignar laboratorio"
// (FormularioSubdividirMuestra.jsx) — 100% mock: el backend no tiene ningún
// catálogo de laboratorios externos (ver docs/laboratory.md,
// analysis_request_items solo guarda executionModeSnapshot INTERNAL/EXTERNAL,
// sin id de laboratorio). Se define acá, un solo lugar, para no repetir la
// lista si en el futuro se necesita en otra pantalla.
//
// Interno es UN solo destino fijo (pastilla de un clic, no hace falta
// buscarlo). Los externos son un catálogo que puede crecer — por eso van en
// un buscador (SelectorDeBase.jsx) en vez de una pastilla por cada uno.
export const LABORATORIO_INTERNO = { id: 'INTERNO', nombre: 'Laboratorio interno' }

export const LABORATORIOS_EXTERNOS = [
  { id: 'MERIEUX', nombre: 'Mérieux NutriSciences' },
  { id: 'AGQ', nombre: 'AGQ Labs' },
  { id: 'EUROFINS', nombre: 'Eurofins' },
]

export const UNIDADES_SUBMUESTRA = ['G', 'KG']

// Clave para agrupar ensayos por destino real: los laboratorios del
// catálogo se agrupan por su id, pero dos asignaciones a 'OTRO' con nombre
// distinto (ej. dos externos sin catálogo) son destinos distintos — se
// agrupan por nombre en ese caso.
export function claveDestino({ labId, nombre }) {
  return labId === 'OTRO' ? `OTRO:${nombre.trim().toLowerCase()}` : labId
}
