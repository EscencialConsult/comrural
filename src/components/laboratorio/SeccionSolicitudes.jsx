import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { FlaskConical, ShieldCheck, PackageSearch, Send, Info, Clock, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { analysisExecutionsService } from '../../services/analysisExecutionsService'
import { externalShipmentsService } from '../../services/externalShipmentsService'
import { listarTodo } from '../../services/paginacion'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'
import PillTabs from '../dashboard/PillTabs.jsx'
import FormularioAutorizarEnvio from './FormularioAutorizarEnvio.jsx'
import FormularioIniciarAnalisis from './FormularioIniciarAnalisis.jsx'

const SUBPESTAÑAS_SOLICITUDES = [
  { id: 'pendientes', nombre: 'Pendientes', Icon: Clock },
  { id: 'en-curso', nombre: 'Con envío/análisis en curso', Icon: CheckCircle2 },
]

const TONO_ESTADO_SOLICITUD = {
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  PENDIENTE_EXTERNOS: 'alerta',
  ANALIZADA: 'positivo',
}

// Cómo se ve cada estado de un envío externo en la fila.
const ESTADO_ENVIO = {
  BORRADOR: { label: 'Borrador', tono: 'neutro' },
  PENDIENTE_GAC: { label: 'Espera GAC', tono: 'alerta' },
  PENDIENTE_GG: { label: 'Espera Gerencia', tono: 'alerta' },
  AUTORIZADO: { label: 'Autorizado', tono: 'positivo' },
  ENVIADO: { label: 'Enviado', tono: 'positivo' },
  RESULTADO_RECIBIDO: { label: 'Resultado recibido', tono: 'positivo' },
  CERRADO: { label: 'Cerrado', tono: 'positivo' },
  ANULADO: { label: 'Anulado', tono: 'negativo' },
}

// Subpestaña "Solicitudes" de Laboratorio — lo ya recibido, separado por
// dónde se procesa cada cosa. Todo sale del backend real:
// `items[].assignedExecutionMode` (asignado en "Asignar laboratorio") y la
// lista de envíos externos.
//
// Dos sub-pestañas (Pendientes / Con envío-análisis en curso), y cada una
// con dos tablas (interno / externo) — pedido explícito: nada de una
// tarjeta por solicitud o por envío, todo agrupado. Los ensayos de cada
// fila arrancan colapsados; se despliegan con el botón de la columna
// "Ensayos" en vez de mostrarse todos de una — antes solo pasaba para
// laboratorio interno, ahora también para externo (elegir a qué envío va
// cada ensayo se mudó DENTRO de FormularioAutorizarEnvio.jsx).
export default function SeccionSolicitudes() {
  const { permisos } = useAuth()
  // "Analizar" crea/edita informes internos — el permiso real es
  // laboratory-reports:manage, no analysis-requests:update (que es para
  // editar la solicitud en sí).
  const puedeIniciarAnalisis = permisos.has('laboratory-reports:manage')
  const puedeGestionarEnvios = permisos.has('external-shipments:manage')

  const [solicitudes, setSolicitudes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  // { solicitud, ensayos, envio } — el envío externo que se está armando o
  // gestionando. `envio` null = todavía no existe, se está creando. Con
  // envío nuevo, `ensayos` lleva TODOS los pendientes de externo de esa
  // solicitud — cuál de ellos entra en este envío puntual se elige dentro
  // del formulario (ver FormularioAutorizarEnvio.jsx).
  const [envioAbierto, setEnvioAbierto] = useState(null)
  const [analisisEnCurso, setAnalisisEnCurso] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  const [detallePorSolicitud, setDetallePorSolicitud] = useState({})
  const [enviosPorSolicitud, setEnviosPorSolicitud] = useState({})
  const pedidosId = useRef(new Set())

  const [subVista, setSubVista] = useState('pendientes')
  // Filas (de cualquiera de las 4 tablas) que están desplegadas, mostrando
  // sus ensayos — arrancan todas colapsadas. Clave: id de la solicitud, o
  // id del envío para la tabla de envíos armados (no se pisan entre sí).
  const [filaDesplegada, setFilaDesplegada] = useState(new Set())
  const alternarDesplegado = (id) => {
    setFilaDesplegada((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  // Ejecuciones internas ya abiertas (con su submuestra) por solicitud —
  // hace falta para no dejar "Analizar" disponible si el ensayo interno
  // todavía no tiene la submuestra preparada (ver FormularioAsignarLaboratorio.jsx,
  // paso "Preparación"). El backend deja crear el borrador de la planilla
  // igual sin ejecución, pero eso perdería de qué cantidad partió el
  // análisis, así que se bloquea acá. También decide si la solicitud cae
  // en "Pendientes" (sin ejecución todavía) o "En curso" (ya la tiene).
  const [ejecucionesPorSolicitud, setEjecucionesPorSolicitud] = useState({})
  const pedidosEjecucionesId = useRef(new Set())

  const cargar = useCallback(async () => {
    try {
      const solicitudes = await listarTodo(analysisRequestsService.listar)
      // Al recargar la lista, limpiar el caché de detalles y envíos para que
      // el useEffect siguiente vuelva a pedirlos todos. Sin esto, si el
      // componente se desmonta y remonta (p.ej. al cambiar de pestaña),
      // pedidosId conserva los IDs ya vistos y el efecto no pide nada →
      // detallePorSolicitud queda vacío → la vista sale en blanco.
      pedidosId.current = new Set()
      pedidosEjecucionesId.current = new Set()
      setDetallePorSolicitud({})
      setEnviosPorSolicitud({})
      setEjecucionesPorSolicitud({})
      setSolicitudes(solicitudes.filter((s) => s.status !== 'PENDIENTE_MUESTRA' && s.status !== 'RECHAZADA'))
    } catch (err) {
      setErrorCarga(err.message)
    }
  }, [])

  useEffect(() => {
    cargar()
    // Al desmontar (cambio de pestaña), limpiar el registro de IDs ya pedidos
    // para que la próxima vez que el componente monte vuelva a cargar todo.
    return () => {
      pedidosId.current = new Set()
      pedidosEjecucionesId.current = new Set()
    }
  }, [cargar])

  // Detalle (items[] con su modalidad asignada) + envíos, por solicitud. El
  // listado no trae ninguna de las dos cosas, hace falta pedirlas aparte.
  useEffect(() => {
    if (!solicitudes) return
    const aPedir = solicitudes.filter((s) => !pedidosId.current.has(s.id))
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

    Promise.allSettled(aPedir.map((s) => externalShipmentsService.listarPorSolicitud(s.id))).then((resultados) => {
      if (cancelado) return
      setEnviosPorSolicitud((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[aPedir[i].id] = r.status === 'fulfilled' ? r.value : []
        })
        return siguiente
      })
    })

    return () => {
      cancelado = true
    }
  }, [solicitudes])

  // Ejecuciones internas, solo para las solicitudes con algún ensayo
  // INTERNAL — es lo único que dice si ya se preparó la submuestra.
  useEffect(() => {
    const candidatos = Object.entries(detallePorSolicitud)
      .filter(([id, detalle]) => {
        if (!detalle || detalle === 'error' || pedidosEjecucionesId.current.has(id)) return false
        return detalle.items.some((i) => i.status !== 'REMOVED' && i.assignedExecutionMode === 'INTERNAL')
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

  // Vuelve a pedir detalle + envíos de UNA solicitud, después de una acción
  // que los pudo cambiar (armar un envío, firmar, iniciar análisis).
  const refrescarSolicitud = useCallback(async (requestId) => {
    const [detalle, envios] = await Promise.allSettled([
      analysisRequestsService.obtener(requestId),
      externalShipmentsService.listarPorSolicitud(requestId),
    ])
    if (detalle.status === 'fulfilled') {
      setDetallePorSolicitud((prev) => ({ ...prev, [requestId]: detalle.value }))
      setSolicitudes((prev) => prev?.map((s) => (s.id === requestId ? { ...s, status: detalle.value.status } : s)))
    }
    if (envios.status === 'fulfilled') {
      setEnviosPorSolicitud((prev) => ({ ...prev, [requestId]: envios.value }))
    }
  }, [])

  // Abre la vista de planillas (FormularioIniciarAnalisis.jsx). Ya NO llama
  // a POST .../start-analysis — esa transición RECIBIDA -> EN_PROCESO la
  // hace `analysisExecutionsService.crear` al abrir el trabajo interno
  // (ver FormularioAsignarLaboratorio.jsx, paso "Preparación"). El backend
  // deja crear el borrador de una planilla (laboratoryReportsService.crearInterno)
  // sin que exista ejecución todavía, pero acá se bloquea el botón hasta
  // que la submuestra esté preparada — a pedido explícito, para no perder
  // de qué cantidad partió el análisis.
  const alClicarAnalizar = (solicitudId) => {
    setErrorAccion(null)
    const detalle = detallePorSolicitud[solicitudId]
    if (detalle && detalle !== 'error') setAnalisisEnCurso(detalle)
  }

  if (analisisEnCurso) {
    return (
      <FormularioIniciarAnalisis
        solicitud={analisisEnCurso}
        onVolver={() => {
          refrescarSolicitud(analisisEnCurso.id)
          setAnalisisEnCurso(null)
        }}
      />
    )
  }

  if (envioAbierto) {
    return (
      <FormularioAutorizarEnvio
        solicitud={envioAbierto.solicitud}
        ensayos={envioAbierto.ensayos}
        envio={envioAbierto.envio}
        onVolver={() => {
          refrescarSolicitud(envioAbierto.solicitud.id)
          setEnvioAbierto(null)
        }}
      />
    )
  }

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  if (solicitudes === null) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  // Cada fila lleva { s, detalle, envios }. Sin detalle todavía cargado, la
  // solicitud queda en "Sin clasificar" en vez de desaparecer.
  const filas = solicitudes.map((s) => {
    const detalle = detallePorSolicitud[s.id]
    return {
      s,
      detalle: detalle && detalle !== 'error' ? detalle : null,
      envios: enviosPorSolicitud[s.id] ?? [],
    }
  })

  const itemsActivos = (detalle) => detalle.items.filter((i) => i.status !== 'REMOVED')

  // Laboratorio interno, separado en dos: `ejecuciones` dice si ya se
  // preparó la submuestra (undefined mientras se está pidiendo, [] si
  // todavía no) — eso decide si la solicitud es "pendiente" (nada
  // arrancado todavía) o "en curso" (ya se puede/pudo analizar).
  const internosTodos = filas
    .filter(({ detalle }) => detalle && itemsActivos(detalle).some((i) => i.assignedExecutionMode === 'INTERNAL'))
    .map(({ s, detalle }) => ({
      s,
      ensayos: itemsActivos(detalle).filter((i) => i.assignedExecutionMode === 'INTERNAL'),
      ejecuciones: ejecucionesPorSolicitud[s.id],
    }))
  const internosPendientes = internosTodos.filter(({ ejecuciones }) => ejecuciones === undefined || ejecuciones.length === 0)
  const internosEnCurso = internosTodos.filter(({ ejecuciones }) => ejecuciones !== undefined && ejecuciones.length > 0)

  // Externo pendiente — ensayos que todavía no viajan en ningún envío
  // vigente. Qué ensayos puntuales van en el próximo envío se elige DENTRO
  // de FormularioAutorizarEnvio — "Armar envío" pasa la lista completa de
  // pendientes de esta solicitud.
  const porDespachar = filas
    .map(({ s, detalle, envios }) => {
      if (!detalle) return null
      const yaEnviados = new Set(
        envios.filter((e) => e.status !== 'ANULADO').flatMap((e) => e.items.map((i) => i.itemId)),
      )
      const pendientes = itemsActivos(detalle).filter(
        (i) => i.assignedExecutionMode === 'EXTERNAL' && !yaEnviados.has(i.id),
      )
      if (pendientes.length === 0) return null
      // El backend no deja crear NINGÚN envío (ni siquiera con un
      // subconjunto) mientras la solicitud tenga otros ensayos todavía sin
      // pasar por "Asignar laboratorio" — assertNoPendingAssignments corre
      // sobre TODOS los ensayos activos de la solicitud, no solo los que
      // van en este envío puntual (ver external-shipments.service.ts). Acá
      // se detecta ese caso de antemano para avisar, en vez de dejar que
      // el 409 sea la primera noticia recién al clickear "Crear envío".
      const sinAsignar = itemsActivos(detalle).filter((i) => !i.assignedExecutionMode)
      return { s, detalle, ensayos: pendientes, sinAsignar }
    })
    .filter(Boolean)

  // Externo en curso — un envío ya armado por fila (una sola tabla, no una
  // tarjeta por cada uno).
  const enviosArmados = filas.flatMap(({ s, detalle, envios }) =>
    envios
      .filter((e) => e.status !== 'ANULADO')
      .map((envio) => ({
        s,
        detalle,
        envio,
        ensayos: envio.items.map((i) => ({ id: i.itemId, name: i.testName, isCustom: false })),
      })),
  )

  const sinClasificar = filas.filter(
    ({ detalle }) => detalle && itemsActivos(detalle).every((i) => !i.assignedExecutionMode),
  )

  const hayPendientes = internosPendientes.length > 0 || porDespachar.length > 0 || sinClasificar.length > 0
  const hayEnCurso = internosEnCurso.length > 0 || enviosArmados.length > 0

  const accionInternoPendiente = ({ ejecuciones }) =>
    puedeIniciarAnalisis &&
    (ejecuciones === undefined ? (
      <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" disabled>
        <FlaskConical className="size-3.5 shrink-0" strokeWidth={2} />…
      </Button>
    ) : (
      <span className="flex items-center gap-1.5 rounded-full bg-marron-arcilla/15 px-3 py-1.5 text-xs font-medium text-marron-arcilla">
        <Info className="size-3.5 shrink-0" strokeWidth={2} />
        Falta preparar muestra
      </span>
    ))

  const accionInternoEnCurso = ({ s }) =>
    puedeIniciarAnalisis && (
      <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => alClicarAnalizar(s.id)}>
        <FlaskConical className="size-3.5 shrink-0" strokeWidth={2} />
        Analizar
      </Button>
    )

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Solicitudes recibidas</h2>
        <p className="text-xs text-marron-cafe/40">
          Separadas por dónde se procesa cada ensayo — el laboratorio interno trabaja acá mismo, lo externo se despacha
          con su circuito de autorización.
        </p>
      </div>

      <PillTabs pestañas={SUBPESTAÑAS_SOLICITUDES} activa={subVista} onCambiar={setSubVista} />

      {errorAccion && <p className="text-sm font-medium text-rojo-pasankalla">{errorAccion}</p>}

      {solicitudes.length === 0 ? (
        <EmptyState Icon={FlaskConical} titulo="Todavía no hay ninguna solicitud recibida" />
      ) : subVista === 'pendientes' ? (
        !hayPendientes ? (
          <EmptyState Icon={FlaskConical} titulo="Nada pendiente" descripcion="Asigná laboratorio desde Pendientes para empezar." />
        ) : (
          <>
            <TablaConEnsayos
              titulo="Laboratorio interno"
              Icon={FlaskConical}
              filas={internosPendientes}
              expandido={filaDesplegada}
              onAlternarExpandir={alternarDesplegado}
              renderAccion={accionInternoPendiente}
            />
            <TablaConEnsayos
              titulo="Por despachar a laboratorio externo"
              Icon={Send}
              filas={porDespachar}
              expandido={filaDesplegada}
              onAlternarExpandir={alternarDesplegado}
              renderAdvertencia={({ sinAsignar }) =>
                sinAsignar.length > 0 && (
                  <p className="flex items-start gap-1.5 rounded-xl bg-marron-arcilla/12 px-3 py-2 text-xs font-medium text-marron-arcilla">
                    <Info className="size-3.5 shrink-0 mt-0.5" strokeWidth={2} />
                    Esta solicitud tiene {sinAsignar.length} ensayo{sinAsignar.length === 1 ? '' : 's'} más sin asignar
                    laboratorio ({sinAsignar.map((i) => i.name).join(', ')}) — hay que asignarles modalidad primero,
                    desde Pendientes, o el envío no se va a poder crear.
                  </p>
                )
              }
              renderAccion={({ detalle, ensayos, sinAsignar }) =>
                puedeGestionarEnvios && (
                  <Button
                    variant="secondary"
                    className="gap-1.5 px-3 py-1.5 text-xs"
                    disabled={sinAsignar.length > 0}
                    title={sinAsignar.length > 0 ? 'Asigná laboratorio a todos los ensayos de esta solicitud primero' : undefined}
                    onClick={() => setEnvioAbierto({ solicitud: detalle, ensayos, envio: null })}
                  >
                    <Send className="size-3.5 shrink-0" strokeWidth={2} />
                    Armar envío
                  </Button>
                )
              }
            />
            {sinClasificar.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marron-tierra/10 text-marron-cafe/50">
                    <PackageSearch className="size-3.5 shrink-0" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-sm font-bold text-marron-cafe/70">Sin laboratorio asignado</h3>
                </div>
                <p className="text-xs text-marron-cafe/40">
                  Todavía no pasaron por "Asignar laboratorio" — se hace desde la pestaña Pendientes.
                </p>
                <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
                  {sinClasificar.map(({ s }) => (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0"
                    >
                      <span className="font-mono text-xs font-semibold text-marron-cafe/70">{s.sample.code}</span>
                      <span className="text-sm text-marron-cafe">{s.product.name}</span>
                      <span className="font-mono text-xs text-marron-cafe/50">{s.lot.code}</span>
                      <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'neutro'} className="ml-auto">
                        {s.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      ) : !hayEnCurso ? (
        <EmptyState Icon={FlaskConical} titulo="Nada en curso todavía" />
      ) : (
        <>
          <TablaConEnsayos
            titulo="Laboratorio interno"
            Icon={FlaskConical}
            filas={internosEnCurso}
            expandido={filaDesplegada}
            onAlternarExpandir={alternarDesplegado}
            renderAccion={accionInternoEnCurso}
          />
          <TablaConEnsayos
            titulo="Envíos a laboratorio externo"
            Icon={ShieldCheck}
            filas={enviosArmados}
            idDeFila={(fila) => fila.envio.id}
            expandido={filaDesplegada}
            onAlternarExpandir={alternarDesplegado}
            columnaExtra={{
              titulo: 'Estado',
              render: ({ envio }) => (
                <Badge tono={ESTADO_ENVIO[envio.status]?.tono ?? 'neutro'}>{ESTADO_ENVIO[envio.status]?.label ?? envio.status}</Badge>
              ),
            }}
            renderAccion={({ detalle, envio }) => (
              <Button
                variant="secondary"
                className="gap-1.5 px-3 py-1.5 text-xs"
                onClick={() => setEnvioAbierto({ solicitud: detalle, ensayos: null, envio })}
              >
                <ShieldCheck className="size-3.5 shrink-0" strokeWidth={2} />
                Ver envío
              </Button>
            )}
          />
        </>
      )}
    </section>
  )
}

// Tabla única reusada por los 4 casos (interno pendiente/en curso, externo
// pendiente/en curso) — pedido explícito: nada de una tarjeta por
// solicitud o por envío, todo agrupado en tablas. Los ensayos de cada fila
// arrancan colapsados y se despliegan con el botón de la columna
// "Ensayos", en vez de mostrarse todos de una.
function TablaConEnsayos({ titulo, Icon, filas, idDeFila, expandido, onAlternarExpandir, renderAccion, columnaExtra, renderAdvertencia }) {
  if (filas.length === 0) return null
  const columnasFijas = 6 + (columnaExtra ? 1 : 0) // Muestra, Producto, Lote, Tipo, Estado, Ensayos [, extra]
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marron-tierra/10 text-marron-cafe/60">
          <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-bold text-marron-cafe">{titulo}</h3>
        <span className="text-xs text-marron-cafe/40">
          {filas.length} solicitud{filas.length === 1 ? '' : 'es'}
        </span>
      </div>
      {/* Tarjetas en mobile — la tabla de abajo obliga a scrollear
          horizontal en pantallas angostas (min-w-[760px]). */}
      <div className="flex flex-col gap-2 md:hidden">
        {filas.map((fila) => {
          const { s, ensayos } = fila
          const filaId = idDeFila ? idDeFila(fila) : s.id
          const abierto = expandido.has(filaId)
          const advertencia = renderAdvertencia?.(fila)
          return (
            <div key={filaId} className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-marron-cafe/70">{s.sample.code}</p>
                  <p className="truncate text-sm text-marron-cafe">{s.product.name}</p>
                  <p className="font-mono text-xs text-marron-cafe/60">{s.lot.code}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
                  <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'neutro'}>{s.status.replace(/_/g, ' ')}</Badge>
                </div>
              </div>

              {columnaExtra && (
                <div className="border-t border-marron-tierra/10 pt-2 text-xs text-marron-cafe/60">
                  {columnaExtra.titulo}: {columnaExtra.render(fila)}
                </div>
              )}

              {advertencia && <div className="rounded-xl bg-marron-arcilla/5 p-2">{advertencia}</div>}

              <button
                type="button"
                onClick={() => onAlternarExpandir(filaId)}
                className="flex items-center gap-1 text-xs font-semibold text-marron-cafe/60 hover:text-marron-cafe"
              >
                {abierto ? (
                  <ChevronDown className="size-3.5 shrink-0" strokeWidth={2.25} />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0" strokeWidth={2.25} />
                )}
                {ensayos.length} ensayo{ensayos.length === 1 ? '' : 's'}
              </button>
              {abierto && (
                <div className="flex flex-wrap gap-1.5 rounded-xl bg-white/50 p-2">
                  {ensayos.map((e) => (
                    <span
                      key={e.id}
                      className="rounded-full bg-white px-2.5 py-0.5 text-xs text-marron-cafe/70 ring-1 ring-marron-tierra/10"
                    >
                      {e.isCustom ? e.otherTestName : e.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-end border-t border-marron-tierra/10 pt-2">{renderAccion(fila)}</div>
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl bg-marron-tierra/5 md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-xs font-bold uppercase tracking-wide text-marron-cafe/70">
              <th className="px-4 py-3">Muestra</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Ensayos</th>
              {columnaExtra && <th className="px-4 py-3">{columnaExtra.titulo}</th>}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              const { s, ensayos } = fila
              const filaId = idDeFila ? idDeFila(fila) : s.id
              const abierto = expandido.has(filaId)
              const advertencia = renderAdvertencia?.(fila)
              return (
                <Fragment key={filaId}>
                  <tr className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{s.sample.code}</td>
                    <td className="px-4 py-3 text-marron-cafe">{s.product.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-marron-cafe/60">{s.lot.code}</td>
                    <td className="px-4 py-3">
                      <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'neutro'}>{s.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onAlternarExpandir(filaId)}
                        className="flex items-center gap-1 text-xs font-semibold text-marron-cafe/60 hover:text-marron-cafe"
                      >
                        {abierto ? (
                          <ChevronDown className="size-3.5 shrink-0" strokeWidth={2.25} />
                        ) : (
                          <ChevronRight className="size-3.5 shrink-0" strokeWidth={2.25} />
                        )}
                        {ensayos.length} ensayo{ensayos.length === 1 ? '' : 's'}
                      </button>
                    </td>
                    {columnaExtra && <td className="px-4 py-3">{columnaExtra.render(fila)}</td>}
                    <td className="px-4 py-3 text-right">{renderAccion(fila)}</td>
                  </tr>
                  {advertencia && (
                    <tr className="border-b border-marron-tierra/10 bg-marron-arcilla/5">
                      <td colSpan={columnasFijas + 1} className="px-4 py-2">
                        {advertencia}
                      </td>
                    </tr>
                  )}
                  {abierto && (
                    <tr className="border-b border-marron-tierra/10 bg-white/50">
                      <td colSpan={columnasFijas + 1} className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {ensayos.map((e) => (
                            <span
                              key={e.id}
                              className="rounded-full bg-white px-2.5 py-0.5 text-xs text-marron-cafe/70 ring-1 ring-marron-tierra/10"
                            >
                              {e.isCustom ? e.otherTestName : e.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
