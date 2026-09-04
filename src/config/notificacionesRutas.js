// Único lugar que decide "a dónde lleva el click" de cada tipo de
// notificación — misma idea que NOTIFICATION_CATALOG del backend (quién la
// recibe), pero para ruteo, indexado por el mismo `type`. Agregar un tipo
// nuevo es agregar una clave acá; agregar una audiencia con destino propio a
// un tipo existente es agregar un objeto a su lista — ninguna de las dos
// cosas toca las entradas ya conectadas.
//
// Cada entrada es una lista de candidatos en orden de prioridad: se recorre
// y se usa el primero cuyo `permiso` tenga el usuario actual (permisos.has,
// mismo criterio que gatea todo el resto de la interfaz — nunca por rol).
// `ruta(n)` puede devolver `null` para descartar ese candidato igual (ver
// LOT_CREATED/almacen: un lote PT no tiene pantalla de Almacén todavía), en
// cuyo caso se sigue probando el siguiente de la lista.
//
// Un `type` que llega sin entrada acá no navega a ningún lado (solo se
// marca leída) — nunca un botón que lleve a una pantalla rota.
export const RUTAS_NOTIFICACION = {
  ANALYSIS_REQUEST_CREATED: [{ permiso: 'samples:read', ruta: () => '/panel/laboratorio?tab=pendientes' }],

  PRODUCTION_AREA_A_LOW_DRYER_TEMP: [
    { permiso: 'production-area-a:read', ruta: () => '/panel/produccion/area-a' },
  ],

  // Calidad primero: tiene deep-link real al lote (/panel/calidad/lotes/:id)
  // para ambas naturalezas. Almacén solo tiene pantalla para lotes PM
  // (Recepción filtra nature==='PM') — para un lote PT no hay destino en
  // Almacén todavía, así que ese candidato se autodescarta (ruta → null) y
  // el click no navega si el usuario solo tiene almacen:read.
  LOT_CREATED: [
    { permiso: 'calidad:read', ruta: (n) => `/panel/calidad/lotes/${n.sourceId}` },
    {
      permiso: 'almacen:read',
      ruta: (n) => (n.data?.nature === 'PM' ? `/panel/almacen/recepcion?lote=${n.sourceId}` : null),
    },
  ],
}
