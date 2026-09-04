import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, ChevronLeft, Truck, Leaf, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { useCatalogoMaestro } from '../hooks/useCatalogoMaestro'
import { lotsService } from '../services/lotsService'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { listarTodo } from '../services/paginacion'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import FormSelect from '../components/FormSelect.jsx'
import FormDateTimeInput from '../components/FormDateTimeInput.jsx'
import SearchInput from '../components/SearchInput.jsx'
import Button from '../components/Button.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import Skeleton from '../components/Skeleton.jsx'
import { aInputLocal, compararPorFechaRecepcion } from '../utils/fecha'

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

// Pantalla "Compras" — antes era PanelLotes.jsx ("Lotes", sub-item aparte
// dentro de este mismo grupo). Se fusionaron a pedido explícito: la vieja
// pantalla "Compras" (Programa de Descargüío) mostraba un botón "Nuevo
// programa" permanentemente deshabilitado (campos de responsables/
// aprobaciones sin backend detrás, ver docs/lots.md §9) y una tabla más
// pobre que esta — un mockup parcial superpuesto a algo que "Lotes" ya
// hacía completo y real. Esta pantalla ES la gestión de lotes (ver
// comrural_erp_backend/docs/lots.md + lot.dto.ts/lots.service.ts, leídos
// completos): un lote es PM (materia prima, necesita proveedor + fecha de
// llegada — "emitir un programa" es, en los hechos, crear uno de estos) o
// PT (producto terminado, ninguno de los dos) — `nature` es inmutable, y el
// único PATCH real es "reprogramar" un PM que sigue en PROGRAMADO. El
// sub-item "Lotes" de `gruposMaestros.js` se sacó — vivía duplicado acá.
const NATURE_LABEL = { PM: 'Materia prima', PT: 'Producto terminado' }

const nombrePersona = (p) => `${p.firstNames} ${p.lastNames}`
const nombreOrganizacion = (o) => o.tradeName || o.legalName
const nombreProveedor = (s) => (s.person ? nombrePersona(s.person) : s.organization ? nombreOrganizacion(s.organization) : '—')

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

export default function PanelCompras() {
  const { permisos } = useAuth()
  // El gate de acceso a esta pantalla es compras:read (mismo permiso que
  // filtra el link en gruposMaestros.js) — lots:create/update siguen siendo
  // los permisos reales de las acciones puntuales (crear/reprogramar un
  // lote), igual criterio que ya usaba la vieja pantalla "Compras".
  const puedeVer = permisos.has('compras:read')
  const puedeCrear = permisos.has('lots:create')
  const puedeEditar = permisos.has('lots:update')

  const [productos, setProductos] = useState(null)
  const [productosError, setProductosError] = useState(false)
  const [proveedores, setProveedores] = useState(null)
  const [proveedoresError, setProveedoresError] = useState(false)
  const [vista, setVista] = useState({ modo: 'lista', lotId: null })
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [productoFiltro, setProductoFiltro] = useState('')
  const [proveedorFiltro, setProveedorFiltro] = useState('')
  const {
    items: lotes,
    setItems: setLotes,
    cursor,
    cargandoMas,
    errorCargarMas,
    errorCarga,
    cargarPrimeraPagina,
    cargarMas,
    detalle: loteDetalle,
    setDetalle: setLoteDetalle,
    errorDetalle,
    abrirDetalle: abrirDetalleHook,
    setConfirmacion,
  } = useCatalogoMaestro(lotsService, { puedeVer })

  const abrirDetalle = (lotId) => {
    setVista({ modo: 'detalle', lotId })
    abrirDetalleHook(lotId)
  }

  // Productos/proveedores son para resolver nombres en listado/detalle y
  // poblar los selectores del alta — independientes del listado de lotes en
  // sí, se piden en paralelo (mismo criterio que el selector de país en
  // Organizaciones).
  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    listarTodo(productsService.listar)
      .then((productos) => {
        if (!cancelado) setProductos(productos)
      })
      .catch(() => {
        if (!cancelado) setProductosError(true)
      })
    listarTodo(suppliersService.listar)
      .then((proveedores) => {
        if (!cancelado) setProveedores(proveedores)
      })
      .catch(() => {
        if (!cancelado) setProveedoresError(true)
      })
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  // Tarjetas de stats + filtro de la lista — sobre lo YA cargado (`lotes`
  // viene paginado por cursor), no una cuenta/filtro global: `GET /lots` no
  // tiene query params de filtro server-side (ver docs/lots.md §7), y
  // "cargar más" va a ir ampliando el conjunto filtrable. Aviso explícito
  // en la propia UI si todavía queda más por cargar.
  const stats = useMemo(() => {
    if (!lotes) return null
    return {
      total: lotes.length,
      enRecepcion: lotes.filter((l) => l.currentStatus === 'EN_RECEPCION').length,
      aceptados: lotes.filter((l) => l.currentStatus === 'ACEPTADO_RECEPCION').length,
      rechazados: lotes.filter((l) => l.currentStatus === 'RECHAZADO').length,
    }
  }, [lotes])

  const lotesFiltrados = useMemo(() => {
    if (!lotes) return null
    const q = busqueda.trim().toLowerCase()
    return lotes
      .filter((l) => {
        if (estadoFiltro && l.currentStatus !== estadoFiltro) return false
        if (productoFiltro && l.productId !== productoFiltro) return false
        if (proveedorFiltro && l.supplierId !== proveedorFiltro) return false
        if (q) {
          const nombreProd = productos?.find((p) => p.id === l.productId)?.name?.toLowerCase() ?? ''
          if (!l.code.toLowerCase().includes(q) && !nombreProd.includes(q)) return false
        }
        return true
      })
      .sort(compararPorFechaRecepcion)
  }, [lotes, busqueda, estadoFiltro, productoFiltro, proveedorFiltro, productos])

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Compras." />
  }

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const proveedorNombre = (id) => {
    const s = proveedores?.find((p) => p.id === id)
    return s ? nombreProveedor(s) : '—'
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ShoppingCart className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Compras</h1>
          <p className="text-sm text-marron-cafe/60">Emisión de lotes de materia prima y trazabilidad de producto terminado.</p>
        </div>
      </header>

      {vista.modo === 'lista' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-marron-cafe">
              Listado{' '}
              {lotes && <span className="text-sm font-medium text-marron-cafe/40">{lotes.length}</span>}
            </h2>
            {puedeCrear && (
              <Button className="px-4 py-2 text-sm" onClick={() => setVista({ modo: 'crear', lotId: null })}>
                + Agregar lote
              </Button>
            )}
          </div>

          {errorCarga ? (
            <ErrorBanner
              mensaje={`No se pudo cargar el listado: ${errorCarga}`}
              onReintentar={cargarPrimeraPagina}
            />
          ) : lotes === null ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-64" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard Icon={Truck} tono="alerta" valor={stats.enRecepcion} etiqueta="En recepción" />
                <StatCard Icon={Leaf} tono="positivo" valor={stats.aceptados} etiqueta="Aceptados" />
                <StatCard Icon={XCircle} tono="negativo" valor={stats.rechazados} etiqueta="Rechazados" />
              </div>
              {cursor && (
                <p className="text-xs text-marron-cafe/40">
                  Las tarjetas y el filtro solo cuentan los {lotes.length} lotes ya cargados — usá "Cargar más" para
                  ampliar el conjunto.
                </p>
              )}

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
                    </tr>
                  </thead>
                  <tbody>
                    {lotesFiltrados.map((l) => (
                      <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => abrirDetalle(l.id)} className="flex flex-col gap-0.5 text-left">
                            <span className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</span>
                            <span className="rounded-full bg-marron-tierra/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-marron-cafe/60 uppercase w-fit">
                              {NATURE_LABEL[l.nature] ?? l.nature}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-marron-cafe">{productoNombre(l.productId)}</td>
                        <td className="px-4 py-3 text-marron-cafe">{l.nature === 'PM' ? proveedorNombre(l.supplierId) : '—'}</td>
                        <td className="px-4 py-3 text-marron-cafe">
                          {l.nature === 'PM' && l.scheduledReceptionAt ? formatearFechaHora(l.scheduledReceptionAt) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tono={TONO_ESTADO_LOTE[l.currentStatus] ?? 'neutro'}>{l.currentStatus.replace(/_/g, ' ')}</Badge>
                        </td>
                      </tr>
                    ))}
                    {lotesFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                          {lotes.length === 0 ? 'No hay lotes cargados todavía.' : 'Ningún lote coincide con el filtro.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {errorCargarMas && (
                <p className="text-center text-xs font-medium text-rojo-pasankalla">
                  No se pudo cargar más: {errorCargarMas}
                </p>
              )}

              {cursor && (
                <Button
                  variant="secondary"
                  className="self-center px-4 py-2 text-sm"
                  disabled={cargandoMas}
                  onClick={cargarMas}
                >
                  {cargandoMas ? 'Cargando…' : errorCargarMas ? 'Reintentar' : 'Cargar más'}
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {vista.modo === 'detalle' && (
        <section className="flex flex-col gap-5 rounded-3xl bg-marron-tierra/5 p-6">
          <button
            type="button"
            onClick={() => setVista({ modo: 'lista', lotId: null })}
            className="flex items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            Volver al listado
          </button>

          {errorDetalle ? (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar: {errorDetalle}</p>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => abrirDetalle(vista.lotId)}>
                Reintentar
              </Button>
            </div>
          ) : loteDetalle === null ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-28" />
              </div>
              <Skeleton className="h-7 w-52" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-marron-tierra/10 px-3 py-1 font-mono text-xs font-semibold text-marron-cafe/70">
                  {loteDetalle.code}
                </span>
                <span className="rounded-full bg-marron-tierra/10 px-3 py-1 text-xs font-semibold text-marron-cafe/60">
                  {NATURE_LABEL[loteDetalle.nature] ?? loteDetalle.nature}
                </span>
                {/* currentStatus: solo lectura siempre — no hay ningún
                    endpoint que lo cambie (ver docs/lots.md §9), mostrarlo
                    como si fuera editable sería mentir sobre lo que esta
                    pantalla puede hacer. */}
                <span className="rounded-full bg-verde-hoja/15 px-3 py-1 text-xs font-semibold text-verde-bosque">
                  {loteDetalle.currentStatus.replace(/_/g, ' ')}
                </span>
              </div>

              <h2 className="text-xl font-bold text-marron-cafe">{productoNombre(loteDetalle.productId)}</h2>

              {loteDetalle.nature === 'PM' && (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Proveedor</dt>
                    <dd className="text-sm text-marron-cafe">{proveedorNombre(loteDetalle.supplierId)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
                      Llegada programada
                    </dt>
                    <dd className="text-sm text-marron-cafe">
                      {loteDetalle.scheduledReceptionAt ? formatearFechaHora(loteDetalle.scheduledReceptionAt) : '—'}
                    </dd>
                  </div>
                </dl>
              )}

              {/* Reprogramar solo existe para PM en PROGRAMADO — el backend
                  rechaza cualquier otro caso con 409 (ver lots.service.ts,
                  update()). Ocultar el botón en vez de dejarlo y que falle
                  evita un viaje al servidor solo para enterarse de algo que
                  ya se sabía acá. */}
              {puedeEditar && loteDetalle.nature === 'PM' && loteDetalle.currentStatus === 'PROGRAMADO' && (
                <Button
                  className="self-start px-4 py-2 text-sm"
                  onClick={() => setVista({ modo: 'editar', lotId: loteDetalle.id })}
                >
                  Reprogramar
                </Button>
              )}
              {puedeEditar && loteDetalle.nature === 'PM' && loteDetalle.currentStatus !== 'PROGRAMADO' && (
                <p className="text-xs text-marron-cafe/50">
                  Ya no se puede reprogramar — el lote avanzó más allá de PROGRAMADO.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {vista.modo === 'crear' && (
        <FormularioAltaLote
          productos={productos}
          productosError={productosError}
          proveedores={proveedores}
          proveedoresError={proveedoresError}
          onCancelar={() => setVista({ modo: 'lista', lotId: null })}
          onGuardado={(lote) => {
            cargarPrimeraPagina()
            setVista({ modo: 'lista', lotId: null })
            setConfirmacion(`Lote "${lote.code}" creado.`)
          }}
        />
      )}

      {vista.modo === 'editar' && loteDetalle && (
        <FormularioReprogramarLote
          lote={loteDetalle}
          proveedores={proveedores}
          proveedoresError={proveedoresError}
          onCancelar={() => setVista({ modo: 'detalle', lotId: loteDetalle.id })}
          onGuardado={(lote) => {
            setLoteDetalle(lote)
            setLotes((prev) => prev?.map((l) => (l.id === lote.id ? lote : l)) ?? prev)
            setVista({ modo: 'detalle', lotId: lote.id })
            setConfirmacion(`Lote "${lote.code}" reprogramado.`)
          }}
        />
      )}
    </main>
  )
}

// Alta: solo materia prima (PM) — la opción de producto terminado se
// sacó de esta pantalla a pedido de negocio, así que `nature` queda fijo
// y proveedor/fecha son siempre obligatorios (createLotSchema los exige
// para todo PM, ver lot.dto.ts, superRefine).
function FormularioAltaLote({ productos, productosError, proveedores, proveedoresError, onCancelar, onGuardado }) {
  const nature = 'PM'
  const [productId, setProductId] = useState('')
  const [productIdTocado, setProductIdTocado] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [supplierIdTocado, setSupplierIdTocado] = useState(false)
  const [fechaHora, setFechaHora] = useState('')
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const productIdValido = productId !== ''
  const puedeGuardar = productIdValido && supplierId !== '' && fechaHora !== ''

  const submit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    try {
      const guardado = await ejecutar(() =>
        lotsService.crear({
          nature,
          productId,
          supplierId,
          // Regla de proyecto: instantes van en UTC ISO 8601 terminado en
          // Z. new Date(valorLocal) interpreta el string de datetime-local
          // (sin offset) como hora LOCAL del navegador; toISOString() lo
          // pasa a UTC — es la conversión que pide la subtarea.
          scheduledReceptionAt: new Date(fechaHora).toISOString(),
        }),
      )
      onGuardado(guardado)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error` (incluye 404 si
      // producto/proveedor no existen, y 409 si el code choca por carrera).
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">Nuevo lote</h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <FormSelect
            label="Producto"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value)
              setProductIdTocado(true)
            }}
            onBlur={() => setProductIdTocado(true)}
            hint={
              productosError
                ? 'No se pudo cargar el catálogo de productos.'
                : productos === null
                  ? 'Cargando productos…'
                  : productos.length === 0
                    ? 'No hay productos cargados todavía.'
                    : undefined
            }
            required
          >
            <option value="">Seleccioná un producto…</option>
            {productos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </FormSelect>
          {productIdTocado && !productIdValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Todo lote necesita un producto.</p>
          )}
        </div>

        <div className="min-w-0">
          <FormSelect
            label="Proveedor"
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value)
              setSupplierIdTocado(true)
            }}
            onBlur={() => setSupplierIdTocado(true)}
            hint={
              proveedoresError
                ? 'No se pudo cargar el catálogo de proveedores.'
                : proveedores === null
                  ? 'Cargando proveedores…'
                  : proveedores.length === 0
                    ? 'No hay proveedores cargados todavía.'
                    : undefined
            }
            required
          >
            <option value="">Seleccioná un proveedor…</option>
            {proveedores?.map((s) => (
              <option key={s.id} value={s.id}>
                {nombreProveedor(s)}
              </option>
            ))}
          </FormSelect>
          {supplierIdTocado && supplierId === '' && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">
              Todo lote de materia prima necesita un proveedor.
            </p>
          )}
        </div>

        <FormDateTimeInput
          label="Fecha y hora de llegada"
          value={fechaHora}
          onChange={setFechaHora}
          minAhora
          required
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !puedeGuardar}>
          {guardando ? 'Guardando…' : 'Crear lote'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// Reprogramar: SOLO supplierId/scheduledReceptionAt (subtarea "habilitar
// la reprogramación solo en lotes PM con estado PROGRAMADO" — el botón que
// lleva acá ya está gateado en el detalle; el backend además lo vuelve a
// exigir con 409 si algo cambió entre medio, ej. otra pestaña avanzó el
// estado). Siempre se mandan los dos campos juntos (precargados con el
// valor actual si el usuario no toca uno) — igual que el resto de los
// formularios de edición, evita depender de "al menos un campo presente"
// de forma implícita.
function FormularioReprogramarLote({ lote, proveedores, proveedoresError, onCancelar, onGuardado }) {
  const [supplierId, setSupplierId] = useState(lote.supplierId ?? '')
  const [fechaHora, setFechaHora] = useState(aInputLocal(lote.scheduledReceptionAt))
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const puedeGuardar = supplierId !== '' && fechaHora !== ''

  const submit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    try {
      const guardado = await ejecutar(() =>
        lotsService.actualizar(lote.id, {
          supplierId,
          scheduledReceptionAt: new Date(fechaHora).toISOString(),
        }),
      )
      onGuardado(guardado)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error` (incluye el 409
      // real si el lote dejó de ser PM/PROGRAMADO entre medio, y el 404 si
      // el proveedor nuevo no existe).
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">Reprogramar {lote.code}</h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <FormSelect
        label="Proveedor"
        value={supplierId}
        onChange={(e) => setSupplierId(e.target.value)}
        hint={
          proveedoresError
            ? 'No se pudo cargar el catálogo de proveedores.'
            : proveedores === null
              ? 'Cargando proveedores…'
              : undefined
        }
        required
      >
        <option value="">Seleccioná un proveedor…</option>
        {proveedores?.map((s) => (
          <option key={s.id} value={s.id}>
            {nombreProveedor(s)}
          </option>
        ))}
      </FormSelect>

      <FormDateTimeInput label="Fecha y hora de llegada" value={fechaHora} onChange={setFechaHora} minAhora required />

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !puedeGuardar}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
