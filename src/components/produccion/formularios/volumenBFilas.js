// Estado de las filas de Volumen B (Área B, P-PRO-01/R-25), usado por
// ModalRegistrarSalidaAreaB.jsx — el formulario completo de "Volumen B" vive
// ahí, no en una pestaña propia (ver el comentario de cabecera de ese
// archivo y de SeccionAreaB.jsx).

// Grupo "Detalle del proceso" — subproductos generados en el turno, cada
// uno con su propio par sacos/kg (peso variable). RP-15: el formulario los
// llama "Merma" en el resumen pero NO son desecho, son subproductos con
// destino comercial (mercado local / alimento balanceado) — el sistema
// tiene que tratarlos como tales, no como pérdida.
//
// La columna "x Kg" del papel se reemplaza acá por "Quinua Tercera": el
// análisis funcional (relevamiento 3) confirma que la quinua tercera es un
// subproducto real de Área B, con su propio indicador (RP-25, < 1,70%), y
// que el R-25 todavía no le tenía una columna explícita — "x" era el hueco
// que ocupaba. Pendiente de confirmar con el cliente que el mapeo es
// exactamente ese y no otra cosa.
export const GRUPOS_DETALLE = [
  { key: 'q2da', label: 'Q. 2da (a)' },
  { key: 'pNegros', label: 'P. Negros (b)' },
  { key: 'rechazo', label: 'Rechazo (c)' },
  { key: 'polvillo', label: 'Polvillo (d)' },
  { key: 'saldoQf', label: 'Saldo Q.F.' },
  { key: 'tercera', label: 'Quinua Tercera' },
  // recoverable_kg de production_area_b_entries (ver
  // comrural_erp_backend/docs/production-area-b.md §2) no tenía columna en
  // el papel — se agrega acá para que el formulario pueda mandar ese campo
  // obligatorio del backend real.
  { key: 'recuperable', label: 'Recuperable' },
]

let siguienteId = 1
export const filaVacia = (loteMp = '') => ({
  id: siguienteId++,
  fecha: '',
  turnoId: '',
  loteMp,
  tipo: '',
  usadosSacos: '',
  usadosKg: '',
  envasadosSacos: '',
  envasadosKg: '',
  encargado: '',
  control: '',
  observaciones: '',
  ...Object.fromEntries(GRUPOS_DETALLE.flatMap(({ key }) => [[`${key}Sacos`, ''], [`${key}Kg`, '']])),
})

export const sumar = (filas, campo) => filas.reduce((acc, f) => acc + (Number(f[campo]) || 0), 0)
export const numero = (v) => (v === '' || v == null ? '' : Number(v))
