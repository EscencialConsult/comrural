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
