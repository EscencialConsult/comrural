import { useEffect, useMemo, useState } from 'react'
import { Plus, ClipboardCheck, CheckCircle2 } from 'lucide-react'
import { lotsService } from '../../services/lotsService'
import { productsService } from '../../services/productsService'
import { controlProcesoAService } from '../../services/controlProcesoAService'
import { useAuth } from '../../context/AuthContext.jsx'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'
import ModalCrearControlProceso from './ModalCrearControlProceso.jsx'
import ModalDetalleControlProceso from './ModalDetalleControlProceso.jsx'

// Lotes en ACEPTADO_RECEPCION o LAVADO son candidatos — mismo criterio que
// SeccionMuestras.jsx (ver comrural_erp_backend/docs/control-proceso-a.md
// §1: sin FK hacia production-area-a, se relacionan solo por lote/turno/
// fecha compartidos, así que Calidad puede cargar su control mientras
// Producción sigue lavando el mismo lote en otros turnos).
const ESTADOS_CANDIDATOS = ['ACEPTADO_RECEPCION', 'LAVADO']

// Pestaña "Control de Proceso" de Calidad (control-proceso-a) — mismo
// patrón que SeccionMuestras.jsx: se listan los lotes PM candidatos y, para
// los que ya tienen controles cargados, se muestran agrupados por lote.
export default function SeccionControlProceso() {
  const { permisos } = useAuth()
  const puedeAprobar = permisos.has('control-proceso-a:approve')

  const [lotes, setLotes] = useState(null)
  const [productos, setProductos] = useState(null)
  const [controlesPorLote, setControlesPorLote] = useState({})
  const [errorCarga, setErrorCarga] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [detalleDe, setDetalleDe] = useState(null) // control | null — resumen antes de dar vobo

  useEffect(() => {
    let cancelado = false
    Promise.all([lotsService.listar({ limit: 100 }), productsService.listar({ limit: 100 })])
      .then(([lotesResp, productosResp]) => {
        if (cancelado) return
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM'))
        setProductos(productosResp.data)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!lotes || lotes.length === 0) return
    let cancelado = false
    Promise.allSettled(lotes.map((l) => controlProcesoAService.listarPorLote(l.id))).then((resultados) => {
      if (cancelado) return
      const siguiente = {}
      resultados.forEach((r, i) => {
        siguiente[lotes[i].id] = r.status === 'fulfilled' ? r.value : 'error'
      })
      setControlesPorLote(siguiente)
    })
    return () => {
      cancelado = true
    }
  }, [lotes])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  const lotesCandidatos = useMemo(
    () => (lotes ?? []).filter((l) => ESTADOS_CANDIDATOS.includes(l.currentStatus)),
    [lotes],
  )

  const lotesConControles = useMemo(
    () =>
      (lotes ?? [])
        .map((l) => ({ lote: l, controles: controlesPorLote[l.id] }))
        .filter(({ controles }) => Array.isArray(controles) && controles.length > 0),
    [lotes, controlesPorLote],
  )

  const alCrear = (creado) => {
    setControlesPorLote((prev) => ({
      ...prev,
      [creado.lotId]: [creado, ...(Array.isArray(prev[creado.lotId]) ? prev[creado.lotId] : [])],
    }))
  }

  const alRegistrarVobo = (actualizado) => {
    setControlesPorLote((prev) => ({
      ...prev,
      [actualizado.lotId]: prev[actualizado.lotId].map((c) => (c.id === actualizado.id ? actualizado : c)),
    }))
  }

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-marron-cafe">Control de Proceso — Área A</h2>
          <p className="text-xs text-marron-cafe/40">
            Control de calidad sobre el lavado de Área A (impurezas, pureza, tamaño de grano, conformidad).
          </p>
        </div>
        <Button className="gap-1.5 px-4 py-2 text-sm" onClick={() => setModalAbierto(true)} disabled={lotes === null}>
          <Plus className="size-4" strokeWidth={2} />
          Nuevo control
        </Button>
      </div>

      {lotes === null ? (
        <div className="flex flex-col gap-2 rounded-3xl bg-marron-tierra/5 p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16" />
        </div>
      ) : lotesConControles.length === 0 ? (
        <EmptyState Icon={ClipboardCheck} titulo="Todavía no se cargó ningún control de proceso" />
      ) : (
        lotesConControles.map(({ lote, controles }) => (
          <div key={lote.id} className="flex flex-col gap-2 rounded-3xl bg-marron-tierra/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-marron-cafe/70">{lote.code}</span>
              <span className="text-sm font-semibold text-marron-cafe">{productoNombre(lote.productId)}</span>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white/60">
              {controles.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDetalleDe(c)}
                  className="flex w-full flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-marron-tierra/10"
                >
                  <span className="text-xs text-marron-cafe/60">{c.entryDate}</span>
                  <span className="text-xs text-marron-cafe/60">Pureza: {c.purezaPct.toFixed(2)}%</span>
                  <span className="text-xs text-marron-cafe/60">
                    No conformes: {c.palletsNoConformes} pallets / {c.sacosNoConformes} sacos
                  </span>
                  {c.voboEn ? (
                    <Badge tono="positivo" className="ml-auto inline-flex items-center gap-1">
                      <CheckCircle2 className="size-3" strokeWidth={2.5} />
                      Con visto bueno
                    </Badge>
                  ) : (
                    <Badge tono="alerta" className="ml-auto">
                      {puedeAprobar ? 'Ver y dar visto bueno' : 'Pendiente de visto bueno'}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      <ModalCrearControlProceso
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        lotes={lotesCandidatos}
        productoNombre={productoNombre}
        onCreada={alCrear}
      />

      <ModalDetalleControlProceso
        abierto={detalleDe !== null}
        control={detalleDe}
        puedeAprobar={puedeAprobar}
        onCerrar={() => setDetalleDe(null)}
        onVoboRegistrado={alRegistrarVobo}
      />
    </section>
  )
}
