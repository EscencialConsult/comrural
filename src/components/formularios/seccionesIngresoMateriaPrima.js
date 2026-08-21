import { Signature } from 'lucide-react'

// Única fuente de verdad de las etapas reales de P-ADM-03/R-02 — la leen
// tanto FormularioIngresoMateriaPrima.jsx (los `numero` de cada
// SeccionFormulario) como PanelAlmacenRecepcion.jsx (las casillas de la
// columna Estado). Antes cada archivo tenía su propia lista a mano y se
// desincronizaron: la tabla mostraba 6 etapas cuando el papel real solo
// tiene 4 secciones + firmas — pedido explícito de Facundo, guiándose por
// los encabezados en VERDE INTENSO del papel (no cualquier fila con tinte
// verde): "los componentes... deben tener un nombre o identificador para
// que en el listado no me aparezcan [seis] etapas si mi formula no tiene
// [seis] etapas".
//
// Ojo con el 4: "Datos del producto" en el papel incluye, en el MISMO
// encabezado verde, tipo de envase/N. de bolsas, resumen de recepción
// (total de bolsas, peso promedio neto), detalle de rechazos (N. de
// sacos, descripción) Y unidades de medida (peso bruto/neto) — no son
// secciones 5 y 6 separadas, son todas parte de la sección 4.
export const SECCIONES_INGRESO_MATERIA_PRIMA = [
  { numero: 1, titulo: 'Control de documentos' },
  { numero: 2, titulo: 'Datos de recepción' },
  { numero: 3, titulo: 'Datos del transporte' },
  { numero: 4, titulo: 'Datos del producto' },
  { numero: 5, titulo: 'Firmas / Responsables', icono: Signature, variante: 'firma' },
]
