import { Check, ChevronRight, Pencil } from 'lucide-react'
import Button from '../Button.jsx'

// Shell genérico de "una etapa a la vez" — pedido explícito tras revisión:
// "quería que al finalizar una etapa se muestre la otra con los datos, que
// no era necesario que se vean todas juntas... esto ayudaba a que no se
// haga la etapa 4/5 y no la 1/2/3". Reemplaza el criterio usado el resto de
// esta sesión ("todas las secciones siempre visibles, como el papel
// completo") — el papel completo lo sigue viendo el PDF (ver
// `modoImpresion`), no la pantalla mientras se completa.
//
// No es específico de Inspección/Ingreso — cualquier formulario nuevo con
// secciones numeradas lo reusa: recibe un array de etapas ya armadas por el
// formulario que lo llama (cada `contenido` es el `<SeccionFormulario>` de
// siempre, con su mismo diseño — pastilla verde, tinte
// `bg-verde-pistacho/25`, nada de eso cambia).
//
// Reglas:
//   - Etapas ANTERIORES al paso actual: colapsadas, resumen chico + "Editar"
//     (vuelve a esa etapa sin perder lo cargado en las siguientes — el
//     estado de los campos vive en el formulario, esto solo decide qué
//     mostrar).
//   - Etapa ACTUAL: expandida, con su contenido real + botón "Siguiente"
//     (deshabilitado si `!completa`, con `title` explicando qué falta).
//   - Etapas POSTERIORES: no se renderizan — no solo se ven grises, no
//     existen en el DOM todavía. Es la forma real de impedir "saltar" a la
//     etapa 4 sin pasar por la 1/2/3.
//   - `modoImpresion`: todas las etapas se renderizan expandidas, sin
//     controles de navegación — lo usa `generarPdf()` para capturar el
//     documento completo, no solo el paso visible en pantalla.
export default function AsistenteDeEtapas({ etapas, pasoActual, onAvanzar, onVolverA, modoImpresion = false }) {
  return (
    <div className="flex flex-col gap-6">
      {etapas.map((etapa, i) => {
        if (modoImpresion) return <div key={etapa.id}>{etapa.contenido}</div>

        if (i < pasoActual) {
          return <EtapaColapsada key={etapa.id} etapa={etapa} onEditar={() => onVolverA(i)} />
        }

        if (i > pasoActual) return null

        const esUltima = i === etapas.length - 1
        return (
          <div key={etapa.id} className="flex flex-col gap-3">
            {etapa.contenido}
            {!esUltima && (
              <div className="flex justify-end">
                <Button
                  disabled={!etapa.completa}
                  title={!etapa.completa ? etapa.motivoIncompleta : undefined}
                  className="gap-1.5 px-4 py-2 text-sm"
                  onClick={onAvanzar}
                >
                  Siguiente
                  <ChevronRight className="size-4 shrink-0" strokeWidth={2.25} />
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EtapaColapsada({ etapa, onEditar }) {
  return (
    <button
      type="button"
      onClick={onEditar}
      className="flex items-center gap-3 rounded-3xl bg-verde-pistacho/15 px-6 py-3.5 text-left transition-colors duration-150 hover:bg-verde-pistacho/25"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-crema-quinua">
        <Check className="size-4" strokeWidth={2.5} />
      </span>
      <span className="flex-1 text-sm font-bold uppercase tracking-wide text-marron-cafe">{etapa.titulo}</span>
      <span className="flex items-center gap-1 text-xs font-semibold text-marron-cafe/50">
        <Pencil className="size-3.5 shrink-0" strokeWidth={2} />
        Editar
      </span>
    </button>
  )
}
