// Compartido entre ModalCrearControlProceso.jsx y ModalDetalleControlProceso.jsx
// (edición) — misma forma de `impurezas`/`tamanoGrano` en los dos, ver
// comrural_erp_backend/docs/control-proceso-a.md §3.

// Conteo de piezas encontradas en la muestra, NO gramos — el peso total va
// aparte en pesoImpurezaG (ERR-03).
export const CAMPOS_IMPUREZAS = [
  { key: 'paja', label: 'Paja' },
  { key: 'heces_raton', label: 'Heces de ratón' },
  { key: 'heces_ave', label: 'Heces de ave' },
  { key: 'larva', label: 'Larva' },
  { key: 'semilla', label: 'Semilla' },
  { key: 'piedra_volcanica', label: 'Piedra volcánica' },
  { key: 'piedra_dura', label: 'Piedra dura' },
  { key: 'piedra_cuarzo', label: 'Piedra cuarzo' },
  { key: 'otros', label: 'Otros' },
]

export const IMPUREZAS_VACIAS = Object.fromEntries([
  ...CAMPOS_IMPUREZAS.map((c) => [c.key, null]),
  ['otros_descripcion', null],
])

export const CAMPOS_TAMANO_GRANO = [
  { key: 'm12_pct', label: 'Malla 12 (%)' },
  { key: 'm14_pct', label: 'Malla 14 (%)' },
  { key: 'm16_pct', label: 'Malla 16 (%)' },
  { key: 'polvillo_pct', label: 'Polvillo (%)' },
]
export const TAMANO_GRANO_VACIO = { m12_pct: null, m14_pct: null, m16_pct: null, polvillo_pct: null }

export const sumaTamanoGrano = (tamanoGrano) =>
  CAMPOS_TAMANO_GRANO.reduce((acc, { key }) => acc + (Number(tamanoGrano[key]) || 0), 0)

export const tamanoGranoValido = (tamanoGrano) => {
  const suma = sumaTamanoGrano(tamanoGrano)
  return suma >= 99.5 && suma <= 100.5
}
