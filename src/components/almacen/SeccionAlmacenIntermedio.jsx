import MockupBanner from '../MockupBanner.jsx'
import StatCard from '../dashboard/StatCard.jsx'
import { LOTES_EN_PROCESO, LOTES_EN_STOCK } from '../../data/almacenMock.js'

// Datos ilustrativos (ver src/data/almacenMock.js) — sección 5.1 del
// relevamiento: "produccion sacaba mas cantidad de la registrada,
// generando inventarios negativos [...] Almacen pasa la cantidad necesaria
// a un almacen de produccion, y produccion lo ve y lo saca". No se puede
// armar esto con lotes reales: hoy el backend no tiene un estado que
// distinga "transferido al almacén intermedio" de "disponible" — es
// exactamente el comportamiento que la narrativa (P-04) marca como
// pendiente de ratificar con el área. Mezclar un lote real LIBERADO con
// esta idea sería mostrar una distinción que el sistema no hace todavía,
// así que se mockea completo.
//
// Solo vista, SIN registrar consumo parcial del buffer (pedido explícito).
export default function SeccionAlmacenIntermedio() {
  return (
    <div className="flex flex-col gap-6">
      <MockupBanner mensaje="Mockup — solo vista, sin registro de consumo parcial. El estado 'En proceso' todavía no existe en el backend, pendiente de confirmar con el área." />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard valor={LOTES_EN_STOCK.length} etiqueta="Lotes en stock" />
        <StatCard valor={LOTES_EN_PROCESO.length} etiqueta="Lotes en proceso" />
      </div>

      <div className="flex flex-col gap-3 rounded-3xl bg-marron-tierra/5 p-5">
        <h2 className="font-extrabold text-marron-cafe">En proceso (almacén intermedio)</h2>

        {/* Tarjetas en mobile — mismo criterio que el resto de las tablas
            de Almacén: menos columnas que Existencias/Inventario, pero
            igual fuerza scroll horizontal por debajo de md. */}
        <div className="flex flex-col gap-2 md:hidden">
          {LOTES_EN_PROCESO.map((l) => (
            <div key={l.lote} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold text-marron-cafe/70">{l.lote}</p>
                <p className="truncate text-sm text-marron-cafe">{l.producto}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-marron-cafe/60">{new Date(l.transferidoEl).toLocaleDateString('es-BO', { dateStyle: 'medium' })}</p>
                <p className="text-xs font-semibold text-marron-cafe/70">{l.diasEnBuffer} día(s) en buffer</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl bg-white/70 md:block">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Transferido el</th>
                <th className="px-4 py-3">Días en buffer</th>
              </tr>
            </thead>
            <tbody>
              {LOTES_EN_PROCESO.map((l) => (
                <tr key={l.lote} className="border-b border-marron-tierra/10 last:border-b-0">
                  <td className="truncate px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{l.lote}</td>
                  <td className="px-4 py-3 text-marron-cafe">{l.producto}</td>
                  <td className="px-4 py-3 text-center text-marron-cafe/70">
                    {new Date(l.transferidoEl).toLocaleDateString('es-BO', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3 text-center text-marron-cafe/70">{l.diasEnBuffer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl bg-marron-tierra/5 p-5">
        <h2 className="font-extrabold text-marron-cafe">En stock (almacén central)</h2>

        <div className="flex flex-col gap-2 md:hidden">
          {LOTES_EN_STOCK.map((l) => (
            <div key={l.lote} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold text-marron-cafe/70">{l.lote}</p>
                <p className="truncate text-sm text-marron-cafe">{l.producto}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-marron-cafe/70">{l.cantidadSacos} sacos</p>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl bg-white/70 md:block">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Cantidad de sacos</th>
              </tr>
            </thead>
            <tbody>
              {LOTES_EN_STOCK.map((l) => (
                <tr key={l.lote} className="border-b border-marron-tierra/10 last:border-b-0">
                  <td className="truncate px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{l.lote}</td>
                  <td className="px-4 py-3 text-marron-cafe">{l.producto}</td>
                  <td className="px-4 py-3 text-center text-marron-cafe/70">{l.cantidadSacos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
