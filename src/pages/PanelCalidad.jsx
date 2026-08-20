import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Truck, ClipboardList, ShieldCheck, Leaf, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { lotsService } from '../services/lotsService'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { qualityResolutionsService } from '../services/qualityResolutionsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import SearchInput from '../components/SearchInput.jsx'
import FormSelect from '../components/FormSelect.jsx'
import FormInput from '../components/FormInput.jsx'

// Calidad y Laboratorio — llena el placeholder que ya existía en el sidebar
// (mock/data/modulos.json trae `calidad` desde antes, con ícono FlaskConical
// ya cableado en moduloIcons.js; hasta hoy caía en el catch-all
// PanelModulo.jsx). Ver comrural_erp_backend/0019_business_modules_permissions.sql:
// el rol `calidad` NO tiene `lots:read` (solo `almacen`/`superadmin` lo
// tienen) — por eso esta pantalla tiene DOS caminos reales, no un modo demo:
//
//   - Con `lots:read`: la vista "Lotes de materia prima" completa (modelo
//     que mandó Milenka — tarjetas + filtros + tabla).
//   - Sin `lots:read` (rol `calidad` puro, hoy): una cola de pendientes de
//     visto bueno, armada con GET /quality-resolutions (que ya trae
//     lote/producto/proveedor embebidos, sin necesitar GET /lots).
//
// En ambos casos, la fila lleva al mismo lugar: /panel/calidad/lotes/:id
// (PanelRecepcionLote.jsx), que tiene su propio gate por
// `raw-material-receptions:read` — no depende de esta pantalla ni de
// `lots:read` tampoco.
const NATURE_LABEL_LOTE = 'Materia prima'
const TONO_ESTADO_LOTE = {
  PROGRAMADO: 'neutro',
  EN_RECEPCION: 'alerta',
  ACEPTADO_RECEPCION: 'positivo',
  EN_ANALISIS: 'alerta',
  PENDIENTE_LIBERACION: 'alerta',
  RETENIDO: 'negativo',
  LIBERADO: 'positivo',
  RECHAZADO: 'negativo',
  CANCELADO: 'neutro',
}

const TAMANIO_PAGINA = 10

export default function PanelCalidad() {
  const { permisos } = useAuth()
  const puedeVerLotes = permisos.has('lots:read')
  const puedeVerResoluciones = permisos.has('quality-resolutions:read')
  const puedeVer = puedeVerLotes || puedeVerResoluciones || permisos.has('raw-material-receptions:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Calidad y Laboratorio." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <FlaskConical className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Calidad y Laboratorio</h1>
          <p className="text-sm text-marron-cafe/60">Recepción e inspección de materia prima.</p>
        </div>
      </header>

      {puedeVerLotes ? <ListadoLotesMateriaPrima /> : <ColaPendientesVistoBueno />}
    </main>
  )
}

// --- Camino con lots:read (almacen/superadmin) -----------------------------

function ListadoLotesMateriaPrima() {
  const navigate = useNavigate()
  const { permisos } = useAuth()
  const puedeIniciarRecepcion = permisos.has('warehouse-receipts:create')
  const [lotes, setLotes] = useState(null)
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [productoId, setProductoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState('')
  const [pagina, setPagina] = useState(0)

  const hayFiltrosActivos = busqueda !== '' || estado !== '' || productoId !== '' || proveedorId !== '' || fecha !== ''
  const limpiarFiltros = () => {
    setBusqueda('')
    setEstado('')
    setProductoId('')
    setProveedorId('')
    setFecha('')
    setPagina(0)
  }

  const [resumenes, setResumenes] = useState({}) // lotId -> vista consolidada (o 'error')

  useEffect(() => {
    let cancelado = false
    Promise.all([
      lotsService.listar({ limit: 100 }),
      productsService.listar({ limit: 100 }),
      suppliersService.listar({ limit: 100 }),
    ])
      .then(([lotesResp, productosResp, proveedoresResp]) => {
        if (cancelado) return
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM'))
        setProductos(productosResp.data)
        setProveedores(proveedoresResp.data)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const proveedorNombre = (id) => {
    const s = proveedores?.find((p) => p.id === id)
    if (!s) return '—'
    return s.person ? `${s.person.firstNames} ${s.person.lastNames}` : s.organization ? s.organization.tradeName || s.organization.legalName : '—'
  }

  const filtrados = useMemo(() => {
    if (!lotes) return []
    const q = busqueda.trim().toLowerCase()
    return lotes.filter((l) => {
      if (estado && l.currentStatus !== estado) return false
      if (productoId && l.productId !== productoId) return false
      if (proveedorId && l.supplierId !== proveedorId) return false
      // scheduledReceptionAt es el único dato de fecha que trae un lote —
      // se compara solo la parte de fecha (no la hora), en hora local.
      if (fecha && (!l.scheduledReceptionAt || new Date(l.scheduledReceptionAt).toLocaleDateString('en-CA') !== fecha)) return false
      if (q && !l.code.toLowerCase().includes(q) && !productoNombre(l.productId).toLowerCase().includes(q)) return false
      return true
    })
  }, [lotes, busqueda, estado, productoId, proveedorId, fecha, productos])

  const paginados = filtrados.slice(pagina * TAMANIO_PAGINA, (pagina + 1) * TAMANIO_PAGINA)

  // Enriquecimiento acotado a la página visible (10 lotes) — no existe un
  // endpoint de listado con resumen (raw-material-receptions.md §8 lo dice
  // explícito), así que se pide la vista consolidada por lote en paralelo,
  // solo para las filas que se están mostrando. Si el volumen real crece
  // mucho, esto hay que pedírselo al backend como endpoint nuevo.
  useEffect(() => {
    let cancelado = false
    Promise.allSettled(paginados.map((l) => rawMaterialReceptionsService.obtener(l.id)))
      .then((resultados) => {
        if (cancelado) return
        setResumenes((prev) => {
          const siguiente = { ...prev }
          resultados.forEach((r, i) => {
            siguiente[paginados[i].id] = r.status === 'fulfilled' ? r.value : 'error'
          })
          return siguiente
        })
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, lotes, busqueda, estado, productoId, proveedorId])

  const stats = useMemo(() => {
    if (!lotes) return null
    const esteMes = new Date()
    const enRecepcion = lotes.filter((l) => l.currentStatus === 'EN_RECEPCION').length
    const aceptadosEsteMes = lotes.filter(
      (l) =>
        l.currentStatus === 'ACEPTADO_RECEPCION' &&
        new Date(l.updatedAt).getMonth() === esteMes.getMonth() &&
        new Date(l.updatedAt).getFullYear() === esteMes.getFullYear(),
    ).length
    const cargados = Object.values(resumenes).filter((r) => r && r !== 'error')
    const pendientesInspeccion = cargados.filter((r) => r.summary.inspectionStatus == null || r.summary.inspectionStatus === 'INICIADA').length
    const pendientesVistoBueno = cargados.filter((r) => r.summary.qualityReviewStatus === 'PENDIENTE').length
    return { enRecepcion, aceptadosEsteMes, pendientesInspeccion, pendientesVistoBueno }
  }, [lotes, resumenes])

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  if (!lotes) {
    return <p className="text-sm text-marron-cafe/50">Cargando…</p>
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard Icon={Truck} tono="positivo" valor={stats.enRecepcion} etiqueta="En recepción" />
        <StatCard Icon={ClipboardList} tono="alerta" valor={`${stats.pendientesInspeccion}+`} etiqueta="Pendientes de inspección (página)" />
        <StatCard Icon={ShieldCheck} tono="info" valor={`${stats.pendientesVistoBueno}+`} etiqueta="Pendientes de visto bueno (página)" />
        <StatCard Icon={Leaf} tono="positivo" valor={stats.aceptadosEsteMes} etiqueta="Aceptados este mes" />
      </div>
      <p className="text-xs text-marron-cafe/40">
        "Pendientes de inspección" y "de visto bueno" cuentan solo los lotes ya cargados en esta página — no hay un
        conteo global porque el backend no expone un endpoint de agregados para esto todavía.
      </p>

      <div className="grid gap-3 rounded-2xl bg-marron-tierra/5 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <SearchInput
          label="Buscar"
          placeholder="Código o producto…"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setPagina(0)
          }}
        />
        <FormSelect
          label="Estado"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value)
            setPagina(0)
          }}
        >
          <option value="">Todos</option>
          {Object.keys(TONO_ESTADO_LOTE).map((e) => (
            <option key={e} value={e}>
              {e.replace(/_/g, ' ')}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          label="Producto"
          value={productoId}
          onChange={(e) => {
            setProductoId(e.target.value)
            setPagina(0)
          }}
        >
          <option value="">Todos</option>
          {productos?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          label="Proveedor"
          value={proveedorId}
          onChange={(e) => {
            setProveedorId(e.target.value)
            setPagina(0)
          }}
        >
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
          onChange={(e) => {
            setFecha(e.target.value)
            setPagina(0)
          }}
        />
        <div className="flex items-end">
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

      <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-marron-tierra/10 text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Recepción</th>
              <th className="px-4 py-3">Inspección</th>
              <th className="px-4 py-3">Resolución</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginados.map((l) => {
              const resumen = resumenes[l.id]
              return (
                <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</td>
                  <td className="px-4 py-3 text-marron-cafe">{productoNombre(l.productId)}</td>
                  <td className="px-4 py-3 text-marron-cafe">{proveedorNombre(l.supplierId)}</td>
                  <td className="px-4 py-3">
                    {resumen === 'error' ? (
                      <span className="text-xs text-marron-cafe/40">—</span>
                    ) : resumen ? (
                      resumen.warehouseReceipt ? (
                        <Badge tono={resumen.warehouseReceipt.status === 'FINALIZADA' ? 'positivo' : 'alerta'}>
                          {resumen.warehouseReceipt.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-marron-cafe/50">Recepción: No iniciada</span>
                      )
                    ) : (
                      <span className="text-xs text-marron-cafe/40">Cargando…</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {resumen === 'error' ? (
                      <span className="text-xs text-marron-cafe/40">—</span>
                    ) : resumen ? (
                      <Badge tono={resumen.summary.inspectionStatus === 'FINALIZADA' ? 'positivo' : 'alerta'}>
                        {resumen.summary.inspectionStatus ?? 'SIN INICIAR'}
                      </Badge>
                    ) : (
                      <span className="text-xs text-marron-cafe/40">Cargando…</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {resumen === 'error' ? (
                      <span className="text-xs text-marron-cafe/40">—</span>
                    ) : resumen?.summary.qualityDecision ? (
                      <Badge tono={resumen.summary.qualityDecision === 'APROBADA' ? 'positivo' : 'negativo'}>
                        {resumen.summary.qualityDecision}
                      </Badge>
                    ) : (
                      <span className="text-xs text-marron-cafe/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tono={TONO_ESTADO_LOTE[l.currentStatus] ?? 'neutro'}>{l.currentStatus.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {/* Acción contextual (ticket FE·F2·M3): el verbo cambia
                        según en qué paso está el lote — "Iniciar recepción"
                        si nadie la arrancó todavía, "Continuar" si hay una
                        inspección en curso (INICIADA, sin finalizar), "Ver
                        detalle" en cualquier otro caso — las tres llevan a
                        la misma pantalla, que ya sabe qué mostrar. */}
                    <Button
                      variant={
                        resumen && resumen !== 'error' && !resumen.warehouseReceipt && puedeIniciarRecepcion ? 'primary' : 'secondary'
                      }
                      className="px-3 py-1.5 text-xs"
                      onClick={() => navigate(`/panel/calidad/lotes/${l.id}`)}
                    >
                      {resumen && resumen !== 'error' && !resumen.warehouseReceipt && puedeIniciarRecepcion
                        ? 'Iniciar recepción'
                        : resumen && resumen !== 'error' && resumen.summary.inspectionStatus === 'INICIADA'
                          ? 'Continuar'
                          : 'Ver detalle'}
                    </Button>
                  </td>
                </tr>
              )
            })}
            {paginados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                  No hay lotes de materia prima que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-marron-cafe/60">
        <span>
          Mostrando {paginados.length === 0 ? 0 : pagina * TAMANIO_PAGINA + 1}–{pagina * TAMANIO_PAGINA + paginados.length} de{' '}
          {filtrados.length} lotes
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Button>
          {Array.from({ length: Math.max(1, Math.ceil(filtrados.length / TAMANIO_PAGINA)) }, (_, i) => i).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPagina(p)}
              aria-current={p === pagina ? 'page' : undefined}
              className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-150 ${
                p === pagina ? 'bg-verde-lima text-marron-cafe' : 'text-marron-cafe/60 hover:bg-marron-tierra/10'
              }`}
            >
              {p + 1}
            </button>
          ))}
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={(pagina + 1) * TAMANIO_PAGINA >= filtrados.length}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </>
  )
}

// --- Camino sin lots:read (rol calidad puro) -------------------------------

function ColaPendientesVistoBueno() {
  const navigate = useNavigate()
  const [resoluciones, setResoluciones] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  useEffect(() => {
    let cancelado = false
    qualityResolutionsService
      .listar({ limit: 50, reviewStatus: 'PENDIENTE' })
      .then((resp) => !cancelado && setResoluciones(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }
  if (!resoluciones) {
    return <p className="text-sm text-marron-cafe/50">Cargando…</p>
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-marron-cafe">Pendientes de visto bueno</h2>
      <p className="text-xs text-marron-cafe/40">
        Tu rol no tiene acceso al listado completo de lotes — esta cola sale de tus resoluciones de Calidad
        pendientes de aprobación.
      </p>
      <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
        {resoluciones.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0"
          >
            <span className="font-mono text-xs font-semibold text-marron-cafe/70">{r.lot.code}</span>
            <span className="text-sm text-marron-cafe">{r.product.name}</span>
            <span className="text-sm text-marron-cafe/60">{r.supplier?.name ?? '—'}</span>
            <Badge tono={r.decision === 'APROBADA' ? 'positivo' : 'negativo'}>{r.decision}</Badge>
            <Button
              variant="secondary"
              className="ml-auto px-3 py-1.5 text-xs"
              onClick={() => navigate(`/panel/calidad/lotes/${r.lot.id}/aprobacion`)}
            >
              Revisar
            </Button>
          </div>
        ))}
        {resoluciones.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">No hay resoluciones pendientes de tu visto bueno.</p>
        )}
      </div>
    </section>
  )
}
