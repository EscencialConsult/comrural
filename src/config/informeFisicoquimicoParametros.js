// Parámetros fijos del informe P-LAB-10/R-04 ("Informe de Análisis de
// Materia Prima"), sección 2 "Resumen de resultados" — Químico, Físico,
// Impurezas cuantificadas y Sensorial. No vienen del backend: son la
// referencia técnica impresa del documento oficial (método/permitido/
// referencia), igual para cualquier análisis fisicoquímico de esta materia
// prima. Centralizado acá para que InformeAnalisisFisicoquimico.jsx no
// mezcle datos fijos del papel con el estado de React — mismo criterio que
// analisisLabels.js/analisisCategorias.js.
export const PARAMETROS_QUIMICO = [
  { id: 'q-humedad', parametro: 'Humedad', metodo: 'I-LAB-03', unidad: '%', permitido: 'máx 8.5', referencia: 'CAL 56/25' },
  { id: 'q-dureza', parametro: 'Dureza', metodo: 'LAB 54/25', unidad: '%', permitido: '61 - 80', referencia: '-' },
]

export const PARAMETROS_FISICO = [
  { id: 'f-0', parametro: 'Grano grande entre 2 a 1.7mm', metodo: 'I-LAB-02', unidad: '%', permitido: '68 ± 8', referencia: 'CAL 56/25' },
  { id: 'f-1', parametro: 'Grano mediano entre 1.7 a 1.4mm', metodo: 'I-LAB-02', unidad: '%', permitido: '30 ± 7', referencia: 'CAL 56/25' },
  { id: 'f-2', parametro: 'Grano pequeño menor a 1.4mm', metodo: 'I-LAB-02', unidad: '%', permitido: '2 ± 1', referencia: 'CAL 56/25' },
  { id: 'f-3', parametro: 'Granos dañados', metodo: 'I-LAB-02', unidad: '%', permitido: 'máx 2.5', referencia: 'CAL 56/25' },
  { id: 'f-4', parametro: 'Granos quebrados', metodo: 'I-LAB-02', unidad: '%', permitido: 'máx 1.5', referencia: 'CAL 56/25' },
  { id: 'f-5', parametro: 'Granos inmaduros', metodo: 'I-LAB-02', unidad: '%', permitido: 'máx 0.7', referencia: 'CAL 56/25' },
  { id: 'f-6', parametro: 'Granos color', metodo: 'I-LAB-02', unidad: '%', permitido: 'máx 1.0', referencia: 'CAL 56/25' },
  { id: 'f-7', parametro: 'Granos recubiertos', metodo: 'I-LAB-02', unidad: '%', permitido: 'máx 0.35', referencia: 'CAL 56/25' },
  { id: 'f-8', parametro: 'Variedades contrastantes', metodo: 'I-LAB-02', unidad: '%', permitido: 'máx 1.0', referencia: 'CAL 56/25' },
  { id: 'f-9', parametro: 'Pureza en base a: 1000g', metodo: 'I-LAB-01', unidad: '%', permitido: '99.80 ± 0.1', referencia: 'CAL 56/25' },
  {
    id: 'f-10',
    parametro: 'Materias extrañas (vidrio, metal, madera, semillas alergénicas)',
    metodo: 'I-LAB-01',
    unidad: '%',
    permitido: 'Ausencia',
    referencia: 'CAL 56/25',
  },
]

export const IMPUREZAS_CUANTIFICADAS = [
  { id: 'imp-pajas', label: 'Pajas (u)' },
  { id: 'imp-have', label: 'H. ave (u)' },
  { id: 'imp-hraton', label: 'H. ratón (u)' },
  { id: 'imp-insectos', label: 'Insectos (larvas secas) (u)' },
  { id: 'imp-cuarzo', label: 'Piedras cuarzo (u)' },
  { id: 'imp-duras', label: 'Piedras duras (u)' },
  { id: 'imp-volcanica', label: 'Piedrecillas o tierra volcánica (u)' },
  { id: 'imp-silvestres', label: 'Semillas silvestres (u)' },
  { id: 'imp-otros', label: 'Otros (hilo de yute) (u)' },
]

const OPCIONES_SENSORIAL = ['Característico', 'Homogéneo']

export const PARAMETROS_SENSORIAL = [
  { id: 's-color', parametro: 'Color', metodo: 'I-LAB-032', permitido: 'Característico', referencia: 'NB/NA 0038', opciones: OPCIONES_SENSORIAL },
  { id: 's-olor', parametro: 'Olor', metodo: 'I-LAB-032', permitido: 'Característico', referencia: 'NB/NA 0038', opciones: OPCIONES_SENSORIAL },
  { id: 's-aspecto', parametro: 'Aspecto', metodo: 'I-LAB-032', permitido: 'Homogéneo', referencia: 'NB/NA 0038', opciones: OPCIONES_SENSORIAL },
]
