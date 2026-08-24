import { Beaker, Bug, Skull, Eye, FlaskConical } from 'lucide-react'

// Config visual de las categorías de laboratory_tests.category — un solo
// lugar, compartido por ModalSolicitarAnalisis.jsx (arma el catálogo al
// solicitar) y FormularioIniciarAnalisis.jsx (agrupa los ensayos ya
// solicitados al iniciar el análisis). Antes cada pantalla tenía su propia
// copia de estas 4 constantes — se centralizan acá para que no se
// desincronicen entre las dos, mismo criterio que analisisLabels.js.
export const CATEGORIA_LABEL = {
  PHYSICOCHEMICAL: 'Fisicoquímico',
  MICROBIOLOGICAL: 'Microbiológico',
  TOXICOLOGICAL: 'Toxicológico',
  SENSORY: 'Sensorial',
  OTHER: 'Otros',
}

export const CATEGORIA_ICON = {
  PHYSICOCHEMICAL: Beaker,
  MICROBIOLOGICAL: Bug,
  TOXICOLOGICAL: Skull,
  SENSORY: Eye,
  OTHER: FlaskConical,
}

// Un color propio por categoría — clases completas y literales (no armadas
// con template strings) porque Tailwind necesita verlas tal cual en el
// código fuente para no purgarlas.
export const CATEGORIA_ESTILO = {
  PHYSICOCHEMICAL: { borde: 'border-azul-andino/40', icono: 'bg-azul-andino/15 text-azul-andino', contador: 'text-azul-andino' },
  MICROBIOLOGICAL: { borde: 'border-verde-bosque/40', icono: 'bg-verde-bosque/15 text-verde-bosque', contador: 'text-verde-bosque' },
  TOXICOLOGICAL: { borde: 'border-rojo-pasankalla/40', icono: 'bg-rojo-pasankalla/15 text-rojo-pasankalla', contador: 'text-rojo-pasankalla' },
  SENSORY: { borde: 'border-marron-arcilla/40', icono: 'bg-marron-arcilla/15 text-marron-arcilla', contador: 'text-marron-arcilla' },
  OTHER: { borde: 'border-marron-cafe/25', icono: 'bg-marron-cafe/10 text-marron-cafe/70', contador: 'text-marron-cafe/70' },
}

export const ORDEN_CATEGORIAS = ['PHYSICOCHEMICAL', 'MICROBIOLOGICAL', 'TOXICOLOGICAL', 'SENSORY', 'OTHER']

// Campos del formulario de resultados por categoría — usado por
// FormularioResultadosCategoria.jsx (Laboratorio) — formulario genérico
// para las categorías que todavía no tienen un documento oficial propio.
// MOCK: el backend todavía no define qué se registra por ensayo (fuera de
// alcance del módulo laboratory actual, ver docs/laboratory.md §1) — esta
// forma de campos es una suposición razonable por tipo de categoría, sin
// confirmar con Calidad/Laboratorio. Reemplazar en cuanto el backend
// publique el contrato real de resultados.
export const CATEGORIA_CAMPOS = {
  PHYSICOCHEMICAL: [
    { key: 'valor', label: 'Valor obtenido', type: 'number' },
    { key: 'unidad', label: 'Unidad', type: 'text', placeholder: 'ej. %, mg/kg' },
  ],
  MICROBIOLOGICAL: [
    { key: 'recuento', label: 'Recuento', type: 'number' },
    { key: 'unidad', label: 'Unidad', type: 'text', placeholder: 'ej. UFC/g' },
    {
      key: 'cumple',
      label: 'Cumple criterio',
      type: 'select',
      options: [
        { value: 'SI', label: 'Cumple' },
        { value: 'NO', label: 'No cumple' },
      ],
    },
  ],
  TOXICOLOGICAL: [
    {
      key: 'resultado',
      label: 'Resultado',
      type: 'select',
      options: [
        { value: 'NO_DETECTADO', label: 'No detectado' },
        { value: 'DETECTADO', label: 'Detectado' },
      ],
    },
    { key: 'concentracion', label: 'Concentración (si detectado)', type: 'number' },
  ],
  SENSORY: [
    {
      key: 'calificacion',
      label: 'Calificación',
      type: 'select',
      options: [
        { value: 'ACEPTABLE', label: 'Aceptable' },
        { value: 'NO_ACEPTABLE', label: 'No aceptable' },
      ],
    },
    { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
  ],
  OTHER: [{ key: 'resultado', label: 'Resultado', type: 'text' }],
}

// Estado local (mock, no backend) de cada tarjeta de categoría en
// FormularioIniciarAnalisis.jsx — se persiste solo en localStorage
// (ver useAnalisisDraft.js) para poder "reanudar después" sin servidor.
export const ESTADO_CATEGORIA_LABEL = {
  SIN_INICIAR: 'Sin iniciar',
  GUARDADO: 'Guardado',
  FINALIZADO: 'Finalizado',
}

export const ESTADO_CATEGORIA_TONO = {
  SIN_INICIAR: 'neutro',
  GUARDADO: 'alerta',
  FINALIZADO: 'positivo',
}
