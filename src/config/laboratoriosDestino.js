// Config de la preparación de muestra para Laboratorio.
//
// Ya NO hay catálogo de laboratorios acá: el laboratorio externo es una fila
// real de `suppliers` con type='LABORATORY' (ver
// suppliersService.listar({ type: 'LABORATORY' })). Si falta uno, se da de
// alta en Proveedores, no se agrega a una lista del frontend.

// Unidades ofrecidas para una porción preparada — subconjunto de las de
// `samples`, sin 'OTRA': una porción siempre se mide en algo conocido.
// Coincide con el CHECK del backend (analysis_executions_prepared_unit_check
// y external_shipments_unit_check aceptan G/KG/ML/L/PIEZA); acá se ofrecen
// solo las de peso, que son las que se usan en la práctica.
export const UNIDADES_SUBMUESTRA = ['G', 'KG']

// Conversión a gramos para comparar lo preparado contra la muestra total sin
// importar en qué unidad se cargó cada cosa — devuelve `null` cuando la
// unidad no es de peso (ej. la muestra se registró en ML o PIEZA), caso en el
// que no tiene sentido comparar.
export function aGramos(cantidad, unidad) {
  const n = Number(cantidad)
  if (!Number.isFinite(n)) return null
  if (unidad === 'G') return n
  if (unidad === 'KG') return n * 1000
  return null
}
