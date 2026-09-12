// Helper transversal (tarea "FE · M0 · Requisitos transversales",
// subtarea "helper de paginación keyset: usar nextCursor solo cuando
// hasMore sea true"). Los listados reales que sí paginan (ver docs/*.md
// del backend: people, organizations, suppliers, products, lots — countries
// es la excepción, catálogo chico sin paginación) devuelven
// `{ data, nextCursor, hasMore }` — la regla del backend es que
// `nextCursor` solo sirve para pedir la página siguiente cuando `hasMore`
// es true; mandarlo cuando es false puede repetir la última página o
// fallar. Centralizado acá para que ninguna pantalla de M2-M6 tenga que
// acordarse de la regla por su cuenta.
//
// Uso típico (botón "cargar más"):
//   const [cursor, setCursor] = useState(undefined)
//   const respuesta = await peopleService.listar({ cursor })
//   setCursor(siguienteCursor(respuesta))
//   // en el JSX: {cursor && <button onClick={cargarMas}>Cargar más</button>}
export function siguienteCursor({ hasMore, nextCursor }) {
  return hasMore ? nextCursor : null
}

// Trae TODAS las páginas de un catálogo chico (productos, proveedores,
// personas, organizaciones — nunca lotes/solicitudes de análisis: esos
// crecen sin techo real y necesitan paginación de verdad del lado del
// usuario, no cargarlos todos de una). Antes cada pantalla pedía una sola
// página
// con `limit: 100` y se quedaba ahí — si el catálogo pasaba de 100 filas, el
// resto quedaba invisible sin ningún error (200 OK, solo una porción), mismo
// bug que ya se había encontrado y corregido en PanelFormularios.jsx. Acá se
// sigue el cursor hasta agotar `hasMore` para traer todo siempre, sin que
// cada pantalla tenga que acordarse del loop.
//
// `listarFn` es cualquier `service.listar` con la forma
// `({cursor, limit, ...resto}) => Promise<{data, hasMore, nextCursor}>`.
// `params` son los filtros fijos a mandar en cada página (ej. `{ type:
// 'LABORATORY' }`), nunca cursor/limit — esos los controla el loop.
export async function listarTodo(listarFn, params = {}) {
  let cursor
  let acumulado = []
  for (;;) {
    const resp = await listarFn({ ...params, limit: 100, cursor })
    acumulado = acumulado.concat(resp.data)
    cursor = siguienteCursor(resp)
    if (!cursor) break
  }
  return acumulado
}
