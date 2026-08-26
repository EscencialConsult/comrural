// Aviso PURAMENTE visual de frontend: el "Permitido"/"Límite" de las
// tablas de resultados de Laboratorio (TablaResultadosEnsayo.jsx,
// TablaResultadosSimple.jsx) es texto fijo del papel, no un dato que el
// backend valide — el módulo laboratory todavía no registra resultados de
// ensayos (ver docs/laboratory.md §1). Esto solo lee ese texto y lo que
// tipeó el analista en "Encontrado"/"Resultado" para decidir si marcar la
// celda, nunca bloquea nada ni se manda a ningún lado.
//
// Formatos de "Permitido"/"Límite" que aparecen hoy en el papel:
//   "máx 8.5"      -> techo
//   "mín 20"        -> piso
//   "61 - 80"       -> rango
//   "68 ± 8"        -> centro ± tolerancia
//   "2,0x10^5"      -> notación científica, se interpreta como techo
//   "Ausencia"      -> debe dar 0 / "ausencia" / "no detectado"
//   cualquier otro  -> texto libre (ej. "Característico") — no se evalúa acá,
//                      TablaResultadosEnsayo.jsx compara por igualdad exacta
//                      cuando la celda es un <select> (fila.opciones).

const numero = (texto) => {
  if (texto == null) return null
  const m = String(texto).match(/-?\d+(?:[.,]\d+)?/)
  return m ? Number(m[0].replace(',', '.')) : null
}

// "2,0x10^5" -> 200000. Si no matchea notación científica, cae al parseo
// simple de arriba.
const numeroCientifico = (texto) => {
  if (texto == null) return null
  const m = String(texto).trim().match(/^(-?\d+(?:[.,]\d+)?)\s*x\s*10\^(-?\d+)$/i)
  if (m) return Number(m[1].replace(',', '.')) * 10 ** Number(m[2])
  return numero(texto)
}

// Interpreta el texto de "Permitido"/"Límite" y arma un rango { min?, max?,
// ausencia? }. `null` si el texto no describe un rango evaluable (ej. una
// opción de un desplegable como "Característico").
function rangoPermitido(permitidoTexto) {
  if (!permitidoTexto) return null
  const texto = String(permitidoTexto).trim()

  if (/^ausencia/i.test(texto)) return { max: 0, ausencia: true }

  const max = texto.match(/^m[aá]x\.?\s*([\d.,]+)/i)
  if (max) return { max: numero(max[1]) }

  const min = texto.match(/^m[ií]n\.?\s*([\d.,]+)/i)
  if (min) return { min: numero(min[1]) }

  const rango = texto.match(/^([\d.,]+)\s*-\s*([\d.,]+)$/)
  if (rango) return { min: numero(rango[1]), max: numero(rango[2]) }

  const tolerancia = texto.match(/^([\d.,]+)\s*±\s*([\d.,]+)$/)
  if (tolerancia) {
    const centro = numero(tolerancia[1])
    const tol = numero(tolerancia[2])
    return { min: centro - tol, max: centro + tol }
  }

  // Un número (o notación científica) suelto, sin "máx"/"mín" — los
  // límites microbiológicos vienen así ("2,0x10^5"). Se interpreta como
  // techo máximo.
  if (/^[\d.,x^-]+$/i.test(texto.replace(/\s/g, ''))) {
    const n = numeroCientifico(texto)
    if (n != null) return { max: n }
  }

  return null
}

// true si lo cargado en "Encontrado"/"Resultado" excede el permitido —
// vacío o texto libre no evaluable siempre da `false` (no marca nada).
export function excedeLimite(valorTexto, permitidoTexto) {
  if (valorTexto == null || String(valorTexto).trim() === '') return false
  const rango = rangoPermitido(permitidoTexto)
  if (!rango) return false

  if (rango.ausencia) {
    const n = numero(valorTexto)
    if (n != null) return n > 0
    return !/ausen|no\s*detect/i.test(String(valorTexto))
  }

  const n = numeroCientifico(valorTexto)
  if (n == null) return false
  if (rango.max != null && n > rango.max) return true
  if (rango.min != null && n < rango.min) return true
  return false
}
