import { useEffect, useState } from 'react'
import { FlaskConical, PackageCheck, Clock, CheckCircle2, Scale } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import ModalRecibirMuestra from '../calidad/ModalRecibirMuestra.jsx'
import FormularioSubdividirMuestra from './FormularioSubdividirMuestra.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'
import PillTabs from '../dashboard/PillTabs.jsx'

// Pestaña "Pendientes" de Laboratorio — Calidad solicita el análisis
// (SeccionMuestras.jsx, en el sub-item Muestras de Calidad), la solicitud
// aparece acá con estado PENDIENTE_MUESTRA, y es Laboratorio quien la
// recibe (POST /analysis-requests/:requestId/receive-sample). Al revés de
// como lo tenía antes — "Recibir muestra" vivía mal puesto del lado de
// Calidad, se movió acá a pedido explícito: Calidad pide, Laboratorio
// recibe, son roles distintos aunque hoy el mismo permiso (calidad) los
// cubra a los dos.
//
// "Iniciar/Continuar análisis" NO vive acá — a pedido explícito, esa acción
// se mudó a la pestaña "Solicitudes" (SeccionSolicitudes.jsx): solo aparece
// una vez que la solicitud quedó asignada a "Laboratorio interno" en
// "Asignar laboratorio" (ver FormularioSubdividirMuestra.jsx). Acá en
// Pendientes solo se recibe la muestra y se le asigna laboratorio — el
// trabajo de análisis en sí se organiza por destino, no por cola de
// llegada.
const TONO_ESTADO_SOLICITUD = {
  PENDIENTE_MUESTRA: 'alerta',
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  ANALIZADA: 'positivo',
  RECHAZADA: 'negativo',
}

// Subpestañas de "Pendientes": "Por recibir" (PENDIENTE_MUESTRA, la cola
// real de trabajo de Laboratorio) y "Recibidas" (todo lo que ya pasó ese
// paso) — antes convivían en una sola tabla, a pedido explícito se separan
// para que "Pendientes" no se llene de solicitudes que ya no requieren
// acción de recepción.
const SUBPESTAÑAS_PENDIENTES = [
  { id: 'por-recibir', nombre: 'Por recibir', Icon: Clock },
  { id: 'recibidas', nombre: 'Recibidas', Icon: CheckCircle2 },
]

export default function SeccionPendientes() {
  const { permisos } = useAuth()
  const puedeRecibir = permisos.has('analysis-requests:receive')
  // "Asignar laboratorio" reusa analysis-requests:update porque no tiene un
  // permiso propio (ver analysis-request.controller.ts) — mismo criterio
  // que ya se usaba acá para "Iniciar análisis".
  const puedeAsignarLaboratorio = permisos.has('analysis-requests:update')

  const [subPestaña, setSubPestaña] = useState('por-recibir')
  const [solicitudes, setSolicitudes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [recibirPara, setRecibirPara] = useState(null) // solicitud | null
  const [asignacionEnCurso, setAsignacionEnCurso] = useState(null) // detalle completo | null
  const [cargandoAsignacionId, setCargandoAsignacionId] = useState(null)
  const [errorAsignacion, setErrorAsignacion] = useState(null)

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

  const alRecibir = (detalleActualizado) => {
    setSolicitudes((prev) =>
      prev.map((s) =>
        s.id === detalleActualizado.id
          ? { ...s, status: detalleActualizado.status, acceptanceCriteriaMet: detalleActualizado.acceptanceCriteriaMet }
          : s,
      ),
    )
    setRecibirPara(null)
  }

  // "Asignar laboratorio" — para una solicitud ya RECIBIDA, abre el
  // asistente de 3 pasos (ver FormularioSubdividirMuestra.jsx): qué ensayos
  // procesar, a qué laboratorio va cada uno, y cuánto peso le manda a cada
  // uno. Hace falta el detalle completo (items[]), que el listado no trae.
  const alClicarAsignarLaboratorio = async (solicitudId) => {
    setErrorAsignacion(null)
    setCargandoAsignacionId(solicitudId)
    try {
      const detalle = await analysisRequestsService.obtener(solicitudId)
      setAsignacionEnCurso(detalle)
    } catch (err) {
      setErrorAsignacion(err.message)
    } finally {
      setCargandoAsignacionId(null)
    }
  }

  if (asignacionEnCurso) {
    return <FormularioSubdividirMuestra solicitud={asignacionEnCurso} onVolver={() => setAsignacionEnCurso(null)} />
  }

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  if (solicitudes === null) {
    return (
      <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  const solicitudesFiltradas = solicitudes.filter((s) =>
    subPestaña === 'por-recibir' ? s.status === 'PENDIENTE_MUESTRA' : s.status !== 'PENDIENTE_MUESTRA',
  )

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Solicitudes de análisis</h2>
        <p className="text-xs text-marron-cafe/40">
          {subPestaña === 'por-recibir'
            ? 'Solicitudes que pidió Calidad y todavía esperan que Laboratorio confirme que las recibió.'
            : 'Solicitudes que Laboratorio ya recibió, en cualquier etapa posterior.'}
        </p>
      </div>

      <PillTabs pestañas={SUBPESTAÑAS_PENDIENTES} activa={subPestaña} onCambiar={setSubPestaña} />

      {errorAsignacion && (
        <p className="text-sm font-medium text-rojo-pasankalla">No se pudo abrir la asignación: {errorAsignacion}</p>
      )}

      {solicitudesFiltradas.length === 0 ? (
        <EmptyState
          Icon={FlaskConical}
          titulo={
            subPestaña === 'por-recibir'
              ? 'No hay solicitudes por recibir'
              : 'Todavía no se recibió ninguna solicitud'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
          {solicitudesFiltradas.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0"
            >
              <span className="font-mono text-xs font-semibold text-marron-cafe/70">{s.sample.code}</span>
              <span className="text-sm text-marron-cafe">{s.product.name}</span>
              <span className="font-mono text-xs text-marron-cafe/50">{s.lot.code}</span>
              <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
              <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'neutro'} className="ml-auto">
                {s.status.replace(/_/g, ' ')}
              </Badge>
              {s.status === 'PENDIENTE_MUESTRA' && puedeRecibir && (
                <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => setRecibirPara(s)}>
                  <PackageCheck className="size-3.5" strokeWidth={2} />
                  Recibir
                </Button>
              )}
              {(s.status === 'RECIBIDA' || s.status === 'EN_PROCESO') && puedeAsignarLaboratorio && (
                <Button
                  variant="secondary"
                  className="gap-1.5 px-3 py-1.5 text-xs"
                  disabled={cargandoAsignacionId === s.id}
                  onClick={() => alClicarAsignarLaboratorio(s.id)}
                >
                  <Scale className="size-3.5" strokeWidth={2} />
                  {cargandoAsignacionId === s.id ? 'Abriendo…' : 'Asignar laboratorio'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <ModalRecibirMuestra
        abierto={recibirPara !== null}
        muestraCodigo={recibirPara?.sample.code}
        solicitudId={recibirPara?.id}
        onCerrar={() => setRecibirPara(null)}
        onRecibida={alRecibir}
      />
    </section>
  )
}
