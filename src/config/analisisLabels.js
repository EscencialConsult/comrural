// Etiquetas en español de los enums de analysis_requests — un solo lugar,
// compartido por ModalSolicitarAnalisis.jsx (arma las opciones del select)
// y ModalDetalleMuestra.jsx (muestra el valor ya guardado). Antes cada uno
// tenía su propia lista a mano — evita que se desincronicen.
export const NATURALEZA_LABEL = {
  MATERIA_PRIMA: 'Materia Prima (MP)',
  PRODUCTO_PROCESO: 'Producto en Proceso',
  PRODUCTO_TERMINADO: 'Producto Terminado (PT)',
}

export const USO_LABEL = {
  EXPORTACION: 'Exportación',
  MERCADO_INTERNO: 'Mercado Interno',
}

export const EXECUTION_MODE_LABEL = {
  INTERNAL: 'Interno',
  EXTERNAL: 'Externo',
}

export const ESTADO_SOLICITUD_LABEL = {
  PENDIENTE_MUESTRA: 'PENDIENTE RECEPCIÓN EN LAB',
  RECIBIDA: 'RECIBIDA EN LAB',
  EN_PROCESO: 'EN ANÁLISIS',
  PENDIENTE_EXTERNOS: 'PENDIENTE EXTERNOS',
  ANALIZADA: 'ANALIZADA',
  RECHAZADA: 'RECHAZADA',
  CANCELADA: 'CANCELADA',
}

export const formatearEstadoSolicitud = (status) =>
  ESTADO_SOLICITUD_LABEL[status] ?? (status ? status.replace(/_/g, ' ') : '—')

export const TONO_ESTADO_LOTE = {
  PROGRAMADO: 'neutro',
  EN_RECEPCION: 'alerta',
  ACEPTADO_RECEPCION: 'positivo',
  EN_ANALISIS: 'alerta',
  LIBERADO: 'positivo',
  RECHAZADO: 'negativo',
  CUARENTENA: 'alerta',
  OBSERVADO: 'alerta',
}

export const formatearEstadoLote = (status) =>
  status ? status.replace(/_/g, ' ') : '—'


