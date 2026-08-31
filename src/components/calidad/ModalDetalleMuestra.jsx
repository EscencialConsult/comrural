import { useEffect, useState } from 'react'
import { Check, FlaskConical, Layers, Scale, Package, Clock3, ClipboardCheck, Building2, Info, FileText, History } from 'lucide-react'
import { samplesService } from '../../services/samplesService'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { laboratoryReportsService } from '../../services/laboratoryReportsService'
import { NATURALEZA_LABEL, USO_LABEL, EXECUTION_MODE_LABEL } from '../../config/analisisLabels'
import { informesVigentes, REPORT_STATUS_LABEL, REPORT_STATUS_TONO, etiquetaInforme } from './SeccionInformeMuestra.jsx'
import Modal from '../Modal.jsx'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import PillTabs from '../dashboard/PillTabs.jsx'
import ScrollHorizontal from '../ScrollHorizontal.jsx'
import Skeleton from '../Skeleton.jsx'
import SeccionInformeMuestra from './SeccionInformeMuestra.jsx'
import SeccionTrazabilidadMuestra from './SeccionTrazabilidadMuestra.jsx'

const PESTAÑAS_DETALLE = [
  { id: 'general', nombre: 'General', Icon: Info },
  { id: 'informe', nombre: 'Informe', Icon: FileText },
  { id: 'trazabilidad', nombre: 'Trazabilidad', Icon: History },
]

// Motivo de reclasificación legible — el backend solo manda el código
// (`EXPRESS_CAPACITY_EXHAUSTED`, único valor posible hoy según el CHECK de
// analysis_requests_reclassification_check), esto es solo la traducción.
const MOTIVO_RECLASIFICACION_LABEL = {
  EXPRESS_CAPACITY_EXHAUSTED: 'cupo Express agotado',
}

const TONO_ESTADO_LOTE = {
  ACEPTADO_RECEPCION: 'positivo',
  LAVADO: 'positivo',
  EN_ANALISIS: 'alerta',
  LIBERADO: 'positivo',
  RECHAZADO: 'negativo',
  CANCELADO: 'negativo',
}

// Detalle de una muestra al clickearla en SeccionMuestras.jsx — 3 pestañas
// (General / Informe / Trazabilidad, ver PESTAÑAS_DETALLE). "General" es
// 100% real (GET /samples/:sampleId + GET /analysis-requests/:requestId):
// cabecera, datos de la muestra, el estado del proceso en 4 pasos (no 5) y
// el detalle de la solicitud más reciente si existe.
//
// "Informe" y "Trazabilidad" leen los informes reales de Laboratorio
// (GET /analysis-requests/:id/reports, ver laboratoryReportsService y
// docs/laboratory-executions-shipments-reports.md §3) — ya no hay nada
// mock acá: el JSONB de resultados y el PDF final que arma
// FormularioIniciarAnalisis.jsx (Laboratorio) son la misma fuente que
// consultan estas dos pestañas.
//
// "Recibir muestra" NO vive acá — es acción de Laboratorio, no de Calidad
// (pedido explícito: Calidad solicita, Laboratorio recibe). Ver
// SeccionPendientes.jsx (components/laboratorio/), pestaña Pendientes de
// PanelLaboratorio.jsx.
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
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-marron-tierra/10 bg-white/60 p-3">
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
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-4 ring-crema-quinua sm:size-9 ${
            negativo
              ? 'bg-rojo-pasankalla/15 text-rojo-pasankalla'
              : hecho
                ? 'bg-verde-lima text-marron-cafe'
                : 'bg-marron-tierra/10 text-marron-cafe/40'
          }`}
        >
          {hecho ? <Check className="size-4" strokeWidth={2.5} /> : numero}
        </div>
        <div className="w-16 sm:w-20">
          <p className="text-[11px] font-bold text-marron-cafe sm:text-xs">{titulo}</p>
          <p className={`text-[11px] sm:text-xs ${negativo ? 'text-rojo-pasankalla' : 'text-marron-cafe/50'}`}>{estado}</p>
        </div>
      </div>
      {!esUltimo && <div className={`-mt-6 h-0.5 min-w-2 flex-1 ${hecho ? 'bg-verde-lima' : 'bg-marron-tierra/15'}`} />}
    </div>
  )
}

export default function ModalDetalleMuestra({ abierto, muestra, lote, onCerrar, onSolicitar }) {
  const [detalle, setDetalle] = useState(null)
  const [solicitudDetalle, setSolicitudDetalle] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [pestaña, setPestaña] = useState('general')
  // Informes reales de Laboratorio (null = todavía cargando) — se piden
  // recién cuando se conoce la solicitud, así que llegan un tick después
  // de solicitudDetalle.
  const [informes, setInformes] = useState(null)

  useEffect(() => {
    if (!abierto || !muestra) {
      setDetalle(null)
      setSolicitudDetalle(null)
      setInformes(null)
      setPestaña('general')
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
          laboratoryReportsService
            .listarPorSolicitud(ultima.id)
            .then((lista) => !cancelado && setInformes(lista))
            .catch(() => !cancelado && setInformes([]))
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

      {/* overflow-x-hidden en el contenedor de abajo: Modal.jsx tiene
          overflow-y-auto en su body, y por cómo funciona overflow en CSS
          eso vuelve el eje X también scrolleable ('auto') apenas algo se
          pasa por unos pixeles — así el modal ENTERO se deslizaba
          horizontal por culpa de las tarjetas de Producto/Lote/etc. Con
          esto, cualquier desborde queda contenido acá adentro; lo único
          que sí puede scrollear horizontal son las secciones que lo
          declaran a propósito (ScrollHorizontal.jsx: pestañas de arriba y
          el stepper de "Estado del proceso"). */}
      {!detalle ? (
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
        <div className="flex flex-col gap-6 overflow-x-hidden">
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

          <PillTabs pestañas={PESTAÑAS_DETALLE} activa={pestaña} onCambiar={setPestaña} />

          {pestaña === 'informe' && (
            <SeccionInformeMuestra detalle={detalle} solicitudDetalle={solicitudDetalle} informes={informes} />
          )}

          {pestaña === 'trazabilidad' && (
            <SeccionTrazabilidadMuestra detalle={detalle} solicitudDetalle={solicitudDetalle} informes={informes} />
          )}

          {pestaña === 'general' && (
          <>
          {/* Tope en 3 columnas a propósito, no 4/5: el modal nunca supera
              max-w-2xl (672px) así que más columnas no significa más
              ancho real — con 5 tarjetas en 4 o 5 columnas cada una queda
              con ~40px para el texto (ícono + padding se comen el resto),
              ilegible aunque truncado. En 3 columnas 5 tarjetas quedan
              3+2 (última fila incompleta, alineada a la izquierda) en vez
              de forzar una quinta columna angosta. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DatoCard Icon={Package} etiqueta="Producto">
              {detalle.lot.product.name}
            </DatoCard>
            <DatoCard Icon={Layers} etiqueta="Lote">
              <span className="font-mono">{detalle.lot.code}</span>
            </DatoCard>
            <DatoCard Icon={Scale} etiqueta="Cantidad">
              {detalle.quantity} {detalle.unit === 'OTRA' ? detalle.otherUnit : detalle.unit}
            </DatoCard>
            <DatoCard Icon={Building2} etiqueta="Proveedor">
              {detalle.lot.supplier?.name ?? '—'}
            </DatoCard>
            <DatoCard Icon={ClipboardCheck} etiqueta="Estado del lote">
              <Badge tono={TONO_ESTADO_LOTE[detalle.lot.currentStatus] ?? 'neutro'}>
                {detalle.lot.currentStatus.replace(/_/g, ' ')}
              </Badge>
            </DatoCard>
          </div>

          <div className="rounded-2xl border border-marron-tierra/10 p-5">
            <p className="mb-4 text-sm font-bold text-marron-cafe">Estado del proceso</p>
            {/* ScrollHorizontal como red de seguridad: en una pantalla muy
                angosta 4 pasos con su etiqueta debajo no entran aunque se
                hayan achicado — con esto el scroll queda CONTENIDO acá
                (degradé + flecha visibles), en vez de arrastrar a todo el
                modal a scrollear horizontal (ver overflow-x-hidden del
                contenedor general, más arriba). `pt-1.5` acá adentro (no en
                el `p-5` de afuera, que queda fuera del propio div que
                scrollea): `overflow-x-auto` sin `overflow-y` explícito hace
                que el navegador compute el eje vertical como no-visible
                también, y sin este margen el `ring-4` del círculo (un
                box-shadow que sobresale del borde) quedaba recortado por
                arriba al no tener aire dentro de ese div. */}
            <ScrollHorizontal>
              <div className="flex min-w-[280px] items-start pt-1.5">
                {pasos.map((p, i) => (
                  <Paso key={p.titulo} {...p} esUltimo={i === pasos.length - 1} />
                ))}
              </div>
            </ScrollHorizontal>
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
                <div className="flex flex-col gap-4">
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Tipo</dt>
                      <dd className="text-sm text-marron-cafe">
                        {solicitudDetalle.effectiveType}
                        {solicitudDetalle.reclassificationReason && (
                          <span className="text-marron-cafe/50">
                            {' '}
                            (reclasificada de {solicitudDetalle.requestedType} —{' '}
                            {MOTIVO_RECLASIFICACION_LABEL[solicitudDetalle.reclassificationReason] ?? solicitudDetalle.reclassificationReason})
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Estado</dt>
                      <dd className="text-sm text-marron-cafe">{solicitudDetalle.status.replace(/_/g, ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Turno</dt>
                      <dd className="text-sm text-marron-cafe">{solicitudDetalle.shift.name}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Naturaleza</dt>
                      <dd className="text-sm text-marron-cafe">{NATURALEZA_LABEL[solicitudDetalle.productNature] ?? solicitudDetalle.productNature}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Uso</dt>
                      <dd className="text-sm text-marron-cafe">{USO_LABEL[solicitudDetalle.intendedUse] ?? solicitudDetalle.intendedUse}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Responsable de entrega</dt>
                      <dd className="text-sm text-marron-cafe">{solicitudDetalle.deliveryResponsible?.name ?? '—'}</dd>
                    </div>
                  </dl>

                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">
                      Ensayos ({solicitudDetalle.items.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {solicitudDetalle.items.map((item) => (
                        <span
                          key={item.id}
                          className="flex items-center gap-1.5 rounded-full bg-marron-tierra/5 py-1 pr-1 pl-3 text-xs text-marron-cafe"
                        >
                          {item.isCustom ? item.otherTestName : item.name}
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-marron-cafe/50">
                            {EXECUTION_MODE_LABEL[item.executionMode] ?? item.executionMode}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {solicitudDetalle.removedItems.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">
                        Ensayos retirados ({solicitudDetalle.removedItems.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {solicitudDetalle.removedItems.map((item) => (
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

                  {/* Resumen de informes — real (GET .../reports), detalle
                      completo con descarga de PDF en la pestaña "Informe". */}
                  {informes !== null && informesVigentes(informes).length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Informes</p>
                      <div className="flex flex-col gap-1.5">
                        {informesVigentes(informes).map((informe) => (
                          <div
                            key={informe.id}
                            className="flex flex-wrap items-center gap-2.5 rounded-xl border-l-4 border-verde-bosque/30 bg-white/60 px-3 py-2"
                          >
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-marron-cafe">
                              {etiquetaInforme(informe)}
                            </span>
                            <Badge tono={REPORT_STATUS_TONO[informe.status] ?? 'neutro'} className="shrink-0">
                              {REPORT_STATUS_LABEL[informe.status] ?? informe.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {solicitudDetalle.reception && (
                    <div className="rounded-xl bg-verde-hoja/5 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-verde-bosque">
                        <ClipboardCheck className="size-3.5" strokeWidth={2} />
                        Recepción en laboratorio
                      </p>
                      <dl className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Recibido por</dt>
                          <dd className="text-sm text-marron-cafe">{solicitudDetalle.reception.receivedBy.name}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Recibido el</dt>
                          <dd className="text-sm text-marron-cafe">{formatearFecha(solicitudDetalle.reception.receivedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Resultado estimado</dt>
                          <dd className="text-sm text-marron-cafe">{solicitudDetalle.reception.expectedResultDate}</dd>
                        </div>
                        {solicitudDetalle.reception.notes && (
                          <div className="sm:col-span-3">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Notas de recepción</dt>
                            <dd className="text-sm text-marron-cafe">{solicitudDetalle.reception.notes}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}

                  {solicitudDetalle.status === 'RECHAZADA' && solicitudDetalle.acceptanceEvaluation && (
                    <div className="rounded-xl bg-rojo-pasankalla/5 p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-rojo-pasankalla">
                        Motivo de rechazo
                      </p>
                      <p className="text-sm text-marron-cafe">{solicitudDetalle.acceptanceEvaluation.notes}</p>
                      <p className="mt-1 text-xs text-marron-cafe/50">
                        Evaluado por {solicitudDetalle.acceptanceEvaluation.evaluatedBy.name} el{' '}
                        {formatearFecha(solicitudDetalle.acceptanceEvaluation.evaluatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Skeleton className="h-16" />
              )}
            </div>
          )}

          {detalle.analysisRequests.length > 1 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-marron-cafe/40">Historial de solicitudes</p>
              <div className="overflow-hidden rounded-2xl border border-marron-tierra/10">
                {detalle.analysisRequests.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-marron-tierra/10 px-4 py-2.5 last:border-b-0"
                  >
                    <span className="text-xs text-marron-cafe/60">{formatearFecha(r.requestedAt)}</span>
                    <span className="text-xs text-marron-cafe">
                      {r.effectiveType}
                      {r.requestedType !== r.effectiveType && (
                        <span className="text-marron-cafe/40"> (pedida {r.requestedType})</span>
                      )}
                    </span>
                    <Badge tono="neutro" className="ml-auto">
                      {r.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
          )}
        </div>
      )}
    </Modal>
  )
}
