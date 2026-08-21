import OpcionSiNo from './OpcionSiNo.jsx'
import FormInput from '../FormInput.jsx'

// Sección "CONTROL DE DOCUMENTOS" del papel P-ADM-03/R-02: dos renglones,
// Lista de Productores y Guía de Remisión, cada uno con una columna CUMPLE
// (✓ / ✗) y una de OBSERVACIONES.
//
// El papel marca CUMPLE con un tilde o una cruz — acá es el mismo control
// Sí/No de tres estados que ya usa la sección 2 de Calidad (ver
// OpcionSiNo.jsx), por la misma razón: un switch no puede representar "sin
// marcar todavía", y acá "sin marcar" es un estado real mientras el
// documento no se revisó.
//
// La observación solo se pide cuando NO cumple — el backend la exige
// (`producerListNotes`/`shippingGuideNotes` obligatorias si el verificado
// es `false`) y no tiene sentido pedir una nota de por qué algo sí cumple.
const DOCUMENTOS = [
  { clave: 'productores', etiqueta: 'Lista de productores' },
  { clave: 'guia', etiqueta: 'Guía de remisión' },
]

export default function ControlDocumentos({ valores, onCambiar, soloLectura = false }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/60">
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-verde-hoja/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-verde-bosque">
        <span>Descripción</span>
        <span>Cumple</span>
      </div>
      {DOCUMENTOS.map(({ clave, etiqueta }) => {
        const cumple = valores[clave]?.verificado ?? null
        const notas = valores[clave]?.notas ?? ''
        return (
          <div key={clave} className="flex flex-col gap-2 border-b border-verde-hoja/10 px-4 py-3 last:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-marron-cafe">{etiqueta}</span>
              <OpcionSiNo
                valor={cumple}
                onChange={(v) => onCambiar(clave, 'verificado', v)}
                disabled={soloLectura}
                etiquetaAccesible={`¿${etiqueta} cumple?`}
              />
            </div>
            {cumple === false && (
              <FormInput
                label="Observaciones (obligatorio si no cumple)"
                value={notas}
                disabled={soloLectura}
                onChange={(e) => onCambiar(clave, 'notas', e.target.value)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
