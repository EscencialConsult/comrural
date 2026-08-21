import { CircleAlert } from 'lucide-react'

// Observaciones generales del pie del formulario.
//
// Enchufa a `inspection.notes`, que el backend YA acepta en
// POST /inspections/:id/complete — pero que el frontend mandaba siempre
// vacío y hardcodeado (`completar(inspection.id, {})` en
// PanelRecepcionLote.jsx). El canal estaba tendido, nadie lo había enchufado.
//
// Cuando queda en blanco lo dice en voz alta: un recuadro vacío y callado no
// distingue "no había nada que observar" de "me olvidé de escribirlo". Es la
// misma razón por la que en el papel se tacha el renglón sobrante. No
// bloquea nada — la observación sigue siendo opcional.
export default function CampoObservaciones({ valor, onCambiar, soloLectura = false }) {
  const vacio = valor.trim() === ''

  return (
    <div className="flex flex-col gap-2">
      <textarea
        id="observaciones-inspeccion"
        rows={4}
        value={valor}
        disabled={soloLectura}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Comentarios generales sobre el lote inspeccionado…"
        className="w-full resize-y rounded-2xl border border-marron-tierra/25 bg-white px-4 py-3 text-sm leading-relaxed text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/60"
      />
      {vacio && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-marron-arcilla">
          <CircleAlert className="size-3.5 shrink-0" strokeWidth={2.5} />
          Sin observaciones registradas — el campo va a quedar en blanco en el registro.
        </p>
      )}
    </div>
  )
}
