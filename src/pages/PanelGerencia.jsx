import { useEffect, useMemo, useState } from 'react'
import { Briefcase, ClipboardCheck, ClipboardList, Factory, MapPin, ShoppingCart, TestTubes, Warehouse } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCatalogoMaestro } from '../hooks/useCatalogoMaestro'
import { lotsService } from '../services/lotsService'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { lotTraceabilityService } from '../services/lotTraceabilityService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SearchInput from '../components/SearchInput.jsx'
import Badge from '../components/Badge.jsx'
import Skeleton from '../components/Skeleton.jsx'
import Modal from '../components/Modal.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'

const NATURE_LABEL = { PM: 'Materia prima', PT: 'Producto terminado' }

const nombrePersona = (p) => `${p.firstNames} ${p.lastNames}`
const nombreOrganizacion = (o) => o.tradeName || o.legalName
const nombreProveedor = (s) => (s?.person ? nombrePersona(s.person) : s?.organization ? nombreOrganizacion(s.organization) : '—')

const formatearFechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

// Mismo criterio que PanelCompras/PanelCalidadRecepcion (TONO_ESTADO_LOTE) —
// acá es el estado GENERAL del lote (header de la trazabilidad), separado
// del `status` de cada hito individual (ver tonoHito más abajo).
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

// Un hito sin `occurredAt` todavía no pasó (gris); uno con `occurredAt` ya
// pasó (verde), salvo que su `status` sea explícitamente un rechazo —
// mismo espíritu que TONO_ESTADO_LOTE pero aplicado a cualquier módulo, sin
// necesitar un mapa por cada uno de los ~8 valores de `status` posibles.
function tonoHito({ status, occurredAt }) {
  if (!occurredAt) return 'neutro'
  if (status && status.includes('RECHAZ')) return 'negativo'
  return 'positivo'
}

// Un ícono propio por módulo (en vez de un genérico check/círculo) — mismo
// vocabulario que ya usa el resto de la app para estas áreas (ver
// moduloIcons.js y gruposMaestros.js: Warehouse=Almacén, ShoppingCart=Compras,
// ClipboardList=Inspección, ClipboardCheck=Control de Proceso, TestTubes=Muestras).
const ICONO_HITO = {
  compras: ShoppingCart,
  almacen: Warehouse,
  'calidad-recepcion': ClipboardList,
  produccion: Factory,
  'calidad-control-proceso': ClipboardCheck,
  laboratorio: TestTubes,
}

// Pantalla "Gerencia" — trazabilidad de lotes: listado + al clickear uno, su
// recorrido completo por Compras/Almacén/Calidad/Producción/Laboratorio
// (GET /lots/:id/traceability, ver comrural_erp_backend/docs/lot-traceability.md,
// leído completo). Es SOLO consulta a propósito (pedido explícito) — no hay
// crear/editar/eliminar acá, ni un botón que lleve a hacerlo.
export default function PanelGerencia() {
  const { permisos } = useAuth()
  // gerencia:read es el gate real de esta pantalla (mismo permiso que
  // habilita el link "Gerencia" del sidebar, ver mock/data/modulos.json) —
  // lot-traceability:read/lots:read son los permisos técnicos que protegen
  // los endpoints en sí, sembrados juntos para el rol gerencia (ver
  // 0037_lot_traceability_permission.sql).
  const puedeVer = permisos.has('gerencia:read')

  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  // Controla la visibilidad del modal por sí sola — ni `trazabilidad` ni
  // `errorDetalle` (del hook) vuelven a `null` al cerrar, así que no sirven
  // como condición de "abierto" (mismo criterio que `vista.modo` en
  // PanelCompras.jsx).
  const [lotIdSeleccionado, setLotIdSeleccionado] = useState(null)

  const {
    items: lotes,
    cursor,
    cargandoMas,
    errorCargarMas,
    errorCarga,
    cargarPrimeraPagina,
    cargarMas,
    detalle: trazabilidad,
    setDetalle: setTrazabilidad,
    errorDetalle,
    abrirDetalle,
  } = useCatalogoMaestro(
    // `listar` es el real de lotsService (paginado); `obtener` viene de
    // lotTraceabilityService en vez de lotsService.obtener — acá "el
    // detalle" de un lote es su trazabilidad, no la fila cruda del lote.
    useMemo(() => ({ listar: lotsService.listar, obtener: lotTraceabilityService.obtener }), []),
    { puedeVer, limit: 100 },
  )

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    productsService.listar({ limit: 100 }).then((resp) => !cancelado && setProductos(resp.data))
    suppliersService.listar({ limit: 100 }).then((resp) => !cancelado && setProveedores(resp.data))
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const proveedorNombre = (id) => nombreProveedor(proveedores?.find((p) => p.id === id))

  const lotesFiltrados = useMemo(() => {
    if (!lotes) return null
    const q = busqueda.trim().toLowerCase()
    if (!q) return lotes
    return lotes.filter((l) => {
      const nombreProd = productoNombre(l.productId).toLowerCase()
      return l.code.toLowerCase().includes(q) || nombreProd.includes(q)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- productoNombre depende de `productos`, ya incluido.
  }, [lotes, busqueda, productos])

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Gerencia." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Briefcase className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Gerencia</h1>
          <p className="text-sm text-marron-cafe/60">
            Trazabilidad de lotes — en qué módulo está o estuvo cada uno, de punta a punta.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-marron-cafe">
          Lotes {lotes && <span className="text-sm font-medium text-marron-cafe/40">{lotes.length}</span>}
        </h2>

        {errorCarga ? (
          <ErrorBanner
            mensaje={`No se pudo cargar el listado: ${errorCarga}`}
            onReintentar={cargarPrimeraPagina}
          />
        ) : lotes === null ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <SearchInput
              label="Buscar"
              placeholder="Código o producto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-xs"
            />

            {cursor && (
              <p className="text-xs text-marron-cafe/40">
                Se cargaron {lotes.length} lotes — usá "Cargar más" para ampliar el conjunto.
              </p>
            )}

            <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-marron-tierra/10 text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
                    <th className="px-4 py-3">Lote</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {lotesFiltrados.map((l) => (
                    <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setLotIdSeleccionado(l.id)
                            abrirDetalle(l.id)
                          }}
                          className="flex flex-col gap-0.5 text-left"
                        >
                          <span className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</span>
                          <span className="rounded-full bg-marron-tierra/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-marron-cafe/60 uppercase w-fit">
                            {NATURE_LABEL[l.nature] ?? l.nature}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-marron-cafe">{productoNombre(l.productId)}</td>
                      <td className="px-4 py-3 text-marron-cafe">{l.nature === 'PM' ? proveedorNombre(l.supplierId) : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tono={TONO_ESTADO_LOTE[l.currentStatus] ?? 'neutro'}>{l.currentStatus.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setLotIdSeleccionado(l.id)
                            abrirDetalle(l.id)
                          }}
                          className="flex items-center gap-1.5 rounded-full bg-verde-hoja/10 px-3 py-1.5 text-xs font-semibold text-verde-bosque hover:bg-verde-hoja/20"
                        >
                          <MapPin className="size-3.5" strokeWidth={2} />
                          Ver trazabilidad
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lotesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                        {lotes.length === 0 ? 'No hay lotes cargados todavía.' : 'Ningún lote coincide con la búsqueda.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {cursor && (
              <button
                type="button"
                onClick={cargarMas}
                disabled={cargandoMas}
                className="self-start rounded-full bg-marron-tierra/10 px-4 py-2 text-sm font-semibold text-marron-cafe hover:bg-marron-tierra/20 disabled:opacity-50"
              >
                {cargandoMas ? 'Cargando…' : 'Cargar más'}
              </button>
            )}
            {errorCargarMas && <p className="text-xs font-medium text-rojo-pasankalla">No se pudo cargar más: {errorCargarMas}</p>}
          </>
        )}
      </section>

      <Modal
        abierto={lotIdSeleccionado !== null}
        titulo="Trazabilidad del lote"
        onCerrar={() => {
          setLotIdSeleccionado(null)
          setTrazabilidad(null)
        }}
        maxWidth="max-w-xl"
      >
        {errorDetalle ? (
          <div className="flex flex-col items-start gap-2 text-sm">
            <p className="font-medium text-rojo-pasankalla">No se pudo cargar: {errorDetalle}</p>
            <button
              type="button"
              onClick={() => abrirDetalle(lotIdSeleccionado)}
              className="rounded-full bg-rojo-pasankalla/10 px-3 py-1.5 text-xs font-semibold text-rojo-pasankalla hover:bg-rojo-pasankalla/20"
            >
              Reintentar
            </button>
          </div>
        ) : !trazabilidad ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 rounded-2xl bg-marron-tierra/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-marron-tierra/10 px-3 py-1 font-mono text-xs font-semibold text-marron-cafe/70">
                  {trazabilidad.lot.code}
                </span>
                <span className="rounded-full bg-marron-tierra/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-marron-cafe/60 uppercase">
                  {NATURE_LABEL[trazabilidad.lot.nature] ?? trazabilidad.lot.nature}
                </span>
                <Badge tono={TONO_ESTADO_LOTE[trazabilidad.lot.currentStatus] ?? 'neutro'}>
                  {trazabilidad.lot.currentStatus.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-marron-cafe">
                <p>
                  <span className="text-marron-cafe/40">Producto: </span>
                  {productoNombre(trazabilidad.lot.productId)}
                </p>
                {trazabilidad.lot.nature === 'PM' && (
                  <p>
                    <span className="text-marron-cafe/40">Proveedor: </span>
                    {proveedorNombre(trazabilidad.lot.supplierId)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-marron-cafe">Recorrido</h3>
              <span className="text-xs font-medium text-marron-cafe/40">
                {trazabilidad.milestones.filter((h) => h.occurredAt).length} de {trazabilidad.milestones.length} pasos
              </span>
            </div>

            <ol className="flex flex-col">
              {trazabilidad.milestones.map((hito, i) => {
                const tono = tonoHito(hito)
                const Icon = ICONO_HITO[hito.module] ?? ClipboardList
                const esUltimo = i === trazabilidad.milestones.length - 1
                const colorTexto =
                  tono === 'positivo' ? 'text-verde-bosque' : tono === 'negativo' ? 'text-rojo-pasankalla' : 'text-marron-cafe/40'
                const colorFondo =
                  tono === 'positivo' ? 'bg-verde-hoja/15' : tono === 'negativo' ? 'bg-rojo-pasankalla/10' : 'bg-marron-tierra/10'
                return (
                  <li key={hito.module} className="relative flex gap-4 pb-6 last:pb-0">
                    {!esUltimo && <span className="absolute top-9 bottom-0 left-4 w-px -translate-x-1/2 bg-marron-tierra/15" />}
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${colorFondo}`}>
                      <Icon className={`size-4 ${colorTexto}`} strokeWidth={1.75} />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${hito.occurredAt ? 'text-marron-cafe' : 'text-marron-cafe/50'}`}>
                          {hito.label}
                        </p>
                        {hito.status && <Badge tono={tono}>{hito.status.replace(/_/g, ' ')}</Badge>}
                      </div>
                      <p className="text-xs text-marron-cafe/40">
                        {hito.occurredAt ? formatearFechaHora(hito.occurredAt) : 'Todavía no ocurrió'}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </Modal>
    </main>
  )
}
