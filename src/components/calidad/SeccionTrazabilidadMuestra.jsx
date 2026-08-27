import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { auditLogService } from '../../services/auditLogService'
import { informesVigentes, REPORT_STATUS_LABEL, etiquetaInforme } from './SeccionInformeMuestra.jsx'
import Skeleton from '../Skeleton.jsx'

const formatearFecha = (iso) => new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

const TABLA_LABEL = {
  samples: 'Muestra',
  analysis_requests: 'Solicitud de análisis',
  analysis_request_items: 'Ensayo de la solicitud',
}

// Título legible de una fila de audit_log — con includePayload:true el
// service manda oldData/newData (snapshot completo de la fila antes/
// después). Cuando cambia `status` se arma un título específico
// ("Solicitud: RECIBIDA → EN_PROCESO"); para el resto de los UPDATE (no
// hay forma genérica de resumir "cambiaron 3 campos" sin inventar), cae a
// un título genérico.
function tituloEntrada(entry) {
  const tabla = TABLA_LABEL[entry.tableName] ?? entry.tableName
  if (entry.action === 'INSERT') return `${tabla} creada`
  if (entry.action === 'DELETE') return `${tabla} eliminada`
  const antes = entry.oldData?.status
  const despues = entry.newData?.status
  if (antes && despues && antes !== despues) {
    return `${tabla}: ${antes.replace(/_/g, ' ')} → ${despues.replace(/_/g, ' ')}`
  }
  return `${tabla} actualizada`
}

// Fallback sin audit_log — mismos eventos que esta pestaña mostraba antes
// de conectar GET /iam/audit-log, reconstruidos a partir de datos que el
// modal ya tenía cargados (sin necesitar `audit:read`). Se usa solo cuando
// la auditoría real no está disponible (permiso o error), para no dejar la
// pestaña vacía.
function eventosDerivados(detalle, solicitudDetalle) {
  const eventos = [{ fecha: detalle.sampledAt, titulo: 'Muestra tomada', detalle: `por ${detalle.sampledBy.name}` }]

  if (!solicitudDetalle) return eventos

  eventos.push({
    fecha: solicitudDetalle.requestedAt,
    titulo: 'Solicitud de análisis creada',
    detalle: `${solicitudDetalle.effectiveType} · por ${solicitudDetalle.requestedBy.name}`,
  })

  if (solicitudDetalle.reception) {
    eventos.push({
      fecha: solicitudDetalle.reception.receivedAt,
      titulo: 'Muestra recibida en laboratorio',
      detalle: `por ${solicitudDetalle.reception.receivedBy.name}`,
    })
  }

  if (solicitudDetalle.status === 'RECHAZADA' && solicitudDetalle.acceptanceEvaluation) {
    eventos.push({
      fecha: solicitudDetalle.acceptanceEvaluation.evaluatedAt,
      titulo: 'Muestra rechazada',
      detalle: `por ${solicitudDetalle.acceptanceEvaluation.evaluatedBy.name}`,
    })
  }

  return eventos
}

// Pestaña "Trazabilidad" del detalle de muestra (ModalDetalleMuestra.jsx,
// Calidad). GET /iam/audit-log YA EXISTE en el backend (comrural_erp_backend/
// src/iam/controllers/audit-log.controller.ts) — solo lo tenía sin conectar
// el frontend. Trae la auditoría REAL de `samples`/`analysis_requests`
// (trigger audit_generic(), migración 0006): quién, cuándo, qué cambió.
// Requiere el permiso `audit:read` — hoy solo lo tiene `superadmin`, no
// `calidad` (0006_audit_log.sql) — si el usuario logueado no lo tiene, el
// 403 se muestra como aviso en vez de error duro, y la sección igual
// funciona con lo que sí puede ver.
//
// Los eventos de informe (creado/enviado a validación/validado) NO salen de
// audit_log — `laboratory_reports` no está en TABLA_LABEL porque un mismo
// registro va cambiando de fila entera en algunos pasos (createdAt,
// validatedAt) — se arman directo desde `informes` (GET .../reports, la
// misma fuente que la pestaña "Informe"), así que ya son reales, no mock.
export default function SeccionTrazabilidadMuestra({ detalle, solicitudDetalle, informes }) {
  const [entradasAudit, setEntradasAudit] = useState(null) // null = cargando
  const [sinPermiso, setSinPermiso] = useState(false)
  const [errorCarga, setErrorCarga] = useState(null)

  useEffect(() => {
    let cancelado = false
    setEntradasAudit(null)
    setSinPermiso(false)
    setErrorCarga(null)

    const pedidos = [auditLogService.listar({ tableName: 'samples', recordId: detalle.id, limit: 50 })]
    if (solicitudDetalle) {
      pedidos.push(auditLogService.listar({ tableName: 'analysis_requests', recordId: solicitudDetalle.id, limit: 50 }))
    }

    Promise.all(pedidos)
      .then((respuestas) => {
        if (cancelado) return
        setEntradasAudit(respuestas.flatMap((r) => r.data))
      })
      .catch((err) => {
        if (cancelado) return
        if (err.status === 403) {
          setSinPermiso(true)
          setEntradasAudit([])
        } else {
          setErrorCarga(err.message)
          setEntradasAudit([])
        }
      })

    return () => {
      cancelado = true
    }
  }, [detalle.id, solicitudDetalle])

  if (entradasAudit === null) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-3 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  // Con audit_log disponible, esas entradas ya cubren "muestra creada"/
  // "solicitud creada"/cambios de estado con más precisión (actor real,
  // timestamp real de la fila) que reconstruirlo a mano — pero si el
  // usuario no tiene `audit:read` (sinPermiso) o la carga falló, no hay
  // que dejarlo sin nada: se arman los mismos eventos "a mano" a partir de
  // los datos que el modal YA tiene cargados (sin permiso extra), igual
  // que hacía esta pestaña antes de conectar el endpoint real.
  const eventos =
    entradasAudit.length > 0
      ? entradasAudit.map((entry) => ({
          fecha: entry.createdAt,
          titulo: tituloEntrada(entry),
          detalle: entry.userEmail ?? 'Sistema',
        }))
      : eventosDerivados(detalle, solicitudDetalle)
  const usandoAuditoriaReal = entradasAudit.length > 0

  for (const informe of informesVigentes(informes)) {
    eventos.push({
      fecha: informe.createdAt,
      titulo: `Informe ${etiquetaInforme(informe)}: creado`,
      detalle: 'Laboratorio',
    })
    if (informe.status !== 'BORRADOR') {
      eventos.push({
        fecha: informe.lastSavedAt ?? informe.createdAt,
        titulo: `Informe ${etiquetaInforme(informe)}: ${REPORT_STATUS_LABEL.PENDIENTE_VALIDACION.toLowerCase()}`,
        detalle: 'Laboratorio',
      })
    }
    if (informe.status === 'VALIDADO') {
      eventos.push({
        fecha: informe.validatedAt,
        titulo: `Informe ${etiquetaInforme(informe)}: validado`,
        detalle: 'Laboratorio',
      })
    }
  }

  eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl bg-marron-arcilla/10 px-4 py-3 text-xs text-marron-cafe/70">
        {usandoAuditoriaReal
          ? 'Los eventos de muestra/solicitud vienen de la auditoría real del backend (audit_log); los de informe, del propio registro de Laboratorio.'
          : 'Los eventos de muestra/solicitud se arman con los datos que ya carga esta pantalla (no audit_log); los de informe, del propio registro de Laboratorio.'}
      </p>

      {sinPermiso && (
        <p className="flex items-center gap-2 rounded-2xl bg-marron-arcilla/10 px-4 py-3 text-xs font-medium text-marron-arcilla">
          <ShieldAlert className="size-4 shrink-0" strokeWidth={2} />
          Tu usuario no tiene permiso para ver la auditoría real (`audit:read`) — mostrando una línea de tiempo
          simplificada en su lugar.
        </p>
      )}
      {errorCarga && (
        <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar la auditoría: {errorCarga}</p>
      )}

      {eventos.length === 0 ? (
        <p className="rounded-2xl bg-marron-tierra/5 px-4 py-8 text-center text-sm text-marron-cafe/50">
          Todavía no hay eventos para mostrar.
        </p>
      ) : (
        <ol className="flex flex-col">
          {eventos.map((e, i) => (
            <li key={`${e.titulo}-${e.fecha}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="mt-1 size-3 shrink-0 rounded-full bg-verde-lima" />
                {i < eventos.length - 1 && <div className="w-px flex-1 bg-marron-tierra/15" />}
              </div>
              <div className="min-w-0 flex-1 pb-5">
                <p className="text-sm font-semibold text-marron-cafe">{e.titulo}</p>
                <p className="text-xs text-marron-cafe/50">
                  {formatearFecha(e.fecha)} · {e.detalle}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
