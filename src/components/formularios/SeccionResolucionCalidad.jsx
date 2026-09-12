import { useEffect, useState } from 'react'
import { useSolicitud } from '../../hooks/useSolicitud'
import { qualityResolutionsService } from '../../services/qualityResolutionsService'
import { toast } from '../../lib/toast'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import FormularioEmitirResolucion from './FormularioEmitirResolucion.jsx'

const TONO_DECISION = { APROBADA: 'positivo', RECHAZADA: 'negativo' }
const TONO_REVIEW = { PENDIENTE: 'alerta', APROBADO: 'positivo' }

// Emitir la resolución de Calidad + dar el visto bueno gerencial — antes
// PanelAprobacionResolucion.jsx, una pantalla propia solo alcanzable desde
// un botón aparte (el ícono de escudo en PanelCalidadRecepcion.jsx/
// PanelCalidad.jsx). Pedido explícito: que no haga falta una vista entera
// para esto — es un paso más del mismo formulario de inspección que
// Calidad ya completa, no un trámite aparte. Se monta como la última etapa
// de FormularioInspeccionMateriaPrima.jsx, una vez que la inspección está
// FINALIZADA (antes de eso no hay nada que resolver).
//
// Sigue siendo una extensión de PANTALLA únicamente — `qualityResolutions`
// sigue siendo su propio recurso en el backend (POST/GET/aprobar), esto
// solo cambia DESDE DÓNDE se lo opera.
export default function SeccionResolucionCalidad({ inspection, qualityResolution, summary, permisos, onCambio }) {
  const puedeAprobar = permisos.has('quality-resolutions:approve')
  const puedeEmitir = permisos.has('quality-resolutions:create')

  const [resolucionDetalle, setResolucionDetalle] = useState(null)
  const { enviando, error, ejecutar } = useSolicitud()

  // El resumen consolidado (`qualityResolution` acá) no trae `decisionNotes`
  // ni `canApprove` (ReceptionQualityResolutionView del backend solo tiene
  // id/decision/reviewStatus/authorizedPackageCount/resolvedAt/reviewedAt) —
  // esos dos campos solo existen en GET /quality-resolutions/:id.
  useEffect(() => {
    const resolutionId = qualityResolution?.id
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
        // Si falla, se sigue mostrando lo que trae el resumen consolidado —
        // solo se pierde la justificación y el botón de aprobar.
      })
    return () => {
      cancelado = true
    }
  }, [qualityResolution])

  const aprobar = async () => {
    try {
      await ejecutar(() => qualityResolutionsService.aprobar(qualityResolution.id))
      toast.success('Visto bueno registrado.')
      onCambio()
    } catch {
      // mensaje ya en `error`
    }
  }

  if (!qualityResolution) {
    return puedeEmitir ? (
      <FormularioEmitirResolucion
        inspectionId={inspection.id}
        onEmitida={() => {
          toast.success('Resolución emitida.')
          onCambio()
        }}
      />
    ) : (
      <p className="text-sm text-marron-cafe/50">Este lote todavía no tiene una resolución de Calidad emitida.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
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
    </div>
  )
}
