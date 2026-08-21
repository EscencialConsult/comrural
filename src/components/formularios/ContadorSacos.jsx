import { ChevronLeft, ChevronRight } from 'lucide-react'

// Contador de sacos: número tipeable con dos flechas al costado (izquierda
// resta, derecha suma).
//
// Viene de cómo se cuenta en planta: en el papel los sacos se marcan de a
// palitos y recién al final se totaliza. Nadie llega con el número entero en
// la cabeza — lo va acumulando de a uno mientras mira la pila. Un input
// numérico pelado obliga a borrar y reescribir en cada saco; las flechas
// dejan sumar sin sacar la vista del lote.
//
// Cada flecha lleva su propio color y fondo: restar en marrón arcilla,
// sumar en verde hoja. Antes eran las dos del mismo beige tenue y, sobre el
// fondo crema del formulario, no se leían como dos acciones opuestas —
// parecían adorno. Sumar y restar sacos es la operación central de esta
// sección, así que los botones tienen que decir de un vistazo cuál hace qué.
//
// El número sigue siendo el control principal y se puede tipear directo, que
// es lo que conviene cuando ya se sabe el total.
//
// `null` es "sin contar" y se distingue de `0` ("contado, dio cero"): restar
// desde null lleva a 0 y ahí frena — no existen sacos negativos.
export default function ContadorSacos({
  valor,
  onChange,
  min = 0,
  max,
  paso = 1,
  decimales = 0,
  sufijo,
  disabled = false,
  etiquetaAccesible,
}) {
  const actual = valor ?? null

  const mover = (delta) => {
    const base = actual ?? 0
    // Redondeo explícito: con `paso` decimal (los porcentajes del tamaño de
    // grano), sumar en punto flotante deja restos del tipo 2.44 + 1 =
    // 3.4400000000000004, que después el input muestra entero.
    const siguiente = Number((base + delta * paso).toFixed(decimales))
    if (siguiente < min) return
    if (max != null && siguiente > max) return
    onChange(siguiente)
  }

  const escribir = (texto) => {
    if (texto === '') return onChange(null)
    const n = Number(texto)
    if (Number.isNaN(n)) return
    onChange(n)
  }

  return (
    <div className="flex items-center gap-0.5">
      <FlechaContador
        Icon={ChevronLeft}
        tono="restar"
        etiqueta={`Restar uno a ${etiquetaAccesible}`}
        disabled={disabled || (actual ?? 0) <= min}
        onClick={() => mover(-1)}
      />
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={paso}
          min={min}
          max={max}
          value={actual ?? ''}
          disabled={disabled}
          onChange={(e) => escribir(e.target.value)}
          aria-label={etiquetaAccesible}
          placeholder="—"
          className={`w-20 rounded-xl border border-marron-tierra/25 bg-white py-1.5 text-center text-sm tabular-nums text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/70 ${sufijo ? 'pl-2 pr-5' : 'px-2'}`}
        />
        {sufijo && (
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-medium text-marron-cafe/60">
            {sufijo}
          </span>
        )}
      </div>
      <FlechaContador
        Icon={ChevronRight}
        tono="sumar"
        etiqueta={`Sumar uno a ${etiquetaAccesible}`}
        disabled={disabled || (max != null && (actual ?? 0) >= max)}
        onClick={() => mover(1)}
      />
    </div>
  )
}

const TONOS_FLECHA = {
  restar: 'bg-marron-arcilla/12 text-marron-arcilla hover:bg-marron-arcilla/25',
  sumar: 'bg-verde-hoja/15 text-verde-bosque hover:bg-verde-hoja/30',
}

function FlechaContador({ Icon, tono, etiqueta, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:pointer-events-none disabled:opacity-25 ${TONOS_FLECHA[tono]}`}
    >
      <Icon className="size-4" strokeWidth={2.75} />
    </button>
  )
}
