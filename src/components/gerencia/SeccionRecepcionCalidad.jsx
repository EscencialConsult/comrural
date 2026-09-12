import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCatalogoMaestro } from '../../hooks/useCatalogoMaestro'
import { lotsService } from '../../services/lotsService'
import { productsService } from '../../services/productsService'
import { suppliersService } from '../../services/suppliersService'
import { listarTodo } from '../../services/paginacion'
import FormSelect from '../FormSelect.jsx'
import SearchInput from '../SearchInput.jsx'
import Button from '../Button.jsx'
import ErrorBanner from '../ErrorBanner.jsx'
import Badge from '../Badge.jsx'
import Skeleton from '../Skeleton.jsx'

const TONO_ESTADO_LOTE = {
  PROGRAMADO: 'neutro',
  EN_RECEPCION: 'alerta',
  ACEPTADO_RECEPCION: 'positivo',
  LAVADO: 'positivo',
  EN_ANALISIS: 'alerta',
  PENDIENTE_LIBERACION: 'alerta',
  RETENIDO: 'negativo',
  LIBERADO: 'positivo',
  RECHAZADO: 'negativo',
  CANCELADO: 'neutro',
}

const nombrePersona = (p) => `${p.firstNames} ${p.lastNames}`
const nombreOrganizacion = (o) => o.tradeName || o.legalName
const nombreProveedor = (s) => (s?.person ? nombrePersona(s.person) : s?.organization ? nombreOrganizacion(s.organization) : '—')

const formatearFechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

// Mismo listado de lotes PM que PanelCompras.jsx, con el botón "Ver
// recepción y calidad" (antes vivía ahí) movido acá — pedido explícito: la
// gestión de recepción/calidad de un lote se hace desde Gerencia, no desde
// Compras. `gerencia` recibió raw-material-receptions:read +
// warehouse-receipts:create + inspections:create + quality-resolutions:
// update/approve (insert manual sobre role_permissions, no migración) para
// poder operar la pantalla de destino (PanelRecepcionLote.jsx) igual que
// almacen/calidad.
export default function SeccionRecepcionCalidad() {
  const navigate = useNavigate()
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [productoFiltro, setProductoFiltro] = useState('')
  const [proveedorFiltro, setProveedorFiltro] = useState('')

  const { items: lotes, cursor, cargandoMas, errorCargarMas, errorCarga, cargarPrimeraPagina, cargarMas } =
    useCatalogoMaestro(lotsService, { puedeVer: true })

  useEffect(() => {
    let cancelado = false
    listarTodo(productsService.listar).then((productos) => !cancelado && setProductos(productos))
    listarTodo(suppliersService.listar).then((proveedores) => !cancelado && setProveedores(proveedores))
    return () => {
      cancelado = true
    }
  }, [])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const proveedorNombre = (id) => nombreProveedor(proveedores?.find((p) => p.id === id))

  const lotesFiltrados = useMemo(() => {
    if (!lotes) return null
    const q = busqueda.trim().toLowerCase()
    return lotes.filter((l) => {
      if (l.nature !== 'PM') return false
      if (estadoFiltro && l.currentStatus !== estadoFiltro) return false
      if (productoFiltro && l.productId !== productoFiltro) return false
      if (proveedorFiltro && l.supplierId !== proveedorFiltro) return false
      if (q) {
        const nombreProd = productoNombre(l.productId).toLowerCase()
        if (!l.code.toLowerCase().includes(q) && !nombreProd.includes(q)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- productoNombre depende de `productos`, ya incluido.
  }, [lotes, busqueda, estadoFiltro, productoFiltro, proveedorFiltro, productos])

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-marron-cafe">
        Lotes de materia prima {lotes && <span className="text-sm font-medium text-marron-cafe/40">{lotes.length}</span>}
      </h2>

      {errorCarga ? (
        <ErrorBanner mensaje={`No se pudo cargar el listado: ${errorCarga}`} onReintentar={cargarPrimeraPagina} />
      ) : lotes === null ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-marron-tierra/5 p-4 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <SearchInput label="Buscar" placeholder="Código o producto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <FormSelect label="Estado" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
              <option value="">Todos</option>
              {Object.keys(TONO_ESTADO_LOTE).map((e) => (
                <option key={e} value={e}>
                  {e.replace(/_/g, ' ')}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="Producto" value={productoFiltro} onChange={(e) => setProductoFiltro(e.target.value)}>
              <option value="">Todos</option>
              {productos?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="Proveedor" value={proveedorFiltro} onChange={(e) => setProveedorFiltro(e.target.value)}>
              <option value="">Todos</option>
              {proveedores?.map((s) => (
                <option key={s.id} value={s.id}>
                  {nombreProveedor(s)}
                </option>
              ))}
            </FormSelect>
          </div>

          <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-marron-tierra/10 text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Llegada</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {lotesFiltrados.map((l) => (
                  <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</span>
                    </td>
                    <td className="px-4 py-3 text-marron-cafe">{productoNombre(l.productId)}</td>
                    <td className="px-4 py-3 text-marron-cafe">{proveedorNombre(l.supplierId)}</td>
                    <td className="px-4 py-3 text-marron-cafe">{l.scheduledReceptionAt ? formatearFechaHora(l.scheduledReceptionAt) : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tono={TONO_ESTADO_LOTE[l.currentStatus] ?? 'neutro'}>{l.currentStatus.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => navigate(`/panel/calidad/lotes/${l.id}`)}>
                        Ver recepción y calidad
                      </Button>
                    </td>
                  </tr>
                ))}
                {lotesFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                      {lotes.length === 0 ? 'No hay lotes cargados todavía.' : 'Ningún lote coincide con el filtro.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {errorCargarMas && (
            <p className="text-center text-xs font-medium text-rojo-pasankalla">No se pudo cargar más: {errorCargarMas}</p>
          )}

          {cursor && (
            <Button variant="secondary" className="self-center px-4 py-2 text-sm" disabled={cargandoMas} onClick={cargarMas}>
              {cargandoMas ? 'Cargando…' : errorCargarMas ? 'Reintentar' : 'Cargar más'}
            </Button>
          )}
        </>
      )}
    </section>
  )
}
