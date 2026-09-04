import { useEffect, useMemo, useState } from 'react'
import { Receipt, X, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { listarTodo } from '../services/paginacion'
import { useLotesBuscables } from '../hooks/useLotesBuscables'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import SearchInput from '../components/SearchInput.jsx'
import FormSelect from '../components/FormSelect.jsx'
import FormInput from '../components/FormInput.jsx'
import NotaRecepcionMateriaPrima from '../components/formularios/NotaRecepcionMateriaPrima.jsx'
import Skeleton from '../components/Skeleton.jsx'

// Formulario 3 (Nota de Recepción, P-ADM-03/R-11) — a propósito FUERA del
// molde de Inspección/Recepción (sin desplegable en el sidebar, ver
// DashboardSidebar.jsx: "Remito" es un link suelto, no un sub-item más de
// Calidad y Laboratorio). Esta pantalla es solo el listado para elegir el
// lote — el documento en sí (NotaRecepcionMateriaPrima.jsx) es de solo
// lectura/impresión, no tiene estado propio que gatear, así que la tabla
// acá es más simple que la de Inspección: sin casillas de etapa, sin
// borde de color — un solo botón, siempre igual.
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

// Mismo criterio que PanelAlmacenRecepcion.jsx: solo se marca algo cuando
// la recepción está genuinamente cerrada — es la señal de "esta nota ya
// tiene todos los datos finales", no una obligación para poder abrirla
// (se puede ver/imprimir en cualquier momento, con lo que haya).
function etapaDe(resumen) {
  const wr = resumen && resumen !== 'error' ? resumen.warehouseReceipt : null
  if (!wr) return null
  if (wr.status === 'FINALIZADA') return { texto: 'Datos completos', tono: 'positivo', Icon: CheckCircle2 }
  if (wr.status === 'CANCELADA') return { texto: 'Cancelada', tono: 'negativo', Icon: XCircle }
  return null
}

export default function PanelCalidadRemito() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('lots:read')

  const { lotes, busqueda, setBusqueda, cursor, cargandoMas, errorCarga, cargarMas } = useLotesBuscables({ puedeVer })
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [lotAbierto, setLotAbierto] = useState(null)

  const [estado, setEstado] = useState('')
  const [productoId, setProductoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState('')

  const hayFiltrosActivos = busqueda !== '' || estado !== '' || productoId !== '' || proveedorId !== '' || fecha !== ''
  const limpiarFiltros = () => {
    setBusqueda('')
    setEstado('')
    setProductoId('')
    setProveedorId('')
    setFecha('')
  }

  const [resumenes, setResumenes] = useState({})

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    Promise.all([listarTodo(productsService.listar), listarTodo(suppliersService.listar)])
      .then(([productos, proveedores]) => {
        if (cancelado) return
        setProductos(productos)
        setProveedores(proveedores)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const proveedorNombre = (id) => {
    const s = proveedores?.find((p) => p.id === id)
    if (!s) return '—'
    return s.person ? `${s.person.firstNames} ${s.person.lastNames}` : s.organization ? s.organization.tradeName || s.organization.legalName : '—'
  }

  // busqueda (código) ya filtra del lado del servidor (ver
  // useLotesBuscables) — acá solo quedan los filtros que el backend todavía
  // no soporta.
  const filtrados = useMemo(() => {
    if (!lotes) return []
    return lotes.filter((l) => {
      if (estado && l.currentStatus !== estado) return false
      if (productoId && l.productId !== productoId) return false
      if (proveedorId && l.supplierId !== proveedorId) return false
      if (fecha && (!l.scheduledReceptionAt || new Date(l.scheduledReceptionAt).toLocaleDateString('en-CA') !== fecha)) return false
      return true
    })
  }, [lotes, estado, productoId, proveedorId, fecha])

  useEffect(() => {
    let cancelado = false
    Promise.allSettled(filtrados.map((l) => rawMaterialReceptionsService.obtener(l.id))).then((resultados) => {
      if (cancelado) return
      setResumenes((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[filtrados[i].id] = r.status === 'fulfilled' ? r.value : 'error'
        })
        return siguiente
      })
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotes, estado, productoId, proveedorId, fecha])

  const volverALista = () => setLotAbierto(null)

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso al remito." />
  }

  if (lotAbierto) {
    return (
      <main className="flex w-full flex-col gap-6 p-6 md:p-10">
        <NotaRecepcionMateriaPrima lotId={lotAbierto} onVolver={volverALista} tituloVolver="Volver al listado" />
      </main>
    )
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Receipt className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Remito</h1>
          <p className="text-sm text-marron-cafe/60">
            Nota de Recepción de Materia Prima (P-ADM-03/R-11) — solo lectura, síntesis de Inspección + Recepción.
          </p>
        </div>
      </header>

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      {!lotes ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-marron-tierra/5 p-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="col-span-2 sm:col-span-1">
              <SearchInput
                label="Buscar"
                placeholder="Código de lote…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <FormSelect label="Producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              <option value="">Todos</option>
              {productos?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="Proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">Todos</option>
              {proveedores?.map((s) => (
                <option key={s.id} value={s.id}>
                  {proveedorNombre(s.id)}
                </option>
              ))}
            </FormSelect>
            <FormInput
              label="Fecha de recepción"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <FormSelect label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option>
              {Object.keys(TONO_ESTADO_LOTE).map((e) => (
                <option key={e} value={e}>
                  {e.replace(/_/g, ' ')}
                </option>
              ))}
            </FormSelect>
            <div className="col-span-2 flex items-end sm:col-span-1">
              <Button
                variant="secondary"
                className="w-full justify-center gap-1.5 px-3 py-2 text-sm"
                disabled={!hayFiltrosActivos}
                onClick={limpiarFiltros}
              >
                <X className="size-3.5" strokeWidth={2} />
                Limpiar filtros
              </Button>
            </div>
          </div>

          {/* Tarjetas en mobile (hidden md:block/md:hidden) — la tabla de
              abajo obliga a scrollear horizontal en pantallas angostas
              (min-w-[820px]), acá se repite la misma info apilada. */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtrados.map((l) => {
              const resumen = resumenes[l.id]
              const etapa = etapaDe(resumen)
              return (
                <div key={l.id} className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</p>
                      <p className="truncate text-sm text-marron-cafe">{productoNombre(l.productId)}</p>
                      <p className="truncate text-xs text-marron-cafe/60">{proveedorNombre(l.supplierId)}</p>
                    </div>
                    {resumen === 'error' ? (
                      <span className="shrink-0 text-xs text-marron-cafe/40">—</span>
                    ) : resumen && etapa ? (
                      <Badge tono={etapa.tono} className="inline-flex shrink-0 items-center gap-1">
                        <etapa.Icon className="size-3" strokeWidth={2.5} />
                        {etapa.texto}
                      </Badge>
                    ) : resumen ? (
                      <span className="shrink-0 text-xs text-marron-cafe/40">Sin recepción todavía</span>
                    ) : (
                      <span className="shrink-0 text-xs text-marron-cafe/40">Cargando…</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-marron-tierra/10 pt-2">
                    <span className="text-xs text-marron-cafe/60">
                      {l.scheduledReceptionAt ? (
                        new Date(l.scheduledReceptionAt).toLocaleDateString('es-BO', { dateStyle: 'medium' })
                      ) : (
                        <span className="text-marron-cafe/40">Sin fecha</span>
                      )}
                    </span>
                    <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => setLotAbierto(l.id)}>
                      <Receipt className="size-3.5 shrink-0" strokeWidth={2} />
                      Ver remito
                    </Button>
                  </div>
                </div>
              )
            })}
            {filtrados.length === 0 && (
              <p className="rounded-2xl bg-marron-tierra/5 px-4 py-6 text-center text-sm text-marron-cafe/50">
                No hay lotes de materia prima que coincidan con el filtro.
              </p>
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-3xl bg-marron-tierra/5 md:block">
            <table className="w-full min-w-[820px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[24%]" />
                <col className="w-[20%]" />
                <col className="w-[13%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Fecha de recepción</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l) => {
                  const resumen = resumenes[l.id]
                  const etapa = etapaDe(resumen)
                  return (
                    <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                      <td className="truncate px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</td>
                      <td className="truncate px-4 py-3 text-marron-cafe" title={productoNombre(l.productId)}>
                        {productoNombre(l.productId)}
                      </td>
                      <td className="truncate px-4 py-3 text-marron-cafe" title={proveedorNombre(l.supplierId)}>
                        {proveedorNombre(l.supplierId)}
                      </td>
                      <td className="px-4 py-3 text-center text-marron-cafe/70">
                        {l.scheduledReceptionAt ? (
                          new Date(l.scheduledReceptionAt).toLocaleDateString('es-BO', { dateStyle: 'medium' })
                        ) : (
                          <span className="text-xs text-marron-cafe/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {resumen === 'error' ? (
                          <span className="text-xs text-marron-cafe/40">—</span>
                        ) : resumen && etapa ? (
                          <Badge tono={etapa.tono} className="inline-flex items-center gap-1">
                            <etapa.Icon className="size-3" strokeWidth={2.5} />
                            {etapa.texto}
                          </Badge>
                        ) : resumen ? (
                          <span className="text-xs text-marron-cafe/40">Sin recepción todavía</span>
                        ) : (
                          <span className="text-xs text-marron-cafe/40">Cargando…</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => setLotAbierto(l.id)}>
                          <Receipt className="size-3.5 shrink-0" strokeWidth={2} />
                          Ver remito
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                      No hay lotes de materia prima que coincidan con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {cursor && (
            <div className="flex justify-center">
              <Button variant="secondary" className="px-4 py-2 text-sm" disabled={cargandoMas} onClick={cargarMas}>
                {cargandoMas ? 'Cargando…' : 'Cargar más'}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
