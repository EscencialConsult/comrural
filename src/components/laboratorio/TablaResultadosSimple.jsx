// Tabla "Parámetro / Resultado / Unidad / Método / Límite" — hermana de
// TablaResultadosEnsayo.jsx (Fisicoquímico), pero sin columna de
// Categoría ni de Referencia: reusable para cualquier informe de una sola
// categoría con esta forma más simple (hoy Microbiológico, ver
// InformeAnalisisMicrobiologico.jsx; sirve igual para Toxicológico el día
// que tenga su propio documento).
export default function TablaResultadosSimple({ filas, limiteEtiqueta = 'Límite', valores, onCambiarValor, soloLectura }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white/70">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b-2 border-verde-hoja/35 text-xs font-bold uppercase tracking-wide text-verde-bosque">
            <th className="px-3 py-2.5">Parámetro</th>
            <th className="px-3 py-2.5">Resultado</th>
            <th className="px-3 py-2.5">Unidad</th>
            <th className="px-3 py-2.5">Método</th>
            <th className="px-3 py-2.5">{limiteEtiqueta}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id} className="border-b border-marron-tierra/15 last:border-b-0">
              <td className="px-3 py-2 text-marron-cafe">{fila.parametro}</td>
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={valores[fila.id] ?? ''}
                  onChange={(e) => onCambiarValor(fila.id, e.target.value)}
                  disabled={soloLectura}
                  className="w-24 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/50"
                />
              </td>
              <td className="px-3 py-2 text-xs text-marron-cafe/50">{fila.unidad}</td>
              <td className="px-3 py-2 text-xs text-marron-cafe/50">{fila.metodo}</td>
              <td className="px-3 py-2 text-xs text-marron-cafe/60">{fila.limite}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
