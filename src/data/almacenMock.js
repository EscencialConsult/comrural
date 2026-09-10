// Datos de ejemplo compartidos entre pantallas mockup de Almacén — para que
// el conteo que se ve en "Almacén" (Inicio, sección Panorama del área) sea
// el MISMO número que se ve al entrar a "Almacén Intermedio", en vez de dos
// cifras inventadas por separado que podrían no coincidir.
export const LOTES_EN_PROCESO = [
  { lote: 'C-08716-MP', producto: 'Quinua blanca en grano', transferidoEl: '2026-09-08', diasEnBuffer: 2 },
  { lote: 'C-08512-MP', producto: 'Quinua blanca en grano', transferidoEl: '2026-09-09', diasEnBuffer: 1 },
  { lote: 'C-08611-MP', producto: 'Quinua roja en grano', transferidoEl: '2026-09-09', diasEnBuffer: 1 },
]

export const LOTES_EN_STOCK = [
  { lote: 'C-08816-MP', producto: 'Quinua blanca en grano', cantidadSacos: 145 },
  { lote: 'C-08902-MP', producto: 'Quinua roja en grano', cantidadSacos: 62 },
  { lote: 'C-08915-MP', producto: 'Cañahua', cantidadSacos: 38 },
]

// Panorama del área (P-14 de la narrativa) — solicitudes de Envases/General
// pendientes y productos próximos a vencer no tienen backend que los
// cuente todavía (los formularios de salida/PT son mockup sin persistir),
// así que son ejemplos ilustrativos, no un conteo real.
export const SOLICITUDES_PENDIENTES_EJEMPLO = 4
export const PRODUCTOS_POR_VENCER_EJEMPLO = 2
export const ENVASES_BLOQUEADOS_EJEMPLO = 1

// Consulta de existencias (P-06 de la narrativa) — "la salida se ordena
// por los cuatro grupos definidos en el libro: existencias de Materia
// Prima, Producto Terminado, Envases/Embalajes e Insumos de Proceso, y
// Otros Almacenes". Ejemplo ilustrativo, mismo criterio que el resto de
// los mocks de Almacén: no hay backend de existencias real todavía.
export const EXISTENCIAS_EJEMPLO = [
  { id: 1, grupo: 'Materia Prima', almacen: 'MP', item: 'Quinua blanca en grano', lote: 'C-08816-MP', unidad: 'kg', cantidadFisica: 6525, disponible: 6525, bloqueada: 0, ubicacion: 'Nave 1 — Rack A3', vencimiento: null },
  { id: 2, grupo: 'Materia Prima', almacen: 'MP', item: 'Quinua roja en grano', lote: 'C-08902-MP', unidad: 'kg', cantidadFisica: 2790, disponible: 0, bloqueada: 2790, ubicacion: 'Nave 1 — Rack A5', vencimiento: null },
  { id: 3, grupo: 'Envases/Embalajes e Insumos de Proceso', almacen: 'ML', item: 'Bolsas kraft marrón 25kg', lote: '120525-EEKM2-05', unidad: 'Piezas', cantidadFisica: 340, disponible: 340, bloqueada: 0, ubicacion: 'Nave 2 — Estante 4', vencimiento: null },
  { id: 4, grupo: 'Envases/Embalajes e Insumos de Proceso', almacen: 'INS', item: 'Cobertura de chocolate — barras', lote: '090926-INSC-02', unidad: 'kg', cantidadFisica: 180, disponible: 0, bloqueada: 180, ubicacion: 'Cámara fría', vencimiento: null },
  { id: 5, grupo: 'Producto Terminado', almacen: 'PTL', item: 'Barra de chocolate 30gr', lote: '3135173', unidad: 'Piezas', cantidadFisica: 1625, disponible: 1625, bloqueada: 0, ubicacion: 'Nave 3 — Pallet 12', vencimiento: '2027-04-26' },
  { id: 6, grupo: 'Producto Terminado', almacen: 'PTL', item: 'Miel 500gr', lote: '5835106', unidad: 'Piezas', cantidadFisica: 98, disponible: 98, bloqueada: 0, ubicacion: 'Nave 3 — Pallet 4', vencimiento: '2026-10-15' },
  { id: 7, grupo: 'Otros Almacenes', almacen: 'ESC', item: 'Resma de papel A4', lote: null, unidad: 'Piezas', cantidadFisica: 18, disponible: 18, bloqueada: 0, ubicacion: 'Oficina — Estante 1', vencimiento: null },
  { id: 8, grupo: 'Otros Almacenes', almacen: 'EPP', item: 'Bota de agua', lote: null, unidad: 'Pares', cantidadFisica: 24, disponible: 22, bloqueada: 2, ubicacion: 'Casillero EPP', vencimiento: null },
]

// Historial de EPP por persona (sección 10 del relevamiento: "Historial de
// EPPs por persona"; P-16 de la narrativa: "queda incorporado al historial
// individual del trabajador"). Ejemplo ilustrativo — la Entrega de
// Indumentaria y EPP es mockup y no persiste, así que no hay entregas
// reales de las que armar un historial todavía.
export const HISTORIAL_EPP_EJEMPLO = [
  { id: 1, persona: 'Ana Mamani', area: 'Área A-B', fecha: '2026-08-12', item: 'Bota de agua', talla: '38', cantidad: 1, tipoDotacion: 'Dotación', estado: 'Nuevo' },
  { id: 2, persona: 'Ana Mamani', area: 'Área A-B', fecha: '2026-08-12', item: 'Faja de seguridad', talla: 'M', cantidad: 1, tipoDotacion: 'Dotación', estado: 'Nuevo' },
  { id: 3, persona: 'Julio Condori', area: 'Almacén', fecha: '2026-07-30', item: 'Lentes de seguridad 3M', talla: '—', cantidad: 1, tipoDotacion: 'Nuevo ingreso', estado: 'Nuevo' },
  { id: 4, persona: 'Julio Condori', area: 'Almacén', fecha: '2026-09-05', item: 'Pijama plomo', talla: 'L', cantidad: 1, tipoDotacion: 'Cambio de indumentaria', estado: 'Usado' },
  { id: 5, persona: 'Marco Quispe', area: 'Producción', fecha: '2026-06-18', item: 'Zapato de trabajo con refuerzo', talla: '40', cantidad: 1, tipoDotacion: 'Dotación', estado: 'Nuevo' },
]

// Llegadas programadas de Envases — mismo concepto que la lista de lotes
// de Recepción (PanelAlmacenRecepcion.jsx), pero acá es 100% mockup: no
// hay un "lote" real para envases/insumos en el backend, así que no se
// puede reusar lotsService. Ejemplo ilustrativo para simular la lista de
// pendientes de recepción y el botón "Llegada sin aviso" (también mockup
// acá, a diferencia de MP donde sí crea un lote real).
export const LLEGADAS_PROGRAMADAS_ENVASES_EJEMPLO = [
  { id: 1, item: 'Bolsas kraft marrón 25kg', proveedor: 'Envases del Sur', numeroSolicitud: '2201', subalmacen: 'ML', fechaProgramada: '2026-09-11' },
  { id: 2, item: 'Big Bag de 1000kg', proveedor: 'Embalajes Andinos', numeroSolicitud: '2205', subalmacen: 'EXP', fechaProgramada: '2026-09-12' },
  { id: 3, item: 'Cobertura de chocolate — barras', proveedor: 'Insumos Altiplano', numeroSolicitud: '2210', subalmacen: 'INS', fechaProgramada: '2026-09-13' },
]

// Llegadas programadas de Producto Terminado — a diferencia de MP y
// Envases, acá no hay botón de "llegada sin aviso": Producción siempre
// avisa con anticipación cuándo entrega un lote (P-03 de la narrativa,
// "Producción inicia este proceso al entregar al almacén un lote
// terminado acompañado por su nota"), no hay caso de "llegó sin avisar".
// Ejemplo ilustrativo, mismo criterio que el resto de los mocks de
// Almacén — no hay backend de PT todavía.
export const LLEGADAS_PROGRAMADAS_PT_EJEMPLO = [
  { id: 1, producto: 'Barra de chocolate 30gr', loteProduccion: '3135190', fechaElaboracion: '2026-09-09', cantidadEstimada: 1800, fechaProgramada: '2026-09-11' },
  { id: 2, producto: 'Quinua blanca 400gr', loteProduccion: '1436460', fechaElaboracion: '2026-09-10', cantidadEstimada: 3200, fechaProgramada: '2026-09-12' },
]
