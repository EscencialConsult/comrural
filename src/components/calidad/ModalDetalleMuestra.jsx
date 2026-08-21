import { useEffect, useState } from 'react'
import { Check, FlaskConical, Layers, Scale, Package, Clock3 } from 'lucide-react'
import { samplesService } from '../../services/samplesService'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import Modal from '../Modal.jsx'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'

// Detalle de una muestra al clickearla en SeccionMuestras.jsx — un solo
// panel, no las 4 pestañas de la demo que trajo el usuario: "Informe" no
// tiene ningún dato real detrás (el backend no cubre esa fase todavía, ver
// docs/laboratory.md) y "Trazabilidad" real vive en audit_log, sin
// endpoint que lo exponga — mostrar cualquiera de las dos como si tuviera
// contenido sería inventar datos. Lo que sí es 100% real (GET
// /samples/:sampleId + GET /analysis-requests/:requestId, ambos ya
// existentes) queda acá: cabecera, datos de la muestra, el estado del
// proceso en 4 pasos (no 5) y el detalle de la solicitud más reciente si
// existe.
const ESTADOS_SOLICITUD_ACTIVA = ['PENDIENTE_MUESTRA', 'RECIBIDA', 'EN_PROCESO']
const TONO_ESTADO_MUESTRA = {
  TOMADA: 'neutro',
  ENTREGADA: 'alerta',
  RECIBIDA: 'positivo',
  CERRADA: 'positivo',
  RECHAZADA: 'negativo',
}

const formatearFecha = (iso) => new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

function pasoSolicitud(solicitud) {
  if (!solicitud) return { titulo: 'Solicitud', estado: 'Pendiente', hecho: false }
  return { titulo: 'Solicitud', estado: solicitud.effectiveType, hecho: true }
}

function pasoRecepcion(solicitud) {
  if (!solicitud) return { titulo: 'Recepción Lab.', estado: 'Pendiente', hecho: false }
  if (solicitud.status === 'RECHAZADA') return { titulo: 'Recepción Lab.', estado: 'Rechazada', hecho: false, negativo: true }
  if (solicitud.status === 'PENDIENTE_MUESTRA') return { titulo: 'Recepción Lab.', estado: 'Pendiente', hecho: false }
  return { titulo: 'Recepción Lab.', estado: 'Recibida', hecho: true }
}

function pasoAnalisis(solicitud) {
  if (!solicitud || !['EN_PROCESO', 'ANALIZADA'].includes(solicitud.status)) return { titulo: 'Análisis', estado: 'Pendiente', hecho: false }
  return { titulo: 'Análisis', estado: solicitud.status === 'ANALIZADA' ? 'Analizada' : 'En proceso', hecho: solicitud.status === 'ANALIZADA' }
}

// Tarjeta chica de dato — mismo lenguaje que StatCard.jsx (círculo con
// ícono + texto), pero para valores de texto en vez de KPIs numéricos.
function DatoCard({ Icon, etiqueta, children }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-marron-tierra/10 bg-white/60 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</p>
        <div className="truncate text-sm font-medium text-marron-cafe">{children}</div>
      </div>
    </div>
  )
}

function Paso({ numero, titulo, estado, hecho, negativo, esUltimo }) {
  return (
    <div className="flex flex-1 items-center last:flex-none">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-4 ring-crema-quinua ${
            negativo
              ? 'bg-rojo-pasankalla/15 text-rojo-pasankalla'
              : hecho
                ? 'bg-verde-lima text-marron-cafe'
                : 'bg-marron-tierra/10 text-marron-cafe/40'
          }`}
        >
          {hecho ? <Check className="size-4" strokeWidth={2.5} /> : numero}
        </div>
        <div className="w-20">
          <p className="text-xs font-bold text-marron-cafe">{titulo}</p>
          <p className={`text-xs ${negativo ? 'text-rojo-pasankalla' : 'text-marron-cafe/50'}`}>{estado}</p>
        </div>
      </div>
      {!esUltimo && <div className={`-mt-6 h-0.5 flex-1 ${hecho ? 'bg-verde-lima' : 'bg-marron-tierra/15'}`} />}
    </div>
  )
}

export default function ModalDetalleMuestra({ abierto, muestra, lote, onCerrar, onSolicitar }) {
  const [detalle, setDetalle] = useState(null)
  const [solicitudDetalle, setSolicitudDetalle] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  useEffect(() => {
    if (!abierto || !muestra) {
      setDetalle(null)
      setSolicitudDetalle(null)
      return
    }
    let cancelado = false
    setErrorCarga(null)
    samplesService
      .obtener(muestra.id)
      .then((d) => {
        if (cancelado) return
        setDetalle(d)
        const ultima = d.analysisRequests?.[0]
        if (ultima) {
          analysisRequestsService
            .obtener(ultima.id)
            .then((sd) => !cancelado && setSolicitudDetalle(sd))
            .catch(() => {})
        }
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [abierto, muestra])

  if (!muestra) return null

  const ultimaSolicitud = detalle?.analysisRequests?.[0]
  const solicitudActiva = detalle?.analysisRequests?.find((r) => ESTADOS_SOLICITUD_ACTIVA.includes(r.status))
  const pasos = detalle
    ? [
        { numero: 1, titulo: 'Muestra', estado: 'Registrada', hecho: true },
        { numero: 2, ...pasoSolicitud(ultimaSolicitud) },
        { numero: 3, ...pasoRecepcion(ultimaSolicitud) },
        { numero: 4, ...pasoAnalisis(ultimaSolicitud) },
      ]
    : []

  return (
    <Modal abierto={abierto} titulo="Detalle de muestra" onCerrar={onCerrar} maxWidth="max-w-2xl">
      {errorCarga && (
        <p className="mb-4 rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{errorCarga}</p>
      )}

      {!detalle ? (
        <p className="text-sm text-marron-cafe/50">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-verde-hoja/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
                <FlaskConical className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-marron-cafe">{muestra.code}</h3>
                  <Badge tono={TONO_ESTADO_MUESTRA[detalle.status] ?? 'neutro'}>{detalle.status}</Badge>
                </div>
                <p className="text-xs text-marron-cafe/60">
                  Tomada el {formatearFecha(detalle.sampledAt)} por {detalle.sampledBy.name}
                </p>
              </div>
            </div>
            {!solicitudActiva && (
              <Button className="gap-1.5 px-4 py-2 text-sm" onClick={() => onSolicitar(muestra, lote)}>
                + Solicitar análisis
              </Button>
            )}
          </div>

          {detalle.notes && (
            <p className="-mt-3 text-xs text-marron-cafe/50 italic">"{detalle.notes}"</p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <DatoCard Icon={Package} etiqueta="Producto">
              {detalle.lot.product.name}
            </DatoCard>
            <DatoCard Icon={Layers} etiqueta="Lote">
              <span className="font-mono">{detalle.lot.code}</span>
            </DatoCard>
            <DatoCard Icon={Scale} etiqueta="Cantidad">
              {detalle.quantity} {detalle.unit === 'OTRA' ? detalle.otherUnit : detalle.unit}
            </DatoCard>
          </div>

          <div>
            <p className="mb-4 text-sm font-bold text-marron-cafe">Estado del proceso</p>
            <div className="flex items-start">
              {pasos.map((p, i) => (
                <Paso key={p.titulo} {...p} esUltimo={i === pasos.length - 1} />
              ))}
            </div>
          </div>

          {ultimaSolicitud && (
            <div className="rounded-2xl border border-marron-tierra/10 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock3 className="size-4 text-verde-bosque" strokeWidth={1.75} />
                <p className="text-sm font-bold text-marron-cafe">
                  {detalle.analysisRequests.length > 1 ? 'Solicitud más reciente' : 'Solicitud'}
                </p>
              </div>
              {solicitudDetalle ? (
                <dl className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Tipo</dt>
                    <dd className="text-sm text-marron-cafe">
                      {solicitudDetalle.effectiveType}
                      {solicitudDetalle.reclassificationReason && ' (reclasificada)'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Estado</dt>
                    <dd className="text-sm text-marron-cafe">{solicitudDetalle.status.replace(/_/g, ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Ensayos</dt>
                    <dd className="text-sm text-marron-cafe">{solicitudDetalle.items.length}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Turno</dt>
                    <dd className="text-sm text-marron-cafe">{solicitudDetalle.shift.name}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-marron-cafe/50">Cargando…</p>
              )}
            </div>
          )}

          {detalle.analysisRequests.length > 1 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-marron-cafe/40">Historial de solicitudes</p>
              <div className="overflow-hidden rounded-2xl border border-marron-tierra/10">
                {detalle.analysisRequests.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 border-b border-marron-tierra/10 px-4 py-2.5 last:border-b-0">
                    <span className="text-xs text-marron-cafe/60">{formatearFecha(r.requestedAt)}</span>
                    <span className="text-xs text-marron-cafe">{r.effectiveType}</span>
                    <Badge tono="neutro" className="ml-auto">
                      {r.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
