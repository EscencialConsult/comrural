// Tailwind necesita ver la clase completa como string literal en el
// código fuente — "bg-${color}" armado en runtime no lo detecta el
// compilador. Por eso este mapa explícito en vez de interpolar el
// nombre del color que viene del mock (panel-resumen.json).
export const COLOR_BG = {
  'verde-hoja': 'bg-verde-hoja',
  'verde-lima': 'bg-verde-lima',
  'celeste-aqua': 'bg-celeste-aqua',
  'rojo-pasankalla': 'bg-rojo-pasankalla',
  'marron-arcilla': 'bg-marron-arcilla',
  'marron-cafe': 'bg-marron-cafe',
  'azul-andino': 'bg-azul-andino',
}

export const COLOR_TEXT = {
  'verde-hoja': 'text-verde-hoja',
  'verde-lima': 'text-verde-lima',
  'celeste-aqua': 'text-celeste-aqua',
  'rojo-pasankalla': 'text-rojo-pasankalla',
  'marron-arcilla': 'text-marron-arcilla',
  'marron-cafe': 'text-marron-cafe',
  'azul-andino': 'text-azul-andino',
}

// Para SVG (stroke/fill) referenciamos directo la custom property de
// Tailwind (definida en index.css @theme) vía style inline — ahí sí se
// puede interpolar en runtime porque no es una clase, es CSS real.
export const colorVar = (nombre) => `var(--color-${nombre})`
