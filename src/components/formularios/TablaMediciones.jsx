import ContadorSacos from './ContadorSacos.jsx'

// Sección 4 del papel: TAMAÑO DE GRANO. Cada categoría se mide 3 veces y se
// anota el porcentaje retenido en cada medición.
//
// Las 3 mediciones NO son 3 columnas distintas en la base: son 3
// `occurrence` del MISMO form_item (ver 0021_grain_size_as_percentage_
// measurements.sql, que puso `occurrences = 3` justamente para no tener que
// inventar item_1/item_2/item_3). Por eso la grilla se arma acá recorriendo
// las ocurrencias, y la clave de cada respuesta es el par (itemId,
// occurrence).
//
// Mismo control que la sección 3 (`ContadorSacos`) por pedido explícito, con
// dos diferencias que vienen del dato: acá son porcentajes, así que las
// flechas mueven de a 1 punto pero el campo acepta decimales (2,44 %), y el
// tope es 100. Se sigue pudiendo tipear el número directo, que es lo normal
// cuando se lee de la balanza.
//
// A diferencia de la sección 2, acá SÍ conviene una tabla: las celdas son
// tres números comparables entre sí (la misma categoría medida tres veces) y
// el valor de leerlas en columna es justamente poder compararlas de un
// vistazo.
export default function TablaMediciones({ items, valorDe, onCambiar, soloLectura = false }) {
  const mediciones = Math.max(1, ...items.map((i) => i.occurrences ?? 1))
  const columnas = Array.from({ length: mediciones }, (_, i) => i + 1)

  return (
    <div className="overflow-x-auto rounded-2xl bg-white/70">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-verde-hoja/35 text-xs font-bold uppercase tracking-wide text-verde-bosque">
            <th className="px-4 py-3">Característica</th>
            {columnas.map((n) => (
              <th key={n} className="px-4 py-3 text-center">
                {n}.ª medición
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-marron-tierra/20 last:border-b-0">
              <td className="px-4 py-2 font-medium text-marron-cafe">
                {item.label}
                {item.isRequired && <span className="ml-1 text-verde-bosque">*</span>}
              </td>
              {columnas.map((occurrence) => (
                <td key={occurrence} className="px-4 py-2">
                  <div className="flex justify-center">
                    <ContadorSacos
                      valor={valorDe(item, occurrence)}
                      onChange={(v) => onCambiar(item, occurrence, v)}
                      min={item.config?.min ?? 0}
                      max={item.config?.max ?? 100}
                      paso={1}
                      decimales={item.config?.decimalPlaces ?? 2}
                      sufijo={item.unit ?? '%'}
                      disabled={soloLectura}
                      etiquetaAccesible={`${item.label} — medición ${occurrence}`}
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
