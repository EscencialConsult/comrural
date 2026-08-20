// Pedido de alta de un dato maestro que no está cargado (un proveedor o un
// producto que Calidad necesita para completar una inspección).
//
// Vive DENTRO de la maqueta y no en src/services/notificacionesService.js a
// propósito: la maqueta es un proyecto aparte que todavía no está integrado
// al frontend, así que no modifica ningún servicio compartido. Cuando se
// integre, esta función se reemplaza por la llamada real y ni AvisoFaltante
// ni la pantalla cambian — la interfaz que consumen es esta misma.
//
// ⚠️ STUB: hoy no le llega a nadie. Faltan dos definiciones del lado del
// negocio antes de que pueda ser real: QUIÉN carga cada maestro (todavía sin
// decidir) y por dónde se le avisa. Devuelve una promesa para que el modal
// pueda mostrar su estado "enviando" tal como lo hará contra el endpoint.
const RETARDO_SIMULADO_MS = 300

export async function solicitarAltaDeMaestro({ tipo, detalle, solicitante = 'Calidad' }) {
  await new Promise((resolver) => setTimeout(resolver, RETARDO_SIMULADO_MS))

  const pedido = {
    id: `alta_${Date.now()}`,
    tipo,
    detalle: detalle || null,
    solicitante,
    fecha: new Date().toISOString(),
  }

  // Deja rastro en consola para poder verificar el flujo mientras no exista
  // el endpoint — es lo único que este stub puede hacer honestamente.
  console.info('[maqueta] Pedido de alta de dato maestro:', pedido)
  return pedido
}
