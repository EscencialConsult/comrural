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

// Categorías tratadas como "análisis externo" — pedido explícito: por ahora
// es pura convención de frontend, sin tocar el backend (el modelo real ya
// tiene `laboratory_tests.execution_mode` INTERNAL/EXTERNAL por ensayo, ver
// docs/laboratory.md, pero ese dato todavía no está confiable/expuesto para
// esto). El día que se use ese campo real, esto debería reemplazarse por
// `item.executionMode === 'EXTERNAL'` en vez de una categoría fija.
export const CATEGORIAS_EXTERNAS = new Set(['TOXICOLOGICAL'])

// Estado de cada tarjeta de categoría en FormularioIniciarAnalisis.jsx —
// deriva del `status` real del informe (laboratory_reports.status): sin
// informe todavía es SIN_INICIAR, BORRADOR es GUARDADO, cualquier otro
// estado (enviado a validación o validado) es FINALIZADO.
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
