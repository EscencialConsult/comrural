// Códigos de form_items de I-CAL-29/R-01 que FormularioInspeccionMateriaPrima.jsx
// reconoce por `code` exacto para armar su maquetación fija (pregunta
// decisiva de rechazo, tabla de dos columnas). Ver el comentario extenso
// en ese componente. Si uno de estos ítems se da de baja desde
// Configuración, ese comportamiento se pierde en silencio (sin error
// visible) — por eso viven acá, separados del componente, para que
// PanelFormularios.jsx pueda advertir antes de guardar la baja sin tener
// que importar el formulario completo.
export const FORM_CODE_INSPECCION_MATERIA_PRIMA = 'I-CAL-29/R-01'

export const ITEM_ACEPTA_CONDICIONES = 'arrival_conditions_accepted'
export const ITEM_TOTAL_RECHAZADAS = 'total_rejected_bags'

export const COLUMNAS_RECHAZO = [
  {
    grupoOtros: 'rejection_other_contaminant',
    codigos: [
      'straw_bags',
      'mouse_droppings_bags',
      'bird_droppings_bags',
      'larvae_bags',
      'quartz_stone_bags',
      'hard_stone_bags',
      'volcanic_stone_bags',
      'foreign_material_bags',
    ],
  },
  {
    grupoOtros: 'rejection_other_grain',
    codigos: [
      'damaged_grains_bags',
      'broken_grains_bags',
      'immature_grains_bags',
      'colored_grains_bags',
      'coated_grains_bags',
      'contrasting_varieties_bags',
    ],
  },
]

export const CODIGOS_ITEM_CRITICOS_INSPECCION = new Set([
  ITEM_ACEPTA_CONDICIONES,
  ITEM_TOTAL_RECHAZADAS,
  ...COLUMNAS_RECHAZO.flatMap((c) => c.codigos),
])
