import { useEffect, useState } from 'react'
import { FlaskConical, Package, Layers, Scale, Clock3, User, ClipboardCheck } from 'lucide-react'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { NATURALEZA_LABEL, USO_LABEL, EXECUTION_MODE_LABEL } from '../../config/analisisLabels'
import Modal from '../Modal.jsx'
import Badge from '../Badge.jsx'
import DatoCard from '../DatoCard.jsx'
import Skeleton from '../Skeleton.jsx'

const TONO_ESTADO = {
  PENDIENTE_MUESTRA: 'alerta',
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  PENDIENTE_EXTERNOS: 'alerta',
  ANALIZADA: 'positivo',
  RECHAZADA: 'negativo',
}

const MOTIVO_RECLASIFICACION_LABEL = {
  EXPRESS_CAPACITY_EXHAUSTED: 'cupo Express agotado',
}

const formatearFecha = (iso) => new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

// Detalle de una solicitud al clickear una fila en SeccionActividad.jsx —
// mismo endpoint (GET /analysis-requests/:id) que ya usan ModalRecibirMuestra
// y FormularioAsignarLaboratorio, acá solo de lectura: la bitácora de
// Actividad no tiene acciones, es historial.
export default function ModalDetalleActividad({ abierto, solicitudId, onCerrar }) {
  const [detalle, setDetalle] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!abierto || !solicitudId) {
      setDetalle(null)
      setError(null)
      return
    }
    let cancelado = false
    analysisRequestsService
      .obtener(solicitudId)
      .then((d) => !cancelado && setDetalle(d))
      .catch((err) => !cancelado && setError(err.message))
    return () => {
      cancelado = true
    }
  }, [abierto, solicitudId])

  return (
    <Modal abierto={abierto} titulo="Detalle de solicitud" onCerrar={onCerrar} maxWidth="max-w-2xl">
      {error ? (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      ) : !detalle ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-20" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-verde-hoja/5 p-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
              <FlaskConical className="size-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-extrabold text-marron-cafe">{detalle.sample.code}</h3>
                <Badge tono={TONO_ESTADO[detalle.status] ?? 'neutro'}>{detalle.status.replace(/_/g, ' ')}</Badge>
                <Badge tono={detalle.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{detalle.effectiveType}</Badge>
              </div>
              <p className="text-xs text-marron-cafe/60">
                Solicitada el {formatearFecha(detalle.requestedAt)} por {detalle.requestedBy.name}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DatoCard Icon={Package} etiqueta="Producto">
              {detalle.product.name}
            </DatoCard>
            <DatoCard Icon={Layers} etiqueta="Lote">
              <span className="font-mono">{detalle.lot.code}</span>
            </DatoCard>
            <DatoCard Icon={Scale} etiqueta="Cantidad">
              {detalle.sample.quantity} {detalle.sample.unit === 'OTRA' ? detalle.sample.otherUnit : detalle.sample.unit}
            </DatoCard>
            <DatoCard Icon={Clock3} etiqueta="Turno">
              {detalle.shift.name}
            </DatoCard>
            <DatoCard Icon={ClipboardCheck} etiqueta="Naturaleza / Uso">
              {NATURALEZA_LABEL[detalle.productNature] ?? detalle.productNature} · {USO_LABEL[detalle.intendedUse] ?? detalle.intendedUse}
            </DatoCard>
            <DatoCard Icon={User} etiqueta="Responsable de entrega">
              {detalle.deliveryResponsible?.name ?? '—'}
            </DatoCard>
          </div>

          {detalle.reclassificationReason && (
            <p className="text-xs text-marron-cafe/50">
              Reclasificada de {detalle.requestedType} a {detalle.effectiveType} —{' '}
              {MOTIVO_RECLASIFICACION_LABEL[detalle.reclassificationReason] ?? detalle.reclassificationReason}
            </p>
          )}

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">
              Ensayos ({detalle.items.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {detalle.items.map((item) => (
                <span
                  key={item.id}
                  className="flex items-center gap-1.5 rounded-full bg-marron-tierra/5 py-1 pr-1 pl-3 text-xs text-marron-cafe"
                >
                  {item.isCustom ? item.otherTestName : item.name}
                  {item.assignedExecutionMode && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-marron-cafe/50">
                      {EXECUTION_MODE_LABEL[item.assignedExecutionMode] ?? item.assignedExecutionMode}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {detalle.removedItems.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">
                Ensayos retirados ({detalle.removedItems.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {detalle.removedItems.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full bg-marron-tierra/5 px-3 py-1 text-xs text-marron-cafe/40 line-through"
                  >
                    {item.isCustom ? item.otherTestName : item.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {detalle.reception && (
            <div className="rounded-xl bg-verde-hoja/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-verde-bosque">
                <ClipboardCheck className="size-3.5" strokeWidth={2} />
                Recepción en laboratorio
              </p>
              <dl className="grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Recibido por</dt>
                  <dd className="text-sm text-marron-cafe">{detalle.reception.receivedBy.name}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Recibido el</dt>
                  <dd className="text-sm text-marron-cafe">{formatearFecha(detalle.reception.receivedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Resultado estimado</dt>
                  <dd className="text-sm text-marron-cafe">{detalle.reception.expectedResultDate}</dd>
                </div>
                {detalle.reception.notes && (
                  <div className="sm:col-span-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Notas de recepción</dt>
                    <dd className="text-sm text-marron-cafe">{detalle.reception.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {detalle.status === 'RECHAZADA' && detalle.acceptanceEvaluation && (
            <div className="rounded-xl bg-rojo-pasankalla/5 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-rojo-pasankalla">Motivo de rechazo</p>
              <p className="text-sm text-marron-cafe">{detalle.acceptanceEvaluation.notes}</p>
              <p className="mt-1 text-xs text-marron-cafe/50">
                Evaluado por {detalle.acceptanceEvaluation.evaluatedBy.name} el {formatearFecha(detalle.acceptanceEvaluation.evaluatedAt)}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
