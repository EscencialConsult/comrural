import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import ContadorSacos from './ContadorSacos.jsx'

// Sección 3 del papel: EVALUACIÓN DE INSPECCIÓN (RECHAZO).
//
// En la hoja esto es UNA sola tabla de hallazgos, impresa en dos columnas
// (DESCRIPCION | CANT. SACOS | DESCRIPCION | CANT. SACOS) porque no entraba
// a lo largo: la lista arranca en "Paja" arriba a la izquierda, baja nueve
// renglones y SIGUE en "Granos dañados" arriba a la derecha. Una versión
// anterior de este componente le puso título propio a cada mitad
// ("Contaminantes" / "Defectos del grano") y las presentó como dos tablas
// distintas — eso era invención: en el papel no hay ningún encabezado ahí,
// es la misma tabla que continúa.
//
// Por eso ahora las dos columnas comparten el mismo encabezado repetido y no
// llevan título: se leen como una lista partida, que es lo que son. El corte
// de a 9 renglones es el del papel (8 hallazgos + el renglón "Otros" de esa
// columna).
//
// Cada columna termina con su "Otros", que en la hoja es una línea punteada
// donde el analista escribe qué encontró que no está en la lista fija
// ("Menudos") y al lado cuántos sacos. Están modelados como dos grupos
// repetibles abiertos (`rejection_other_contaminant` y `rejection_other_grain`,
// ambos con `occurrences = null`), así que las filas que se agregan con el
// "+" se guardan como cualquier otra respuesta, cada una en su `occurrence`.
export default function TablaRechazo({
  columnas,
  itemTotal,
  notaAlPie,
  valorDe,
  onCambiar,
  ocurrenciasDe,
  soloLectura = false,
}) {
  // Filas agregadas a mano en esta sesión, por groupCode. Es un piso, no la
  // cantidad real: la cantidad visible sale de combinar esto con las
  // ocurrencias que ya vinieron guardadas del servidor.
  const [filasAgregadas, setFilasAgregadas] = useState({})

  const total = itemTotal ? valorDe(itemTotal, 1) : null

  const filasDeGrupo = (grupo) => {
    if (!grupo) return 0
    const guardadas = [...ocurrenciasDe(grupo.descripcion), ...ocurrenciasDe(grupo.cantidad)]
    return Math.max(0, ...guardadas, filasAgregadas[grupo.groupCode] ?? 0)
  }

  // El total lo escribe el analista, no lo impone la pantalla: es su número,
  // el que firma. Puede no coincidir con la suma aritmética de los renglones
  // —un mismo saco puede caer en más de un defecto y contarse una sola vez—
  // así que forzarlo al resultado de la suma sería corregirle el criterio.
  //
  // La suma sí se calcula, pero solo como referencia al lado del campo, y
  // únicamente cuando difiere: es la forma barata de que se note un dedazo
  // sin discutirle el número. Importa porque el backend lo valida contra lo
  // que recibió Almacén y rechaza la inspección si se pasa.
  const sumaRenglones = useMemo(() => {
    let suma = 0
    for (const col of columnas) {
      for (const item of col.items) suma += valorDe(item, 1) ?? 0
      if (col.grupo) {
        for (const occ of ocurrenciasDe(col.grupo.cantidad)) suma += valorDe(col.grupo.cantidad, occ) ?? 0
      }
    }
    return suma
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnas, valorDe, ocurrenciasDe])

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-x-6 gap-y-4 overflow-hidden rounded-2xl bg-white/70 p-4 lg:grid-cols-2">
        {columnas.map((col, i) => (
          <div key={i} className="flex flex-col">
            <div className="flex items-center justify-between border-b-2 border-verde-hoja/35 pb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-verde-bosque">Descripción</span>
              <span className="text-xs font-bold uppercase tracking-wide text-verde-bosque">Cant. sacos</span>
            </div>

            <ul className="flex flex-col">
              {col.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-marron-tierra/15 py-2"
                >
                  <span className="flex-1 text-sm font-medium text-marron-cafe">{item.label}</span>
                  <ContadorSacos
                    valor={valorDe(item, 1)}
                    onChange={(v) => onCambiar(item, 1, v)}
                    min={item.config?.min ?? 0}
                    max={item.config?.max}
                    disabled={soloLectura}
                    etiquetaAccesible={item.label}
                  />
                </li>
              ))}

              {col.grupo && (
                <FilaOtros
                  grupo={col.grupo}
                  filas={filasDeGrupo(col.grupo)}
                  valorDe={valorDe}
                  onCambiar={onCambiar}
                  soloLectura={soloLectura}
                  onAgregar={(filas) =>
                    setFilasAgregadas((prev) => ({ ...prev, [col.grupo.groupCode]: filas + 1 }))
                  }
                  onQuitar={(filas) =>
                    setFilasAgregadas((prev) => ({ ...prev, [col.grupo.groupCode]: Math.max(0, filas - 1) }))
                  }
                />
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* La aclaración del asterisco de "Materias extrañas" va al pie de toda
          la tabla, como en el papel — es un recordatorio de qué cuenta como
          materia extraña, no una nota de una de las dos columnas. */}
      {notaAlPie && <p className="px-1 text-xs italic text-marron-cafe/70">{notaAlPie}</p>}

      {itemTotal && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-verde-bosque px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="total-bolsas-rechazadas"
              className="text-sm font-bold uppercase tracking-wide text-crema-quinua"
            >
              {itemTotal.label}
            </label>
            {total !== sumaRenglones && sumaRenglones > 0 && (
              <span className="text-xs text-crema-quinua/70">Los renglones suman {sumaRenglones}</span>
            )}
          </div>
          <input
            id="total-bolsas-rechazadas"
            type="number"
            inputMode="numeric"
            min={0}
            value={total ?? ''}
            disabled={soloLectura}
            placeholder="—"
            onChange={(e) => onCambiar(itemTotal, 1, e.target.value === '' ? null : Number(e.target.value))}
            className="w-28 rounded-xl border-2 border-transparent bg-crema-quinua px-4 py-2 text-right text-lg font-extrabold tabular-nums text-verde-bosque outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:opacity-70"
          />
        </div>
      )}
    </div>
  )
}

// El renglón "Otros" de una columna: una o más filas de descripción libre +
// cantidad, más el "+" para sumar otra.
function FilaOtros({ grupo, filas, valorDe, onCambiar, soloLectura, onAgregar, onQuitar }) {
  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-marron-cafe">{grupo.descripcion.label}</span>
        {!soloLectura && (
          <button
            type="button"
            title={`Agregar ${grupo.descripcion.label.toLowerCase()}`}
            aria-label={`Agregar ${grupo.descripcion.label.toLowerCase()}`}
            onClick={() => onAgregar(filas)}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-verde-hoja/20 text-verde-bosque transition-colors duration-150 hover:bg-verde-hoja/40"
          >
            <Plus className="size-4" strokeWidth={2.75} />
          </button>
        )}
      </div>

      {filas === 0
        ? !soloLectura && (
            <p className="text-xs text-marron-cafe/65">Si apareció algo que no está en la lista, agregalo con el +.</p>
          )
        : Array.from({ length: filas }, (_, i) => i + 1).map((occurrence) => (
            <div key={occurrence} className="flex items-center gap-1.5">
              <input
                type="text"
                value={valorDe(grupo.descripcion, occurrence) ?? ''}
                disabled={soloLectura}
                placeholder="¿Qué se encontró?"
                onChange={(e) => onCambiar(grupo.descripcion, occurrence, e.target.value)}
                aria-label={`${grupo.descripcion.label} ${occurrence}`}
                className="min-w-0 flex-1 rounded-xl border border-verde-hoja/30 bg-verde-pistacho/20 px-3 py-1.5 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5"
              />
              <ContadorSacos
                valor={valorDe(grupo.cantidad, occurrence)}
                onChange={(v) => onCambiar(grupo.cantidad, occurrence, v)}
                disabled={soloLectura}
                etiquetaAccesible={`${grupo.cantidad.label} ${occurrence}`}
              />
              {!soloLectura && (
                <button
                  type="button"
                  aria-label={`Quitar la fila ${occurrence}`}
                  onClick={() => {
                    // Vaciar las dos respuestas es lo que de verdad la borra:
                    // la fila se muestra porque tiene valores guardados, así
                    // que bajar el contador sin limpiarlas la haría reaparecer
                    // en la próxima carga.
                    onCambiar(grupo.descripcion, occurrence, null)
                    onCambiar(grupo.cantidad, occurrence, null)
                    onQuitar(filas)
                  }}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-marron-cafe/50 transition-colors duration-150 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla"
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}
    </li>
  )
}
