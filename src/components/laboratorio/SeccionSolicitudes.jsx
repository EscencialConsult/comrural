import { useCallback, useEffect, useRef, useState } from 'react'
import { FlaskConical, ShieldCheck, PackageSearch, Send, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { analysisExecutionsService } from '../../services/analysisExecutionsService'
import { externalShipmentsService } from '../../services/externalShipmentsService'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'
import FormularioAutorizarEnvio from './FormularioAutorizarEnvio.jsx'
import FormularioIniciarAnalisis from './FormularioIniciarAnalisis.jsx'

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
// Tres bloques:
//   * Laboratorio interno — los ensayos que procesa el propio laboratorio.
//     Acá vive "Iniciar/Continuar análisis".
//   * Por despachar — ensayos externos que todavía no viajan en ningún
//     envío. Acá se arma el envío (que es donde se elige el laboratorio).
//   * Un bloque por envío ya armado, con su estado del circuito GAC/GG.
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
  // gestionando. `envio` null = todavía no existe, se está creando.
  const [envioAbierto, setEnvioAbierto] = useState(null)
  const [analisisEnCurso, setAnalisisEnCurso] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  const [detallePorSolicitud, setDetallePorSolicitud] = useState({})
  const [enviosPorSolicitud, setEnviosPorSolicitud] = useState({})
  const pedidosId = useRef(new Set())

  // Ejecuciones internas ya abiertas (con su submuestra) por solicitud —
  // hace falta para no dejar "Analizar" disponible si el ensayo interno
  // todavía no tiene la submuestra preparada (ver FormularioAsignarLaboratorio.jsx,
  // paso "Preparación"). El backend deja crear el borrador de la planilla
  // igual sin ejecución, pero eso perdería de qué cantidad partió el
  // análisis, así que se bloquea acá.
  const [ejecucionesPorSolicitud, setEjecucionesPorSolicitud] = useState({})
  const pedidosEjecucionesId = useRef(new Set())

  const cargar = useCallback(async () => {
    try {
      const resp = await analysisRequestsService.listar({ limit: 100 })
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
      setSolicitudes(resp.data.filter((s) => s.status !== 'PENDIENTE_MUESTRA' && s.status !== 'RECHAZADA'))
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
  // de qué cantidad partió el análisis (ver bloque "Laboratorio interno"
  // más abajo, con ejecucionesPorSolicitud).
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

  // Bloque 1 — lo que procesa el propio laboratorio. `ejecuciones` decide si
  // ya se preparó la submuestra: undefined mientras se está pidiendo, []
  // si la solicitud llegó a asignar modalidad pero se salió antes de
  // "Preparación" (ver Pendientes) — en ese caso "Analizar" queda
  // bloqueado más abajo.
  const internos = filas
    .filter(({ detalle }) => detalle && itemsActivos(detalle).some((i) => i.assignedExecutionMode === 'INTERNAL'))
    .map(({ s, detalle }) => ({
      s,
      ensayos: itemsActivos(detalle).filter((i) => i.assignedExecutionMode === 'INTERNAL'),
      ejecuciones: ejecucionesPorSolicitud[s.id],
    }))

  // Bloque 2 — externos que todavía no viajan en ningún envío vigente.
  const porDespachar = filas
    .map(({ s, detalle, envios }) => {
      if (!detalle) return null
      const yaEnviados = new Set(
        envios.filter((e) => e.status !== 'ANULADO').flatMap((e) => e.items.map((i) => i.itemId)),
      )
      const pendientes = itemsActivos(detalle).filter(
        (i) => i.assignedExecutionMode === 'EXTERNAL' && !yaEnviados.has(i.id),
      )
      return pendientes.length > 0 ? { s, detalle, ensayos: pendientes } : null
    })
    .filter(Boolean)

  // Bloque 3 — un grupo por envío ya armado.
  const enviosArmados = filas.flatMap(({ s, detalle, envios }) =>
    envios.filter((e) => e.status !== 'ANULADO').map((envio) => ({ s, detalle, envio })),
  )

  const sinClasificar = filas.filter(
    ({ detalle }) => detalle && itemsActivos(detalle).every((i) => !i.assignedExecutionMode),
  )

  const hayAlgo = internos.length > 0 || porDespachar.length > 0 || enviosArmados.length > 0

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Solicitudes recibidas</h2>
        <p className="text-xs text-marron-cafe/40">
          Separadas por dónde se procesa cada ensayo — el laboratorio interno trabaja acá mismo, lo externo se despacha
          con su circuito de autorización.
        </p>
      </div>

      {errorAccion && <p className="text-sm font-medium text-rojo-pasankalla">{errorAccion}</p>}

      {solicitudes.length === 0 ? (
        <EmptyState Icon={FlaskConical} titulo="Todavía no hay ninguna solicitud recibida" />
      ) : (
        <>
          {internos.length > 0 && (
            <Bloque
              titulo="Laboratorio interno"
              Icon={FlaskConical}
              esInterno
              cantidadEnsayos={internos.reduce((t, f) => t + f.ensayos.length, 0)}
            >
              {internos.map(({ s, ensayos, ejecuciones }) => (
                <FilaSolicitud
                  key={s.id}
                  s={s}
                  ensayos={ensayos}
                  acciones={
                    puedeIniciarAnalisis &&
                    (ejecuciones === undefined ? (
                      <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" disabled>
                        <FlaskConical className="size-3.5" strokeWidth={2} />…
                      </Button>
                    ) : ejecuciones.length === 0 ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-marron-arcilla/15 px-3 py-1.5 text-xs font-medium text-marron-arcilla">
                        <Info className="size-3.5" strokeWidth={2} />
                        Falta preparar muestra — hacelo desde Pendientes
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        className="gap-1.5 px-3 py-1.5 text-xs"
                        onClick={() => alClicarAnalizar(s.id)}
                      >
                        <FlaskConical className="size-3.5" strokeWidth={2} />
                        Analizar
                      </Button>
                    ))
                  }
                />
              ))}
            </Bloque>
          )}

          {porDespachar.length > 0 && (
            <Bloque
              titulo="Por despachar a laboratorio externo"
              Icon={Send}
              cantidadEnsayos={porDespachar.reduce((t, f) => t + f.ensayos.length, 0)}
            >
              {porDespachar.map(({ s, detalle, ensayos }) => (
                <FilaSolicitud
                  key={s.id}
                  s={s}
                  ensayos={ensayos}
                  acciones={
                    puedeGestionarEnvios && (
                      <Button
                        variant="secondary"
                        className="gap-1.5 px-3 py-1.5 text-xs"
                        onClick={() => setEnvioAbierto({ solicitud: detalle, ensayos, envio: null })}
                      >
                        <Send className="size-3.5" strokeWidth={2} />
                        Armar envío
                      </Button>
                    )
                  }
                />
              ))}
            </Bloque>
          )}

          {enviosArmados.map(({ s, detalle, envio }) => (
            <Bloque
              key={envio.id}
              titulo={envio.analyticalDestination}
              subtitulo={`${envio.quantity} ${envio.unit} · ${envio.serviceType}`}
              Icon={ShieldCheck}
              cantidadEnsayos={envio.items.length}
              badge={
                <Badge tono={ESTADO_ENVIO[envio.status]?.tono ?? 'neutro'}>
                  {ESTADO_ENVIO[envio.status]?.label ?? envio.status}
                </Badge>
              }
            >
              <FilaSolicitud
                s={s}
                ensayos={envio.items.map((i) => ({ id: i.itemId, name: i.testName, isCustom: false }))}
                acciones={
                  <Button
                    variant="secondary"
                    className="gap-1.5 px-3 py-1.5 text-xs"
                    onClick={() => setEnvioAbierto({ solicitud: detalle, ensayos: null, envio })}
                  >
                    <ShieldCheck className="size-3.5" strokeWidth={2} />
                    Ver envío
                  </Button>
                }
              />
            </Bloque>
          ))}

          {sinClasificar.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marron-tierra/10 text-marron-cafe/50">
                  <PackageSearch className="size-3.5" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold text-marron-cafe/70">Sin laboratorio asignado</h3>
              </div>
              <p className="text-xs text-marron-cafe/40">
                Todavía no pasaron por "Asignar laboratorio" — se hace desde la pestaña Pendientes.
              </p>
              <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
                {sinClasificar.map(({ s }) => (
                  <FilaSolicitud key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}

          {!hayAlgo && sinClasificar.length === 0 && (
            <EmptyState Icon={FlaskConical} titulo="Nada en curso todavía" descripcion="Asigná laboratorio desde Pendientes para empezar." />
          )}
        </>
      )}
    </section>
  )
}

function Bloque({ titulo, subtitulo, Icon, esInterno = false, cantidadEnsayos, badge, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
            esInterno ? 'bg-verde-hoja/15 text-verde-bosque' : 'bg-oro-quinua/15 text-oro-quinua'
          }`}
        >
          <Icon className="size-3.5" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-bold text-marron-cafe">{titulo}</h3>
        {subtitulo && <span className="text-xs text-marron-cafe/50">{subtitulo}</span>}
        <span className="text-xs text-marron-cafe/40">
          {cantidadEnsayos} ensayo{cantidadEnsayos === 1 ? '' : 's'}
        </span>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">{children}</div>
    </div>
  )
}

function FilaSolicitud({ s, ensayos, acciones }) {
  return (
    <div className="flex flex-col gap-2 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs font-semibold text-marron-cafe/70">{s.sample.code}</span>
        <span className="text-sm text-marron-cafe">{s.product.name}</span>
        <span className="font-mono text-xs text-marron-cafe/50">{s.lot.code}</span>
        <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
        <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'neutro'} className="ml-auto">
          {s.status.replace(/_/g, ' ')}
        </Badge>
        {acciones}
      </div>
      {ensayos && ensayos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ensayos.map((e) => (
            <span key={e.id} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-marron-cafe/70">
              {e.isCustom ? e.otherTestName : e.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
