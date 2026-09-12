import { useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { SALIDAS_PT_EJEMPLO } from '../../data/almacenMock.js'
import BarraFiltros from './BarraFiltros.jsx'
import FormSelect from '../FormSelect.jsx'
import FormInput from '../FormInput.jsx'
import EmptyState from '../EmptyState.jsx'
import MockupBanner from '../MockupBanner.jsx'

// Subpestaña "Historial" de Producto Terminado (ver
// PanelAlmacenProductoTerminado.jsx) — mockup total, mismo criterio que
// SeccionSalidaProductoTerminado.jsx (P-BPA-01/R-12 sin backend): lista
// SALIDAS_PT_EJEMPLO en vez de pedirle algo real al servidor. Filtra por
// lote, producto, destino y fecha — "por lote y por lo demás", pedido
// explícito.
export default function SeccionHistorialSalidaProductoTerminado() {
  const [busqueda, setBusqueda] = useState('')
  const [lote, setLote] = useState('')
  const [producto, setProducto] = useState('')
  const [fecha, setFecha] = useState('')

  const lotes = useMemo(() => [...new Set(SALIDAS_PT_EJEMPLO.map((s) => s.lote))], [])
  const productos = useMemo(() => [...new Set(SALIDAS_PT_EJEMPLO.map((s) => s.producto))], [])

  const hayFiltrosActivos = busqueda !== '' || lote !== '' || producto !== '' || fecha !== ''
  const limpiarFiltros = () => {
    setBusqueda('')
    setLote('')
    setProducto('')
    setFecha('')
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return SALIDAS_PT_EJEMPLO.filter((s) => {
      if (q && !s.destino.toLowerCase().includes(q) && !s.numeroNota.toLowerCase().includes(q)) return false
      if (lote && s.lote !== lote) return false
      if (producto && s.producto !== producto) return false
      if (fecha && s.fecha !== fecha) return false
      return true
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }, [busqueda, lote, producto, fecha])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Historial de salidas</h2>
        <p className="text-xs text-marron-cafe/40">Notas de salida de Producto Terminado ya registradas</p>
      </div>

      <MockupBanner />

      <BarraFiltros
        busqueda={busqueda}
        onBusquedaChange={(e) => setBusqueda(e.target.value)}
        placeholderBusqueda="Destino o N° de nota…"
        hayFiltrosActivos={hayFiltrosActivos}
        onLimpiar={limpiarFiltros}
      >
        <FormSelect label="Lote" value={lote} onChange={(e) => setLote(e.target.value)} className="min-w-[160px] flex-1 sm:max-w-[200px]">
          <option value="">Todos</option>
          {lotes.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="Producto" value={producto} onChange={(e) => setProducto(e.target.value)} className="min-w-[160px] flex-1 sm:max-w-[220px]">
          <option value="">Todos</option>
          {productos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </FormSelect>
        <FormInput
          label="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="min-w-[160px] flex-1 sm:max-w-[200px]"
        />
      </BarraFiltros>

      {filtradas.length === 0 ? (
        <EmptyState Icon={History} titulo="No hay salidas que coincidan con el filtro" />
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/10 text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">N° de nota</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((s) => (
                <tr key={s.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                  <td className="px-4 py-3 text-marron-cafe/70">{new Date(s.fecha).toLocaleDateString('es-BO', { dateStyle: 'medium' })}</td>
                  <td className="px-4 py-3 text-marron-cafe">{s.producto}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{s.lote}</td>
                  <td className="px-4 py-3 text-marron-cafe">
                    {s.cantidad} {s.unidad}
                  </td>
                  <td className="px-4 py-3 text-marron-cafe">{s.destino}</td>
                  <td className="px-4 py-3 text-marron-cafe/70">{s.numeroNota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
