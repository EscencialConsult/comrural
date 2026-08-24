import FormSelect from '../FormSelect.jsx'

// Fila de resultado con celda "Encontrado" editable o de solo lectura —
// select si la fila trae `opciones` (ej. sensorial), input de texto si no.
function CeldaEncontrado({ valor, opciones, onChange, soloLectura }) {
  if (opciones) {
    return (
      <FormSelect
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={soloLectura}
        className="min-w-[9rem] py-1.5"
      >
        <option value="">Seleccioná…</option>
        {opciones.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </FormSelect>
    )
  }
  return (
    <input
      type="text"
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={soloLectura}
      className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/50"
    />
  )
}

// Tabla "Parámetro / Método / Unidad / Encontrado / Permitido / Referencia"
// del informe P-LAB-10/R-04 — reusable para cualquier informe de
// laboratorio con esta misma forma (hoy Químico/Físico/Sensorial dentro de
// InformeAnalisisFisicoquimico.jsx; sirve igual para un informe futuro de
// otra categoría). La columna "Categoría" se fusiona en una sola celda con
// rowSpan, igual que en el papel.
//
// `valores`/`onCambiarValor` llegan del borrador local (useAnalisisDraft) —
// esta tabla no sabe nada de persistencia, solo lee/escribe por `fila.id`.
export default function TablaResultadosEnsayo({ categoria, filas, conUnidad = true, valores, onCambiarValor, soloLectura }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white/70">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-verde-hoja/35 text-xs font-bold uppercase tracking-wide text-verde-bosque">
            <th className="px-3 py-2.5">Categoría</th>
            <th className="px-3 py-2.5">Parámetro</th>
            <th className="px-3 py-2.5">Método</th>
            {conUnidad && <th className="px-3 py-2.5">Unidad</th>}
            <th className="px-3 py-2.5">Encontrado</th>
            <th className="px-3 py-2.5">Permitido</th>
            <th className="px-3 py-2.5">Referencia</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={fila.id} className="border-b border-marron-tierra/15 last:border-b-0">
              {i === 0 && (
                <td
                  rowSpan={filas.length}
                  className="border-r border-marron-tierra/15 bg-marron-tierra/5 px-3 py-2 align-top text-xs font-bold uppercase text-marron-cafe/70"
                >
                  {categoria}
                </td>
              )}
              <td className="px-3 py-2 text-marron-cafe">{fila.parametro}</td>
              <td className="px-3 py-2 text-xs text-marron-cafe/50">{fila.metodo}</td>
              {conUnidad && <td className="px-3 py-2 text-xs text-marron-cafe/50">{fila.unidad}</td>}
              <td className="px-3 py-2">
                <CeldaEncontrado
                  valor={valores[fila.id]}
                  opciones={fila.opciones}
                  onChange={(v) => onCambiarValor(fila.id, v)}
                  soloLectura={soloLectura}
                />
              </td>
              <td className="px-3 py-2 text-xs text-marron-cafe/60">{fila.permitido}</td>
              <td className="px-3 py-2 text-xs text-marron-cafe/50">{fila.referencia}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
