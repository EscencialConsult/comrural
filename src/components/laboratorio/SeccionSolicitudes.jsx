import { useEffect, useRef, useState } from 'react'
import { FlaskConical, ShieldCheck, PackageSearch } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { leerSubdivisionMuestra } from '../../hooks/useSubdivisionMuestra'
import { claveDestino } from '../../config/laboratoriosDestino'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'
import FormularioAutorizarEnvio from './FormularioAutorizarEnvio.jsx'
import FormularioIniciarAnalisis from './FormularioIniciarAnalisis.jsx'

const TONO_ESTADO_SOLICITUD = {
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  ANALIZADA: 'positivo',
}

// Subpestaña "Solicitudes" de Laboratorio — separa lo ya recibido por
// LABORATORIO DESTINO real (interno, Mérieux, AGQ...), según cómo se
// asignó la muestra en "Asignar laboratorio" (FormularioSubdividirMuestra.jsx,
// ver useSubdivisionMuestra.js). Antes solo distinguía interno/externo —
// ahora que esa asignación guarda el laboratorio puntual y el peso de cada
// submuestra, se agrupa dinámicamente por ese destino en vez de dos tablas
// fijas. 100% mock: esa asignación vive solo en localStorage — el backend
// real para esto (laboratorios externos, splits de muestra) todavía no
// existe, ver docs/analysis-reception-programming.md del backend, spec sin
// implementar.
//
// "Iniciar/Continuar análisis" vive ACÁ (pedido explícito, ya no en
// Pendientes) — solo tiene sentido una vez que la solicitud quedó asignada
// a "Laboratorio interno": es el propio Laboratorio quien procesa esos
// ensayos, a diferencia de los externos, que van por "Solicitar análisis"
// (registro I-LAB-16/R-01, ver FormularioAutorizarEnvio.jsx).
//
// "Pendientes" (la otra subpestaña) sigue siendo la cola de trabajo de
// recepción/asignación — acá solo se lee lo YA recibido, para ver cómo
// quedó repartido y trabajarlo.
export default function SeccionSolicitudes() {
  const { permisos } = useAuth()
  const puedeIniciarAnalisis = permisos.has('analysis-requests:update')

  const [solicitudes, setSolicitudes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  // Detalle completo de la solicitud cuyo "Solicitar análisis" se clicó en
  // un grupo externo — abre el registro I-LAB-16/R-01 (mock, ver
  // FormularioAutorizarEnvio.jsx). Ya se tiene el detalle cargado acá
  // (detallePorSolicitud, más abajo), no hace falta volver a pedirlo.
  const [envioAbierto, setEnvioAbierto] = useState(null)
  const [analisisEnCurso, setAnalisisEnCurso] = useState(null) // detalle completo | null
  const [cargandoAnalisisId, setCargandoAnalisisId] = useState(null)
  const [errorIniciarAnalisis, setErrorIniciarAnalisis] = useState(null)

  useEffect(() => {
    let cancelado = false
    analysisRequestsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setSolicitudes(resp.data.filter((s) => s.status !== 'PENDIENTE_MUESTRA' && s.status !== 'RECHAZADA')))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  // Detalle (items[]) por solicitud, para saber qué ensayo puntual quedó en
  // cada paquete — el listado no trae `items[]`, hace falta pedirlo aparte
  // (mismo criterio de enriquecimiento que SeccionPendientes.jsx).
  const [detallePorSolicitud, setDetallePorSolicitud] = useState({})
  const pedidosId = useRef(new Set())

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
    return () => {
      cancelado = true
    }
  }, [solicitudes])

  // "Iniciar análisis" — POST .../start-analysis, transición real
  // RECIBIDA -> EN_PROCESO. Actualiza el status en memoria (acá y en el
  // detalle ya pedido) para que la fila y el badge reflejen el cambio sin
  // recargar la lista completa.
  const alClicarIniciarAnalisis = async (solicitudId) => {
    setErrorIniciarAnalisis(null)
    setCargandoAnalisisId(solicitudId)
    try {
      const detalle = await analysisRequestsService.iniciarAnalisis(solicitudId)
      setSolicitudes((prev) => prev.map((s) => (s.id === solicitudId ? { ...s, status: detalle.status } : s)))
      setDetallePorSolicitud((prev) => ({ ...prev, [solicitudId]: detalle }))
      setAnalisisEnCurso(detalle)
    } catch (err) {
      setErrorIniciarAnalisis(err.message)
    } finally {
      setCargandoAnalisisId(null)
    }
  }

  // "Continuar análisis" — para una solicitud que ya está EN_PROCESO, solo
  // reabre la vista de categorías con el detalle ya cargado, sin transición
  // que disparar (mismo criterio que tenía SeccionPendientes.jsx).
  const alClicarContinuarAnalisis = (solicitudId) => {
    setErrorIniciarAnalisis(null)
    const detalle = detallePorSolicitud[solicitudId]
    if (detalle && detalle !== 'error') setAnalisisEnCurso(detalle)
  }

  if (analisisEnCurso) {
    return <FormularioIniciarAnalisis solicitud={analisisEnCurso} onVolver={() => setAnalisisEnCurso(null)} />
  }

  if (envioAbierto) {
    return <FormularioAutorizarEnvio solicitud={envioAbierto} onVolver={() => setEnvioAbierto(null)} />
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

  // Cada fila lleva { s, items, subdivision } — `subdivision` es `null` si
  // esta solicitud todavía no pasó por "Asignar laboratorio" (o si falló el
  // pedido de detalle): queda en "Sin laboratorio asignado", no se inventa
  // un destino que nadie asignó.
  const filas = solicitudes.map((s) => {
    const detalle = detallePorSolicitud[s.id]
    const subdivision = leerSubdivisionMuestra(s.id)
    const items = detalle && detalle !== 'error' ? detalle.items : null
    return { s, items, subdivision }
  })

  const asignadas = filas.filter(({ items, subdivision }) => items && subdivision?.asignaciones && Object.keys(subdivision.asignaciones).length > 0)
  const sinAsignar = filas.filter(({ items, subdivision }) => items && (!subdivision?.asignaciones || Object.keys(subdivision.asignaciones).length === 0))

  // Agrupa TODOS los paquetes de TODAS las solicitudes asignadas por
  // laboratorio destino (ver claveDestino) — una sección por destino
  // encontrado, en vez de dos tablas fijas interno/externo.
  const gruposPorDestino = new Map()
  for (const { s, items, subdivision } of asignadas) {
    const porClave = new Map()
    for (const item of items) {
      const asignacion = subdivision.asignaciones[item.id]
      if (!asignacion) continue
      const clave = claveDestino(asignacion)
      if (!porClave.has(clave)) porClave.set(clave, { nombre: asignacion.nombre, esInterno: asignacion.labId === 'INTERNO', ensayos: [] })
      porClave.get(clave).ensayos.push(item)
    }
    for (const [clave, { nombre, esInterno, ensayos }] of porClave) {
      if (!gruposPorDestino.has(clave)) gruposPorDestino.set(clave, { nombre, esInterno, filas: [] })
      const peso = subdivision.paquetes?.[clave]
      gruposPorDestino.get(clave).filas.push({ s, ensayos, peso })
    }
  }
  const destinos = Array.from(gruposPorDestino.entries()).sort(([, a], [, b]) => (a.esInterno === b.esInterno ? 0 : a.esInterno ? -1 : 1))

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Solicitudes recibidas</h2>
        <p className="text-xs text-marron-cafe/40">
          Agrupadas por laboratorio destino, según cómo se asignó cada muestra — el laboratorio interno procesa acá
          mismo ("Iniciar análisis"), el resto se solicita por registro externo.
        </p>
      </div>

      {errorIniciarAnalisis && (
        <p className="text-sm font-medium text-rojo-pasankalla">No se pudo abrir el análisis: {errorIniciarAnalisis}</p>
      )}

      {solicitudes.length === 0 ? (
        <EmptyState Icon={FlaskConical} titulo="Todavía no hay ninguna solicitud recibida" />
      ) : (
        <>
          {destinos.map(([clave, { nombre, esInterno, filas: filasGrupo }]) => (
            <TablaDestino
              key={clave}
              titulo={nombre}
              Icon={esInterno ? FlaskConical : ShieldCheck}
              esInterno={esInterno}
              cantidadEnsayos={filasGrupo.reduce((total, f) => total + (f.ensayos?.length ?? 0), 0)}
              filas={filasGrupo}
              onSolicitarAnalisis={esInterno ? undefined : (s) => setEnvioAbierto(detallePorSolicitud[s.id])}
              onIniciarAnalisis={esInterno && puedeIniciarAnalisis ? (s) => alClicarIniciarAnalisis(s.id) : undefined}
              onContinuarAnalisis={esInterno && puedeIniciarAnalisis ? (s) => alClicarContinuarAnalisis(s.id) : undefined}
              cargandoAnalisisId={cargandoAnalisisId}
            />
          ))}

          {sinAsignar.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marron-tierra/10 text-marron-cafe/50">
                  <PackageSearch className="size-3.5" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold text-marron-cafe/70">Sin laboratorio asignado</h3>
              </div>
              <p className="text-xs text-marron-cafe/40">
                Todavía no pasaron por "Asignar laboratorio" (ver Pendientes), o no se pudo cargar su detalle.
              </p>
              <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
                {sinAsignar.map(({ s }) => (
                  <FilaSolicitud key={s.id} s={s} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function TablaDestino({ titulo, Icon, esInterno, cantidadEnsayos, filas, onSolicitarAnalisis, onIniciarAnalisis, onContinuarAnalisis, cargandoAnalisisId }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${esInterno ? 'bg-verde-hoja/15 text-verde-bosque' : 'bg-oro-quinua/15 text-oro-quinua'}`}>
          <Icon className="size-3.5" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-bold text-marron-cafe">{titulo}</h3>
        <span className="text-xs text-marron-cafe/40">
          {cantidadEnsayos} ensayo{cantidadEnsayos === 1 ? '' : 's'}
        </span>
      </div>
      <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
        {filas.map(({ s, ensayos, peso }, i) => (
          <FilaSolicitud
            key={`${s.id}-${i}`}
            s={s}
            ensayos={ensayos}
            peso={peso}
            onSolicitarAnalisis={onSolicitarAnalisis ? () => onSolicitarAnalisis(s) : undefined}
            onIniciarAnalisis={onIniciarAnalisis ? () => onIniciarAnalisis(s) : undefined}
            onContinuarAnalisis={onContinuarAnalisis ? () => onContinuarAnalisis(s) : undefined}
            cargando={cargandoAnalisisId === s.id}
          />
        ))}
      </div>
    </div>
  )
}

function FilaSolicitud({ s, ensayos, peso, onSolicitarAnalisis, onIniciarAnalisis, onContinuarAnalisis, cargando }) {
  return (
    <div className="flex flex-col gap-2 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs font-semibold text-marron-cafe/70">{s.sample.code}</span>
        <span className="text-sm text-marron-cafe">{s.product.name}</span>
        <span className="font-mono text-xs text-marron-cafe/50">{s.lot.code}</span>
        <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
        {peso?.cantidad && (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-marron-cafe/70">
            {peso.cantidad} {peso.unidad ?? 'G'}
          </span>
        )}
        <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'neutro'} className="ml-auto">
          {s.status.replace(/_/g, ' ')}
        </Badge>
        {/* Abre el registro I-LAB-16/R-01 (mock, ver FormularioAutorizarEnvio.jsx)
            — solo tiene sentido en los grupos que no son laboratorio interno. */}
        {onSolicitarAnalisis && (
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={onSolicitarAnalisis}>
            <ShieldCheck className="size-3.5" strokeWidth={2} />
            Solicitar análisis
          </Button>
        )}
        {/* "Iniciar"/"Continuar" — solo en el grupo de Laboratorio interno,
            según en qué status esté la solicitud (ver FormularioIniciarAnalisis.jsx,
            agrupa por categoría y muestra el formulario que corresponda). */}
        {s.status === 'RECIBIDA' && onIniciarAnalisis && (
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" disabled={cargando} onClick={onIniciarAnalisis}>
            <FlaskConical className="size-3.5" strokeWidth={2} />
            {cargando ? 'Abriendo…' : 'Iniciar análisis'}
          </Button>
        )}
        {s.status === 'EN_PROCESO' && onContinuarAnalisis && (
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" disabled={cargando} onClick={onContinuarAnalisis}>
            <FlaskConical className="size-3.5" strokeWidth={2} />
            {cargando ? 'Abriendo…' : 'Continuar análisis'}
          </Button>
        )}
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
