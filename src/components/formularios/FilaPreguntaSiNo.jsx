import OpcionSiNo from './OpcionSiNo.jsx'
import CampoObservacionPlegable from './CampoObservacionPlegable.jsx'

// Renglón "pregunta → Sí/No → observación" — el formato predeterminado de
// cualquier lista de preguntas de sí/no en este proyecto (nació en
// Condiciones de llegada del formulario de Inspección, ver
// TablaCriterios.jsx). Pedido explícito de Facundo, viendo dos capturas
// lado a lado: "siempre que haya este formato de pregunta, respuesta,
// signo y observación, es un formato predeterminado" — Control de
// Documentos (P-ADM-03/R-02) tenía su PROPIA tabla con encabezado
// DESCRIPCIÓN/CUMPLE en vez de este mismo renglón, así que se ve distinto
// aunque la pregunta sea la misma clase de dato. Se extrae acá para que
// cualquier lista nueva de preguntas sí/no —en cualquier formulario— use
// este mismo renglón, no una tabla propia.
//
// `destacada` + `etiquetaDestacada` + `avisoSiVacia`: el resaltado de
// "pregunta obligatoria" que ya tenía Condiciones de llegada (fondo
// distinto, pastilla, aviso si queda sin responder) — opcional, ninguna
// pregunta de Control de Documentos lo usa hoy.
// `observacionObligatoria`: la observación queda SIEMPRE desplegada y sin
// botón para cerrarla — el caso de Control de Documentos, donde el
// backend exige la nota en cuanto la respuesta es "No".
// `onCambiarObservacion` es OPCIONAL: si no llega, el campo de observación
// ni se renderiza — caso de Condiciones de llegada (TablaCriterios.jsx,
// formulario de Inspección), que lo tuvo un tiempo sin que el backend
// tuviera dónde guardarlo (raw_material_inspections/form_responses no
// tienen ninguna columna de nota por ítem) y se sacó por eso, no por gusto.
export default function FilaPreguntaSiNo({
  numero,
  pregunta,
  valor,
  observacion,
  onCambiar,
  onCambiarObservacion,
  soloLectura = false,
  destacada = false,
  etiquetaDestacada = 'Obligatoria',
  avisoSiVacia,
  observacionObligatoria = false,
}) {
  const respondido = valor !== null && valor !== undefined

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl p-4 transition-colors duration-150 ${
        destacada ? 'bg-verde-pistacho/70 ring-1 ring-verde-hoja/40' : 'bg-white/80'
      }`}
    >
      <p className="min-w-56 flex-1 text-sm leading-relaxed text-marron-cafe">
        <span className="mr-2 font-bold text-verde-bosque/70">{numero}.</span>
        {pregunta}
      </p>

      <div className="flex shrink-0 items-center gap-2">
        {destacada && (
          <span className="rounded-full bg-verde-bosque px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-crema-quinua">
            {etiquetaDestacada}
          </span>
        )}
        <OpcionSiNo valor={valor} onChange={onCambiar} disabled={soloLectura} etiquetaAccesible={pregunta} />
      </div>

      {onCambiarObservacion && (
        <CampoObservacionPlegable
          valor={observacion}
          onCambiar={onCambiarObservacion}
          soloLectura={soloLectura}
          etiquetaAccesible={pregunta}
          obligatoria={observacionObligatoria}
        />
      )}

      {destacada && !respondido && avisoSiVacia && (
        <p className="w-full text-xs font-semibold text-marron-arcilla">{avisoSiVacia}</p>
      )}
    </li>
  )
}
