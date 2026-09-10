import { useMemo, useState } from 'react'
import { HISTORIAL_EPP_EJEMPLO } from '../../data/almacenMock.js'
import MockupBanner from '../MockupBanner.jsx'
import SearchInput from '../SearchInput.jsx'
import Button from '../Button.jsx'
import { X } from 'lucide-react'

// Historial de EPP por persona — sección 10 del relevamiento ("Historial
// de EPPs por persona") y P-16 de la narrativa ("queda incorporado al
// historial individual del trabajador"). No hay entregas reales de las
// que armar esto: la Entrega de Indumentaria y EPP (ver
// SeccionEntregaIndumentariaEpp.jsx) es mockup y no persiste — mismo
// criterio que el resto de los mocks de Almacén, datos de ejemplo (ver
// src/data/almacenMock.js). MOCKUP total, sin backend propio.
export default function SeccionHistorialEpp() {
  const [busqueda, setBusqueda] = useState('')

  const filtrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return HISTORIAL_EPP_EJEMPLO
    return HISTORIAL_EPP_EJEMPLO.filter((h) => h.persona.toLowerCase().includes(q) || h.item.toLowerCase().includes(q))
  }, [busqueda])

  return (
    <div className="flex flex-col gap-6">
      <MockupBanner mensaje="Mockup — sin entregas reales que registrar todavía (la Entrega de EPP no persiste), historial de ejemplo." />

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <SearchInput label="Buscar" placeholder="Persona o ítem…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        {busqueda && (
          <Button variant="secondary" className="gap-1.5 px-3 py-2 text-sm" onClick={() => setBusqueda('')}>
            <X className="size-3.5" strokeWidth={2} />
            Limpiar
          </Button>
        )}
      </div>

      {/* Tarjetas en mobile — mismo criterio que Existencias/Inventario: la
          tabla de abajo (6 columnas) fuerza scroll horizontal en pantallas
          angostas, acá se repite la misma info apilada. */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtrado.map((h) => (
          <div key={h.id} className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-marron-cafe">{h.persona}</p>
                <p className="text-xs text-marron-cafe/60">{h.area}</p>
              </div>
              <span className="shrink-0 text-xs text-marron-cafe/50">{new Date(h.fecha).toLocaleDateString('es-BO', { dateStyle: 'medium' })}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-marron-tierra/10 pt-2 text-sm">
              <span className="text-marron-cafe">
                {h.item} {h.talla !== '—' && <span className="text-xs text-marron-cafe/50">(talla {h.talla})</span>}
              </span>
              <span className="text-xs text-marron-cafe/60">×{h.cantidad}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-marron-cafe/70">{h.tipoDotacion}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${h.estado === 'Nuevo' ? 'bg-verde-hoja/15 text-verde-bosque' : 'bg-marron-tierra/10 text-marron-cafe/60'}`}>
                {h.estado}
              </span>
            </div>
          </div>
        ))}
        {filtrado.length === 0 && (
          <p className="rounded-2xl bg-marron-tierra/5 px-4 py-6 text-center text-sm text-marron-cafe/50">
            Ninguna entrega coincide con la búsqueda.
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl bg-marron-tierra/5 p-2 md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
              <th className="px-4 py-3 text-left">Persona</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-left">Ítem</th>
              <th className="px-4 py-3">Talla</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Tipo de dotación</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white/70">
            {filtrado.map((h) => (
              <tr key={h.id} className="border-b border-marron-tierra/10 last:border-b-0">
                <td className="px-4 py-3 text-marron-cafe">
                  {h.persona} <span className="text-xs text-marron-cafe/50">— {h.area}</span>
                </td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">{new Date(h.fecha).toLocaleDateString('es-BO', { dateStyle: 'medium' })}</td>
                <td className="px-4 py-3 text-marron-cafe">{h.item}</td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">{h.talla}</td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">{h.cantidad}</td>
                <td className="px-4 py-3 text-center text-xs text-marron-cafe/60">{h.tipoDotacion}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${h.estado === 'Nuevo' ? 'bg-verde-hoja/15 text-verde-bosque' : 'bg-marron-tierra/10 text-marron-cafe/60'}`}>
                    {h.estado}
                  </span>
                </td>
              </tr>
            ))}
            {filtrado.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                  Ninguna entrega coincide con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
