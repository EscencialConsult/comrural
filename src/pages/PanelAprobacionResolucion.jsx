import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { qualityResolutionsService } from '../services/qualityResolutionsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'

// FE·F2·M7 · Gestionar el visto bueno gerencial — ver comrural_erp_backend/
// docs/quality-resolutions.md §5/§8, leído completo. Pantalla propia y
// deliberadamente angosta: a diferencia de PanelRecepcionLote.jsx (que
// también muestra la resolución, pero mezclado con las acciones de la
// analista — emitir, corregir), acá el gerente SOLO ve lo que necesita para
// decidir y el botón de aprobar. No hay edición de decisión ni de notas acá
// — eso es tarea de la analista, en la otra pantalla. El ticket lo pide
// explícito: "La pantalla es de solo lectura: no edita la decisión ni
// registra observaciones."
const TONO_DECISION = { APROBADA: 'positivo', RECHAZADA: 'negativo' }
const TONO_REVIEW = { PENDIENTE: 'alerta', APROBADO: 'positivo' }

export default function PanelAprobacionResolucion() {
  const { lotId } = useParams()
  const navigate = useNavigate()
  const { permisos } = useAuth()
  const puedeVer = permisos.has('raw-material-receptions:read')
  const puedeAprobar = permisos.has('quality-resolutions:approve')

  const [datos, setDatos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)
  const [resolucionDetalle, setResolucionDetalle] = useState(null)
  const { enviando, error, ejecutar } = useSolicitud()

  const recargar = useCallback(() => {
    if (!puedeVer) return
    setErrorCarga(null)
    rawMaterialReceptionsService
      .obtener(lotId)
      .then(setDatos)
      .catch((err) => setErrorCarga(err.message))
  }, [lotId, puedeVer])

  useEffect(() => {
    recargar()
  }, [recargar])

  // El `qualityResolution` de la vista consolidada NO trae `decisionNotes`
  // ni `canApprove` (ReceptionQualityResolutionView del backend solo tiene
  // id/decision/reviewStatus/authorizedPackageCount/resolvedAt/reviewedAt —
  // se verificó leyendo raw-material-reception.service.ts completo). Los
  // dos campos que esta pantalla más necesita (la justificación, y si el
  // usuario puede aprobar) solo existen en GET /quality-resolutions/:id.
  useEffect(() => {
    const resolutionId = datos?.qualityResolution?.id
    if (!resolutionId) {
      setResolucionDetalle(null)
      return
    }
    let cancelado = false
    qualityResolutionsService
      .obtener(resolutionId)
      .then((d) => {
        if (!cancelado) setResolucionDetalle(d)
      })
      .catch(() => {
        // Si falla, se sigue mostrando lo que trae la vista consolidada —
        // solo se pierde la justificación y el botón de aprobar.
      })
    return () => {
      cancelado = true
    }
  }, [datos])

  useEffect(() => {
    if (!confirmacion) return
    const id = setTimeout(() => setConfirmacion(null), 4000)
    return () => clearTimeout(id)
  }, [confirmacion])

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a la revisión de resoluciones de Calidad." />
  }

  if (errorCarga) {
    return (
      <main className="flex w-full flex-col items-start gap-3 p-6 md:p-10">
        <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={recargar}>
          Reintentar
        </Button>
      </main>
    )
  }

  if (!datos) {
    return (
      <main className="w-full p-6 md:p-10">
        <p className="text-sm text-marron-cafe/50">Cargando…</p>
      </main>
    )
  }

  const { lot, summary, qualityResolution } = datos

  const aprobar = async () => {
    try {
      await ejecutar(() => qualityResolutionsService.aprobar(qualityResolution.id))
      setConfirmacion('Visto bueno registrado.')
      recargar()
    } catch {
      // mensaje ya en `error`
    }
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
        Volver
      </button>

      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ShieldCheck className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Visto bueno — {lot.code}</h1>
          <p className="text-sm text-marron-cafe/60">
            {lot.productName} · {lot.supplierName ?? '—'}
          </p>
        </div>
      </header>

      {confirmacion && (
        <p className="rounded-xl bg-verde-lima/15 px-3 py-2 text-sm font-medium text-verde-bosque">{confirmacion}</p>
      )}

      {!qualityResolution ? (
        <p className="rounded-3xl bg-marron-tierra/5 p-6 text-sm text-marron-cafe/50">
          Este lote todavía no tiene una resolución de Calidad emitida.
        </p>
      ) : (
        <section className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
          <div className="flex items-center gap-2">
            <Badge tono={TONO_DECISION[qualityResolution.decision]}>{qualityResolution.decision}</Badge>
            <Badge tono={TONO_REVIEW[qualityResolution.reviewStatus]}>{qualityResolution.reviewStatus}</Badge>
          </div>

          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Recibidos</dt>
              <dd className="text-sm text-marron-cafe">{summary.receivedPackageCount}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Rechazados</dt>
              <dd className="text-sm text-marron-cafe">{summary.rejectedPackageCount}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Autorizados</dt>
              <dd className="text-sm text-marron-cafe">{summary.authorizedPackageCount}</dd>
            </div>
          </dl>

          {resolucionDetalle?.decisionNotes && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Justificación de Calidad</dt>
              <dd className="text-sm text-marron-cafe/80">"{resolucionDetalle.decisionNotes}"</dd>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
          )}

          {qualityResolution.reviewStatus === 'APROBADO' ? (
            <p className="text-sm font-medium text-verde-bosque">Ya tiene el visto bueno registrado.</p>
          ) : puedeAprobar && resolucionDetalle?.canApprove ? (
            <Button disabled={enviando} onClick={aprobar} className="self-start">
              {enviando ? 'Aprobando…' : 'Aprobar (visto bueno)'}
            </Button>
          ) : puedeAprobar ? (
            <p className="text-xs text-marron-cafe/50">
              No podés aprobar esta resolución — probablemente porque vos mismo la emitiste (el backend exige que sea
              otra persona).
            </p>
          ) : (
            <p className="text-xs text-marron-cafe/50">Tu rol no tiene permiso para dar el visto bueno.</p>
          )}
        </section>
      )}
    </main>
  )
}
