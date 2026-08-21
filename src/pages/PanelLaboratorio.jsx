import { useEffect, useMemo, useState } from 'react'
import { TestTubes, ListChecks, Activity, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { lotsService } from '../services/lotsService'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { analysisRequestsService } from '../services/analysisRequestsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Badge from '../components/Badge.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import FormularioSolicitudAnalisis from '../components/calidad/FormularioSolicitudAnalisis.jsx'

// Laboratorio — hermana de Calidad (ver config/gruposMaestros.js, mismo
// mecanismo de pastillas de ruta que ya usa Compras para Personas/
// Organizaciones/...). Antes estas dos pestañas vivían mezcladas dentro de
// PanelCalidad.jsx bajo pastillas locales — se separan en pantalla propia
// porque son, en la práctica, dos roles funcionales distintos: Calidad
// inspecciona/resuelve la recepción, Laboratorio muestrea y pide análisis.
const PESTAÑAS_LABORATORIO = [
  { id: 'muestras', nombre: 'Muestras', Icon: TestTubes },
  { id: 'solicitudes', nombre: 'Solicitudes', Icon: ListChecks },
  { id: 'actividad', nombre: 'Actividad', Icon: Activity },
]

// Solo lotes en ACEPTADO_RECEPCION pueden tener una muestra nueva — el
// backend lo valida con 409 en cualquier otro estado (SamplesService.create,
// ver comrural_erp_backend/src/laboratory/samples/services/samples.service.ts).
// El listado de la pestaña Muestras se filtra a lo mismo de entrada, para no
// mostrar lotes que el formulario de la solicitud va a rechazar apenas se
// intente.
const ESTADO_HABILITA_MUESTREO = 'ACEPTADO_RECEPCION'

export default function PanelLaboratorio() {
  const { permisos } = useAuth()
  // samples:read es el permiso técnico real de este módulo (no calidad:read,
  // que solo gatea visibilidad de sidebar) — mismo criterio que la pestaña
  // "Lotes" de Compras se gatea con lots:read.
  const puedeVer = permisos.has('samples:read')

  const [pestaña, setPestaña] = useState('muestras')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Laboratorio." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <TestTubes className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Laboratorio</h1>
          <p className="text-sm text-marron-cafe/60">Muestreo y solicitudes de análisis de materia prima.</p>
        </div>
      </header>

      <PillTabs pestañas={PESTAÑAS_LABORATORIO} activa={pestaña} onCambiar={setPestaña} />

      {pestaña === 'muestras' && <SeccionMuestras />}

      {pestaña === 'solicitudes' && <SeccionSolicitudesPorLote />}

      {pestaña === 'actividad' && (
        <p className="rounded-3xl bg-marron-tierra/5 px-4 py-10 text-center text-sm text-marron-cafe/50">
          Todavía no hay una bitácora de actividad de Laboratorio en el backend.
        </p>
      )}
    </main>
  )
}

// --- Pestaña Muestras (tomar muestra + pedir análisis) ---------------------
//
// Vista local con dos pantallas, mismo criterio que pantalla.vista en
// PanelAlmacen.jsx: 'lista' (lotes candidatos a muestreo) y 'formulario'
// (FormularioSolicitudAnalisis.jsx, que arma la muestra + la solicitud de
// análisis reales contra el backend).
function SeccionMuestras() {
  const [lotes, setLotes] = useState(null)
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [loteSeleccionado, setLoteSeleccionado] = useState(null)

  useEffect(() => {
    let cancelado = false
    Promise.all([
      lotsService.listar({ limit: 100 }),
      productsService.listar({ limit: 100 }),
      suppliersService.listar({ limit: 100 }),
    ])
      .then(([lotesResp, productosResp, proveedoresResp]) => {
        if (cancelado) return
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM' && l.currentStatus === ESTADO_HABILITA_MUESTREO))
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

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  if (loteSeleccionado) {
    return (
      <FormularioSolicitudAnalisis
        lote={loteSeleccionado}
        productoNombre={productoNombre(loteSeleccionado.productId)}
        proveedorNombre={proveedorNombre(loteSeleccionado.supplierId)}
        onVolver={() => setLoteSeleccionado(null)}
      />
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Lotes disponibles para muestreo</h2>
        <p className="text-xs text-marron-cafe/40">
          Solo lotes con la recepción ya aceptada por Calidad — es el único estado en que el backend permite tomar
          una muestra nueva.
        </p>
      </div>
      {lotes === null ? (
        <p className="text-sm text-marron-cafe/50">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
          {lotes.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLoteSeleccionado(l)}
              className="flex w-full flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-marron-tierra/10"
            >
              <span className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</span>
              <span className="text-sm text-marron-cafe">{productoNombre(l.productId)}</span>
              <span className="text-sm text-marron-cafe/60">{proveedorNombre(l.supplierId)}</span>
              <ChevronRight className="ml-auto size-4 shrink-0 text-marron-cafe/30" strokeWidth={2} />
            </button>
          ))}
          {lotes.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">
              No hay lotes con la recepción aceptada esperando muestreo.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

// --- Pestaña Solicitudes (muestras ya pedidas, agrupadas por lote) ---------
//
// GET /analysis-requests ya trae lote/producto/proveedor/muestra embebidos
// por fila (AnalysisRequestListItem, ver analysis-requests.service.ts) — se
// pide una sola vez y se agrupa acá del lado del cliente por lot.id, no hace
// falta un endpoint de agregación aparte para esto.
const TONO_ESTADO_SOLICITUD = {
  PENDIENTE_MUESTRA: 'alerta',
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  ANALIZADA: 'positivo',
  RECHAZADA: 'negativo',
}

function SeccionSolicitudesPorLote() {
  const [solicitudes, setSolicitudes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  useEffect(() => {
    let cancelado = false
    analysisRequestsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setSolicitudes(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const porLote = useMemo(() => {
    if (!solicitudes) return []
    const mapa = new Map()
    for (const s of solicitudes) {
      if (!mapa.has(s.lot.id)) mapa.set(s.lot.id, { lot: s.lot, product: s.product, supplier: s.supplier, items: [] })
      mapa.get(s.lot.id).items.push(s)
    }
    return Array.from(mapa.values())
  }, [solicitudes])

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  if (solicitudes === null) {
    return <p className="text-sm text-marron-cafe/50">Cargando…</p>
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Solicitudes de análisis, por lote</h2>
        <p className="text-xs text-marron-cafe/40">Cada lote puede tener varias muestras — se agrupan acá.</p>
      </div>

      {porLote.length === 0 && (
        <p className="rounded-3xl bg-marron-tierra/5 px-4 py-10 text-center text-sm text-marron-cafe/50">
          Todavía no se pidió ningún análisis.
        </p>
      )}

      {porLote.map(({ lot, product, supplier, items }) => (
        <div key={lot.id} className="flex flex-col gap-2 rounded-3xl bg-marron-tierra/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-marron-cafe/70">{lot.code}</span>
            <span className="text-sm font-semibold text-marron-cafe">{product.name}</span>
            <span className="text-sm text-marron-cafe/60">{supplier?.name ?? '—'}</span>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white/60">
            {items.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3 last:border-b-0"
              >
                <span className="font-mono text-xs text-marron-cafe/70">{s.sample.code}</span>
                <span className="text-xs text-marron-cafe/60">
                  {s.itemCount} ensayo{s.itemCount === 1 ? '' : 's'}
                </span>
                <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
                {s.wasReclassified && (
                  <span className="text-xs text-marron-arcilla" title="Se pidió Express pero se reclasificó a Regular por cupo">
                    reclasificada
                  </span>
                )}
                <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'neutro'} className="ml-auto">
                  {s.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
