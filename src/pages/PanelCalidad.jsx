import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, FlaskConical, Truck, ClipboardList, ShieldCheck, Leaf } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { lotsService } from '../services/lotsService'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { qualityResolutionsService } from '../services/qualityResolutionsService'
import { compararPorFechaRecepcion } from '../utils/fecha'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import Skeleton from '../components/Skeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SearchInput from '../components/SearchInput.jsx'

// Calidad — Inicio del área: solo analytics, sin tabla ni acciones. La
// tabla de trabajo del día a día (lotes + su formulario de inspección) es
// su propia pantalla con submenú propio en el sidebar — "Inspección" (ver
// config/gruposMaestros.js y PanelCalidadRecepcion.jsx), mismo mecanismo
// que ya tiene Compras con Personas/Organizaciones/Proveedores/Productos/
// Lotes. Se llama "Inspección" y no "Recepción/Inspección" — la Recepción
// es tarea de Almacén, tiene su propia subpestaña ahí (ver el grupo
// `almacen` en gruposMaestros.js). "Muestras" (SeccionMuestras.jsx, el
// mismo componente que usa PanelLaboratorio.jsx) es otro sub-item más del
// mismo submenú — no vive acá adentro, ver PanelCalidadMuestras.jsx.
//
// Ver comrural_erp_backend/0019_business_modules_permissions.sql: el rol
// `calidad` NO tiene `lots:read` (solo `almacen`/`superadmin` lo tienen) —
// por eso esta pantalla tiene DOS caminos reales, no un modo demo:
//   - Con `lots:read`: este Inicio con analytics, más el submenú del
//     sidebar hacia Inspección/Remito/Muestras.
//   - Sin `lots:read` (rol `calidad` puro, hoy): una cola de pendientes de
//     visto bueno, armada con GET /quality-resolutions (que ya trae
//     lote/producto/proveedor embebidos, sin necesitar GET /lots) — sin
//     submenú, es una sola cola de trabajo.
export default function PanelCalidad() {
  const { permisos } = useAuth()
  const puedeVerLotes = permisos.has('lots:read')
  const puedeVerResoluciones = permisos.has('quality-resolutions:read')
  const puedeVer = puedeVerLotes || puedeVerResoluciones || permisos.has('raw-material-receptions:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Calidad." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <FlaskConical className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Calidad</h1>
          <p className="text-sm text-marron-cafe/60">Recepción e inspección de materia prima.</p>
        </div>
      </header>

      {puedeVerLotes ? <InicioCalidad /> : <ColaPendientesVistoBueno />}
    </main>
  )
}

// --- Inicio (con lots:read) — analytics del módulo -------------------------

function InicioCalidad() {
  const [lotes, setLotes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [resumenes, setResumenes] = useState({})

  useEffect(() => {
    let cancelado = false
    lotsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setLotes(resp.data.filter((l) => l.nature === 'PM')))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  // Igual que la pantalla de trabajo (PanelCalidadRecepcion.jsx): sin
  // endpoint de agregados, se pide la vista consolidada de CADA lote PM
  // para poder contar pendientes de inspección/visto bueno de verdad.
  // Acotado porque el volumen hoy es chico (decenas, no miles) — si crece,
  // esto necesita un endpoint de agregados del backend.
  useEffect(() => {
    if (!lotes || lotes.length === 0) return
    let cancelado = false
    Promise.allSettled(lotes.map((l) => rawMaterialReceptionsService.obtener(l.id))).then((resultados) => {
      if (cancelado) return
      const siguiente = {}
      resultados.forEach((r, i) => {
        siguiente[lotes[i].id] = r.status === 'fulfilled' ? r.value : 'error'
      })
      setResumenes(siguiente)
    })
    return () => {
      cancelado = true
    }
  }, [lotes])

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
    const pendientesInspeccion = cargados.filter(
      (r) => r.summary.inspectionStatus == null || r.summary.inspectionStatus === 'INICIADA',
    ).length
    const pendientesVistoBueno = cargados.filter((r) => r.summary.qualityReviewStatus === 'PENDIENTE').length
    return { enRecepcion, aceptadosEsteMes, pendientesInspeccion, pendientesVistoBueno }
  }, [lotes, resumenes])

  // Preview de "Pendientes de inspección" — mismos lotes que ya cuenta
  // stats.pendientesInspeccion, sin pedir nada nuevo al backend. Los
  // primeros 5 por fecha de llegada más próxima, mismo criterio de orden
  // que la tabla de "Inspección".
  const resumenesCargando = (lotes ?? []).length > 0 && Object.keys(resumenes).length < lotes.length
  const pendientesInspeccion = useMemo(() => {
    if (!lotes) return []
    return lotes
      .filter((l) => {
        const r = resumenes[l.id]
        if (!r || r === 'error') return false
        return r.summary.inspectionStatus == null || r.summary.inspectionStatus === 'INICIADA'
      })
      .sort(compararPorFechaRecepcion)
      .slice(0, 5)
  }, [lotes, resumenes])

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }
  if (!lotes || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard Icon={Truck} tono="positivo" valor={stats.enRecepcion} etiqueta="En recepción" />
        <StatCard Icon={ClipboardList} tono="alerta" valor={`${stats.pendientesInspeccion}+`} etiqueta="Pendientes de inspección" />
        <StatCard Icon={ShieldCheck} tono="info" valor={`${stats.pendientesVistoBueno}+`} etiqueta="Pendientes de visto bueno" />
        <StatCard Icon={Leaf} tono="positivo" valor={stats.aceptadosEsteMes} etiqueta="Aceptados este mes" />
      </div>
      <p className="text-xs text-marron-cafe/40">
        Cuenta todos los lotes de materia prima cargados hoy — no hay un endpoint de agregados en el backend todavía,
        así que en volumen muy alto esto va a necesitar pedírselo. El detalle por lote está en "Inspección", en el
        menú lateral.
      </p>

      <div className="mt-3 flex flex-col gap-3 rounded-3xl bg-marron-tierra/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-extrabold text-marron-cafe">Pendientes de inspección</h2>
          <Link
            to="/panel/calidad/inspeccion"
            className="flex items-center gap-1 text-sm font-medium text-verde-bosque hover:text-verde-hoja"
          >
            Ver todos
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </Link>
        </div>

        {resumenesCargando ? (
          <Skeleton className="h-32" />
        ) : pendientesInspeccion.length === 0 ? (
          <EmptyState Icon={ClipboardList} titulo="No hay lotes pendientes de inspección" />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white/70">
            {pendientesInspeccion.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3 last:border-b-0"
              >
                <span className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</span>
                <span className="text-sm text-marron-cafe/60">
                  {l.scheduledReceptionAt
                    ? new Date(l.scheduledReceptionAt).toLocaleDateString('es-BO', { dateStyle: 'medium' })
                    : 'Sin fecha programada'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Camino sin lots:read (rol calidad puro) -------------------------------

function ColaPendientesVistoBueno() {
  const navigate = useNavigate()
  const [resoluciones, setResoluciones] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [busqueda, setBusqueda] = useState('')

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
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-52" />
        <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Sin endpoint de búsqueda por texto (GET /quality-resolutions no lo
  // tiene) — se filtra en el cliente sobre los 50 ya cargados, mismo
  // criterio que BuscadorPersona/BuscadorOrganizacion en PanelProveedores.jsx.
  const q = busqueda.trim().toLowerCase()
  const filtradas = q
    ? resoluciones.filter((r) =>
        `${r.lot.code} ${r.product.name} ${r.supplier?.name ?? ''}`.toLowerCase().includes(q),
      )
    : resoluciones

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-marron-cafe">Pendientes de visto bueno</h2>
      <p className="text-xs text-marron-cafe/40">
        Tu rol no tiene acceso al listado completo de lotes — esta cola sale de tus resoluciones de Calidad
        pendientes de aprobación.
      </p>

      {resoluciones.length > 0 && (
        <SearchInput
          label="Buscar"
          placeholder="Lote, producto o proveedor…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      )}

      {resoluciones.length === 0 ? (
        <EmptyState Icon={ShieldCheck} titulo="No hay resoluciones pendientes de tu visto bueno" />
      ) : (
        <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
          {filtradas.map((r) => (
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
          {filtradas.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">Ninguna coincide con la búsqueda.</p>
          )}
        </div>
      )}
    </section>
  )
}
