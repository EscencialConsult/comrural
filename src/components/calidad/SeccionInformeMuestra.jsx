import { useEffect, useState } from 'react'
import { FileText, Download, PackageCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { documentsService } from '../../services/documentsService'
import { lotsService } from '../../services/lotsService'
import { laboratoryReportsService } from '../../services/laboratoryReportsService'
import { toast } from '../../lib/toast'
import { formatearEstadoSolicitud } from '../../config/analisisLabels'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'
import ConfirmModal from '../ConfirmModal.jsx'

export const REPORT_STATUS_LABEL = {
  BORRADOR: 'Borrador',
  PENDIENTE_VALIDACION: 'Pendiente de validación',
  VALIDADO: 'Validado',
}

export const REPORT_STATUS_TONO = {
  BORRADOR: 'neutro',
  PENDIENTE_VALIDACION: 'alerta',
  VALIDADO: 'positivo',
}

const INTERNAL_REPORT_TYPE_LABEL = {
  FISICO_QUIMICO: 'Físico-Químico',
  MICROBIOLOGICO: 'Microbiológico',
}

// Un informe deja de contar como vigente cuando fue reemplazado o anulado —
// mismo criterio que usa el backend (SUPERSEDED_STATUSES en
// laboratory-reports.service.ts) y que ya aplicaba FormularioIniciarAnalisis.jsx
// (Laboratorio) para no mostrar dos veces la misma planilla.
const ESTADOS_SUPERADOS = new Set(['REEMPLAZADO', 'ANULADO'])
export const informesVigentes = (informes) => (informes ?? []).filter((i) => !ESTADOS_SUPERADOS.has(i.status))

export const etiquetaInforme = (informe) =>
  informe.origin === 'INTERNO'
    ? (INTERNAL_REPORT_TYPE_LABEL[informe.internalReportType] ?? informe.internalReportType)
    : `Externo${informe.externalReportCode ? ` — ${informe.externalReportCode}` : ''}`

// Pestaña "Informe" del detalle de muestra (ModalDetalleMuestra.jsx,
// Calidad) — lista los informes ya VALIDADOS de la solicitud (GET
// /analysis-requests/:id/reports, mismos datos que arma Laboratorio en
// FormularioIniciarAnalisis.jsx): un informe por planilla interna
// (Físico-Químico / Microbiológico), más uno por envío externo ya
// resuelto. Deliberadamente NO muestra BORRADOR/PENDIENTE_VALIDACION acá —
// esto es lo que Calidad recibe como definitivo, no el trabajo en curso de
// Laboratorio (eso vive en FormularioIniciarAnalisis.jsx/Laboratorio). El
// PDF se descarga acá mismo.
export default function SeccionInformeMuestra({ detalle, solicitudDetalle, informes, onLoteLiberado }) {
  if (!solicitudDetalle) {
    return (
      <p className="rounded-2xl bg-marron-tierra/5 px-4 py-8 text-center text-sm text-marron-cafe/50">
        Esta muestra todavía no tiene una solicitud de análisis — no hay nada que mostrar en el informe.
      </p>
    )
  }

  if (informes === null) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  const vigentes = informesVigentes(informes).filter((i) => i.status === 'VALIDADO')

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-marron-tierra/10 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-marron-cafe">
          <FileText className="size-4 text-verde-bosque" strokeWidth={1.75} />
          Informe de análisis — {detalle.code}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Producto</dt>
            <dd className="text-sm text-marron-cafe">{detalle.lot.product.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Lote</dt>
            <dd className="font-mono text-sm text-marron-cafe">{detalle.lot.code}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Proveedor</dt>
            <dd className="text-sm text-marron-cafe">{detalle.lot.supplier?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Estado de la solicitud</dt>
            <dd className="text-sm text-marron-cafe">{formatearEstadoSolicitud(solicitudDetalle.status)}</dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Informes</p>
        {vigentes.length === 0 ? (
          <p className="rounded-2xl bg-marron-tierra/5 px-4 py-8 text-center text-sm text-marron-cafe/50">
            Todavía no se cargó ningún informe para esta solicitud.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {vigentes.map((informe) => (
              <TarjetaInforme key={informe.id} informe={informe} />
            ))}
          </div>
        )}
      </div>

      <LiberarLote lot={detalle.lot} requestId={solicitudDetalle.id} onLoteLiberado={onLoteLiberado} />
    </div>
  )
}

// Botón de liberación del lote — EN_ANALISIS -> LIBERADO (ver
// comrural_erp_backend/docs/lots.md §3/§7, LotsService.release). Bloqueado
// mientras falte algún ensayo (interno o externo) sin informe VALIDADO —
// se pide GET /analysis-requests/:id/coverage (laboratoryReportsService.
// cobertura, ya existente) apenas se conoce la solicitud, no recién al
// clickear, así el botón ya nace deshabilitado si corresponde. El backend
// (LotsService.release) no valida esto — es una regla de esta pantalla.
function LiberarLote({ lot, requestId, onLoteLiberado }) {
  const { permisos } = useAuth()
  const [cobertura, setCobertura] = useState(null) // null = cargando
  const [liberando, setLiberando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    if (lot.currentStatus !== 'EN_ANALISIS') return
    let cancelado = false
    laboratoryReportsService
      .cobertura(requestId)
      .then((c) => !cancelado && setCobertura(c))
      .catch((err) => !cancelado && toast.error(err.message))
    return () => {
      cancelado = true
    }
  }, [requestId, lot.currentStatus])

  if (!permisos.has('lots:release')) return null

  if (lot.currentStatus === 'LIBERADO') {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-marron-tierra/10 p-4">
        <p className="text-sm font-bold text-marron-cafe">Liberación del lote</p>
        <Badge tono="positivo">Lote liberado</Badge>
      </div>
    )
  }

  if (lot.currentStatus !== 'EN_ANALISIS') return null

  const confirmarLiberacion = async () => {
    if (liberando) return
    setLiberando(true)
    try {
      const actualizado = await lotsService.liberar(lot.id)
      toast.success(`Lote ${lot.code} liberado`)
      onLoteLiberado?.(actualizado.currentStatus)
      setConfirmando(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLiberando(false)
    }
  }

  const faltantes = cobertura ? [...cobertura.pendingInternal, ...cobertura.pendingExternal] : []
  const puedeLiberar = cobertura !== null && faltantes.length === 0

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-marron-cafe">Liberación del lote</p>
          <p className="text-xs text-marron-cafe/60">Lote {lot.code}</p>
        </div>
        <Button
          type="button"
          className="gap-1.5 px-3 py-1.5 text-xs"
          disabled={cobertura === null || !puedeLiberar}
          onClick={() => setConfirmando(true)}
        >
          <PackageCheck className="size-3.5" strokeWidth={2} />
          {cobertura === null ? 'Verificando…' : 'Liberar lote'}
        </Button>
      </div>

      {cobertura !== null && faltantes.length > 0 && (
        <p className="rounded-xl bg-marron-arcilla/10 px-3 py-2 text-xs font-medium text-marron-arcilla">
          Todavía falta{faltantes.length === 1 ? '' : 'n'} un informe validado de: {faltantes.join(', ')}. No se
          puede liberar el lote hasta que estén todos los ensayos (interno y externo) validados.
        </p>
      )}

      <ConfirmModal
        abierto={confirmando}
        titulo="Liberar lote"
        mensaje={`¿Confirmás la liberación del lote ${lot.code}?`}
        textoConfirmar={liberando ? 'Liberando…' : 'Confirmar liberación'}
        variante="exito"
        onConfirmar={confirmarLiberacion}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  )
}

function TarjetaInforme({ informe }) {
  const [descargando, setDescargando] = useState(false)

  const descargar = async () => {
    setDescargando(true)
    try {
      const url = await documentsService.urlDescarga(informe.documentId)
      window.open(url, '_blank')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-marron-tierra/10 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-marron-cafe">{etiquetaInforme(informe)}</span>
        <Badge tono={REPORT_STATUS_TONO[informe.status] ?? 'neutro'} className="ml-auto">
          {REPORT_STATUS_LABEL[informe.status] ?? informe.status}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {informe.items.map((it) => (
          <span key={it.itemId} className="rounded-full bg-marron-tierra/5 px-2.5 py-0.5 text-xs text-marron-cafe/70">
            {it.testName}
          </span>
        ))}
      </div>
      {informe.status === 'VALIDADO' && informe.documentId && (
        <Button
          type="button"
          variant="secondary"
          className="w-fit gap-1.5 px-3 py-1.5 text-xs"
          disabled={descargando}
          onClick={descargar}
        >
          <Download className="size-3.5" strokeWidth={2} />
          {descargando ? 'Abriendo…' : 'Descargar PDF'}
        </Button>
      )}
    </div>
  )
}
