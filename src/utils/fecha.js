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
// tres comparten el mismo campo `scheduledReceptionAt`):
// 1. Primero los lotes en estado PROGRAMADO.
// 2. Fechas de recepción hoy o futuras (próximas a llegar) primero, ordenadas por fecha y hora ascendente.
// 3. Fechas pasadas después, ordenadas de la más reciente a la más antigua.
// 4. Misma fecha y hora exacta: desempate por orden de creación (los creados de último primero).
export const compararPorFechaRecepcion = (a, b) => {
  const esProgA = a?.currentStatus === 'PROGRAMADO'
  const esProgB = b?.currentStatus === 'PROGRAMADO'
  if (esProgA && !esProgB) return -1
  if (!esProgA && esProgB) return 1

  const fa = a?.scheduledReceptionAt ? new Date(a.scheduledReceptionAt).getTime() : Infinity
  const fb = b?.scheduledReceptionAt ? new Date(b.scheduledReceptionAt).getTime() : Infinity

  if (fa !== fb) {
    if (fa === Infinity) return 1
    if (fb === Infinity) return -1

    const now = new Date()
    const inicioHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    const esFuturoA = fa >= inicioHoy
    const esFuturoB = fb >= inicioHoy

    if (esFuturoA && !esFuturoB) return -1
    if (!esFuturoA && esFuturoB) return 1

    if (esFuturoA && esFuturoB) {
      return fa - fb
    }

    return fb - fa
  }

  // Misma fecha y hora exacta -> desempate: primero los que se crearon de último (más recientes)
  if (a?.createdAt && b?.createdAt) {
    const ca = new Date(a.createdAt).getTime()
    const cb = new Date(b.createdAt).getTime()
    if (ca !== cb) return cb - ca
  }

  const numCode = (c) => {
    if (!c) return 0
    const m = String(c).match(/\d+/)
    return m ? parseInt(m[0], 10) : 0
  }
  const na = numCode(a?.code)
  const nb = numCode(b?.code)
  if (na !== nb) return nb - na

  return (b?.id ?? '').localeCompare(a?.id ?? '')
}




