import { useState } from 'react'
import { MessageSquarePlus, X } from 'lucide-react'

// Observación plegada, como un botón chico hasta que se toca o ya tiene
// texto cargado — mismo patrón que ya usaba la sección de Condiciones de
// llegada del formulario de Inspección (ver TablaCriterios.jsx), extraído
// acá para que cualquier otra sección lo reuse tal cual en vez de duplicar
// el mismo bloque de estado+markup. Pedido explícito de Facundo: "no
// tenés que replicarlo... usar el mismo diseño".
//
// `obligatoria`: cuando es true, el campo arranca SIEMPRE desplegado (no
// hay nada que "abrir") y sin botón para quitarlo — es el caso de Control
// de Documentos, donde el backend exige la observación en cuanto la
// respuesta es "No".
export default function CampoObservacionPlegable({
  valor,
  onCambiar,
  soloLectura = false,
  etiquetaAccesible,
  obligatoria = false,
}) {
  const [abierta, setAbierta] = useState(false)
  const mostrar = abierta || valor !== '' || obligatoria

  if (!mostrar) {
    if (soloLectura) return null
    return (
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-marron-tierra/8 px-3 py-2 text-xs font-semibold text-marron-cafe/70 transition-colors duration-150 hover:bg-marron-tierra/18 hover:text-marron-cafe"
      >
        <MessageSquarePlus className="size-3.5" strokeWidth={2} />
        Observación
      </button>
    )
  }

  return (
    <div className="flex min-w-56 flex-1 items-center gap-1.5">
      <input
        type="text"
        value={valor}
        disabled={soloLectura}
        autoFocus={abierta && valor === ''}
        placeholder={obligatoria ? 'Observación (obligatoria)…' : 'Observación…'}
        onChange={(e) => onCambiar(e.target.value)}
        aria-label={`Observación de: ${etiquetaAccesible}`}
        className="w-full rounded-xl border border-marron-tierra/25 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/60"
      />
      {!soloLectura && !obligatoria && (
        <button
          type="button"
          aria-label="Quitar la observación"
          onClick={() => {
            onCambiar('')
            setAbierta(false)
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-marron-cafe/65 transition-colors duration-150 hover:bg-marron-tierra/10 hover:text-marron-cafe"
        >
          <X className="size-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
