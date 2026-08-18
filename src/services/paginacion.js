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
