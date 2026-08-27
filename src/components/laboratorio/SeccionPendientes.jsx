import { useEffect, useRef, useState } from 'react'
import { FlaskConical, PackageCheck, Clock, CheckCircle2, Scale, ClipboardCheck, Beaker } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { analysisExecutionsService } from '../../services/analysisExecutionsService'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import ModalRecibirMuestra from '../calidad/ModalRecibirMuestra.jsx'
import FormularioAsignarLaboratorio from './FormularioAsignarLaboratorio.jsx'
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
// "Analizar" (cargar resultados) NO vive acá — a pedido explícito, esa
// acción se mudó a la pestaña "Solicitudes" (SeccionSolicitudes.jsx): solo
// aparece una vez que la solicitud quedó asignada a "Laboratorio interno"
// en "Asignar laboratorio" (ver FormularioAsignarLaboratorio.jsx). Acá en
// Pendientes solo se recibe la muestra y se le asigna modalidad — el
// trabajo de análisis en sí se organiza por destino, no por cola de
// llegada.
const TONO_ESTADO_SOLICITUD = {
  PENDIENTE_MUESTRA: 'alerta',
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  PENDIENTE_EXTERNOS: 'alerta',
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
  const puedeAsignarLaboratorio = permisos.has('analysis-requests:assign-modality')

  const [subPestaña, setSubPestaña] = useState('por-recibir')
  const [solicitudes, setSolicitudes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [recibirPara, setRecibirPara] = useState(null) // solicitud | null
  // { detalle, soloLectura } | null
  const [asignacionEnCurso, setAsignacionEnCurso] = useState(null)
  const [cargandoAsignacionId, setCargandoAsignacionId] = useState(null)
  const [errorAsignacion, setErrorAsignacion] = useState(null)

  // Detalle (items[] con su modalidad asignada) de cada solicitud RECIBIDA/
  // EN_PROCESO — hace falta para saber si YA se le asignó laboratorio a
  // todos los ensayos (así se decide "Asignar laboratorio" vs "Revisar").
  // El listado no trae items[], hay que pedirlo aparte por solicitud.
  const [detallePorSolicitud, setDetallePorSolicitud] = useState({})
  const pedidosId = useRef(new Set())

  // Ejecuciones internas ya abiertas (con su submuestra) — solo se piden
  // para solicitudes con TODOS sus ensayos ya asignados y al menos uno
  // interno, que es el único caso donde hace falta distinguir "ya preparó
  // la submuestra" de "asignó modalidad pero se fue antes del paso 2". El
  // backend no congela la modalidad hasta que existe la ejecución (ver
  // AnalysisRequestsService.assignModality / findItemsWithStartedRoute),
  // así que sin este chequeo el botón mostraba "Revisar" (solo lectura) y
  // ya no dejaba volver a cargar la cantidad preparada.
  const [ejecucionesPorSolicitud, setEjecucionesPorSolicitud] = useState({})
  const pedidosEjecucionesId = useRef(new Set())

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

  useEffect(() => {
    if (!solicitudes) return
    const aPedir = solicitudes.filter(
      (s) => (s.status === 'RECIBIDA' || s.status === 'EN_PROCESO') && !pedidosId.current.has(s.id),
    )
    if (aPedir.length === 0) return
    aPedir.forEach((s) => pedidosId.current.add(s.id))
    let cancelado = false

    Promise.allSettled(aPedir.map((s) => analysisRequestsService.obtener(s.id))).then((resultados) => {
      if (cancelado) return
      setDetallePorSolicitud((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[aPedir[i].id] = r.status === 'fulfilled' ? r.value : 'error'
        })
        return siguiente
      })
    })

    return () => {
      cancelado = true
    }
  }, [solicitudes])

  useEffect(() => {
    const candidatos = Object.entries(detallePorSolicitud)
      .filter(([id, detalle]) => {
        if (!detalle || detalle === 'error' || pedidosEjecucionesId.current.has(id)) return false
        const activos = detalle.items.filter((i) => i.status !== 'REMOVED')
        const todosAsignados = activos.length > 0 && activos.every((i) => i.assignedExecutionMode)
        return todosAsignados && activos.some((i) => i.assignedExecutionMode === 'INTERNAL')
      })
      .map(([id]) => id)
    if (candidatos.length === 0) return
    candidatos.forEach((id) => pedidosEjecucionesId.current.add(id))
    let cancelado = false

    Promise.allSettled(candidatos.map((id) => analysisExecutionsService.listarPorSolicitud(id))).then((resultados) => {
      if (cancelado) return
      setEjecucionesPorSolicitud((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[candidatos[i]] = r.status === 'fulfilled' ? r.value : []
        })
        return siguiente
      })
    })

    return () => {
      cancelado = true
    }
  }, [detallePorSolicitud])

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
  // asistente (ver FormularioAsignarLaboratorio.jsx): qué ensayos van a
  // Laboratorio interno o a uno externo, y cuánta muestra se prepara para
  // lo interno. Hace falta el detalle completo (items[]), que el listado
  // no trae.
  const alClicarAsignarLaboratorio = async (solicitudId, soloLectura, pasoInicial) => {
    setErrorAsignacion(null)
    setCargandoAsignacionId(solicitudId)
    try {
      const yaCargado = detallePorSolicitud[solicitudId]
      const detalle = yaCargado && yaCargado !== 'error' ? yaCargado : await analysisRequestsService.obtener(solicitudId)
      setAsignacionEnCurso({ detalle, soloLectura, pasoInicial })
    } catch (err) {
      setErrorAsignacion(err.message)
    } finally {
      setCargandoAsignacionId(null)
    }
  }

  if (asignacionEnCurso) {
    return (
      <FormularioAsignarLaboratorio
        solicitud={asignacionEnCurso.detalle}
        soloLectura={asignacionEnCurso.soloLectura}
        pasoInicial={asignacionEnCurso.pasoInicial}
        onVolver={() => setAsignacionEnCurso(null)}
        // Abrir el trabajo interno mueve la solicitud a EN_PROCESO del lado
        // del servidor — se refleja en la lista sin recargar todo.
        onActualizada={(detalle) => {
          setSolicitudes((prev) => prev.map((s) => (s.id === detalle.id ? { ...s, status: detalle.status } : s)))
          setDetallePorSolicitud((prev) => ({ ...prev, [detalle.id]: detalle }))
          // Se acaba de abrir/tocar el trabajo interno — invalida el caché
          // de ejecuciones para que se vuelva a pedir si hace falta.
          pedidosEjecucionesId.current.delete(detalle.id)
        }}
      />
    )
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
          {solicitudesFiltradas.map((s) => {
            const detalle = detallePorSolicitud[s.id]
            const itemsActivos = detalle && detalle !== 'error' ? detalle.items.filter((i) => i.status !== 'REMOVED') : null
            const todosAsignados = itemsActivos !== null && itemsActivos.length > 0 && itemsActivos.every((i) => i.assignedExecutionMode)
            const internos = itemsActivos?.filter((i) => i.assignedExecutionMode === 'INTERNAL') ?? []
            const ejecuciones = ejecucionesPorSolicitud[s.id]
            // Con todo asignado, si hay ensayos internos hace falta además
            // que exista su ejecución (submuestra ya preparada) — mientras
            // no exista, el backend todavía deja corregir la modalidad y
            // falta el paso de preparación, así que no puede pasar a "solo
            // lectura" (ver comentario de ejecucionesPorSolicitud arriba).
            const esperandoEjecuciones = todosAsignados && internos.length > 0 && ejecuciones === undefined
            const faltaPreparar = todosAsignados && internos.length > 0 && ejecuciones !== undefined && ejecuciones.length === 0
            const completo = todosAsignados && !esperandoEjecuciones && !faltaPreparar
            return (
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
                {(s.status === 'RECIBIDA' || s.status === 'EN_PROCESO') &&
                  puedeAsignarLaboratorio &&
                  (esperandoEjecuciones ? (
                    <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" disabled>
                      <Scale className="size-3.5" strokeWidth={2} />…
                    </Button>
                  ) : completo ? (
                    <Button
                      variant="secondary"
                      className="gap-1.5 px-3 py-1.5 text-xs"
                      disabled={cargandoAsignacionId === s.id}
                      onClick={() => alClicarAsignarLaboratorio(s.id, true)}
                    >
                      <ClipboardCheck className="size-3.5" strokeWidth={2} />
                      {cargandoAsignacionId === s.id ? 'Abriendo…' : 'Revisar'}
                    </Button>
                  ) : faltaPreparar ? (
                    <Button
                      variant="secondary"
                      className="gap-1.5 px-3 py-1.5 text-xs"
                      disabled={cargandoAsignacionId === s.id}
                      onClick={() => alClicarAsignarLaboratorio(s.id, false, 'preparacion')}
                    >
                      <Beaker className="size-3.5" strokeWidth={2} />
                      {cargandoAsignacionId === s.id ? 'Abriendo…' : 'Preparar muestra'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="gap-1.5 px-3 py-1.5 text-xs"
                      disabled={cargandoAsignacionId === s.id}
                      onClick={() => alClicarAsignarLaboratorio(s.id, false, 'modalidad')}
                    >
                      <Scale className="size-3.5" strokeWidth={2} />
                      {cargandoAsignacionId === s.id ? 'Abriendo…' : 'Asignar laboratorio'}
                    </Button>
                  ))}
              </div>
            )
          })}
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
