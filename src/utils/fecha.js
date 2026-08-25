// datetime-local necesita "YYYY-MM-DDTHH:mm" en hora LOCAL del navegador —
// distinto de toISOString() (que da UTC). Los getters (getFullYear, etc.)
// de Date ya devuelven en local, por eso alcanza con formatearlos a mano.
export const aInputLocal = (fecha) => {
  if (!fecha) return ''
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Orden por defecto de los listados de lotes (Compras/Calidad/Almacén, los
// tres comparten el mismo campo `scheduledReceptionAt`): fecha de llegada
// más cercana primero. Sin fecha (no debería pasar en un lote PM, es
// obligatoria) queda al final en vez de romper el orden con un NaN.
export const compararPorFechaRecepcion = (a, b) => {
  const fa = a.scheduledReceptionAt ? new Date(a.scheduledReceptionAt).getTime() : Infinity
  const fb = b.scheduledReceptionAt ? new Date(b.scheduledReceptionAt).getTime() : Infinity
  return fa - fb
}
