import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlaskConical,
  ShieldCheck,
  Send,
  Info,
  ChevronDown,
  ChevronUp,
  Leaf,
  Truck,
  Filter,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { analysisExecutionsService } from '../../services/analysisExecutionsService'
import { externalShipmentsService } from '../../services/externalShipmentsService'
import { listarTodo } from '../../services/paginacion'
import { formatearEstadoSolicitud } from '../../config/analisisLabels'
import Badge from '../Badge.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'
import FormSelect from '../FormSelect.jsx'
import FormularioAutorizarEnvio from './FormularioAutorizarEnvio.jsx'
import FormularioIniciarAnalisis from './FormularioIniciarAnalisis.jsx'

const TONO_ESTADO_SOLICITUD = {
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  PENDIENTE_EXTERNOS: 'alerta',
  ANALIZADA: 'positivo',
}

const ESTADO_ENVIO = {
  BORRADOR: { label: 'Borrador', tono: 'neutro' },
  PENDIENTE_GAC: { label: 'ESPERA GAC', tono: 'alerta' },
  PENDIENTE_GG: { label: 'ESPERA GERENCIA', tono: 'alerta' },
  AUTORIZADO: { label: 'AUTORIZADO', tono: 'positivo' },
  ENVIADO: { label: 'ENVIADO', tono: 'positivo' },
  RESULTADO_RECIBIDO: { label: 'RESULTADO RECIBIDO', tono: 'positivo' },
  CERRADO: { label: 'CERRADO', tono: 'positivo' },
  ANULADO: { label: 'ANULADO', tono: 'negativo' },
}

export default function SeccionSolicitudes() {
  const { permisos } = useAuth()
  const puedeIniciarAnalisis = permisos.has('laboratory-reports:manage')
  const puedeGestionarEnvios = permisos.has('external-shipments:manage')

  const [solicitudes, setSolicitudes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [envioAbierto, setEnvioAbierto] = useState(null)
  const [analisisEnCurso, setAnalisisEnCurso] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  const [detallePorSolicitud, setDetallePorSolicitud] = useState({})
  const [enviosPorSolicitud, setEnviosPorSolicitud] = useState({})
  const [ejecucionesPorSolicitud, setEjecucionesPorSolicitud] = useState({})

  const pedidosId = useRef(new Set())
  const pedidosEjecucionesId = useRef(new Set())

  // Filtro por lote y control de acordeones/desplegables
  const [filtroLote, setFiltroLote] = useState('todos')
  const [lotesColapsados, setLotesColapsados] = useState(new Set())
  const [ensayosDesplegados, setEnsayosDesplegados] = useState(new Set())

  const alternarLoteColapsado = (key) => {
    setLotesColapsados((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const alternarEnsayosDesplegados = (key) => {
    setEnsayosDesplegados((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
    return () => {
      pedidosId.current = new Set()
      pedidosEjecucionesId.current = new Set()
    }
  }, [cargar])

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

  const alClicarAnalizar = (solicitudId) => {
    setErrorAccion(null)
    const detalle = detallePorSolicitud[solicitudId]
    if (detalle && detalle !== 'error') setAnalisisEnCurso(detalle)
  }

  // Agrupar todo por LOTE para el prototipo
  const lotesCalculados = useMemo(() => {
    if (!solicitudes) return []
    const mapa = new Map()

    for (const s of solicitudes) {
      const lotId = s.lot?.id ?? s.lot?.code ?? 'sin-lote'
      if (!mapa.has(lotId)) {
        mapa.set(lotId, {
          lote: s.lot,
          productoNombre: s.product?.name ?? '—',
          solicitudes: [],
        })
      }
      mapa.get(lotId).solicitudes.push(s)
    }

    return Array.from(mapa.values()).map((grupo) => {
      const { lote, productoNombre, solicitudes: itemsSolicitud } = grupo
      const internas = []
      const externas = []

      for (const s of itemsSolicitud) {
        const detalle = detallePorSolicitud[s.id]
        const detalleOk = detalle && detalle !== 'error' ? detalle : null
        const activos = Array.isArray(detalleOk?.items)
          ? detalleOk.items.filter((i) => i.status !== 'REMOVED')
          : Array.isArray(s.items)
            ? s.items.filter((i) => i.status !== 'REMOVED')
            : []

        // Ensayos internos
        const ensayosInternos = activos.filter((i) => i.assignedExecutionMode === 'INTERNAL')
        if (ensayosInternos.length > 0) {
          internas.push({
            s,
            detalle: detalleOk,
            ensayos: ensayosInternos,
            ejecuciones: ejecucionesPorSolicitud[s.id],
          })
        }

        // Ensayos externos
        const envios = Array.isArray(enviosPorSolicitud[s.id]) ? enviosPorSolicitud[s.id] : []
        const enviosVigentes = envios.filter((e) => e.status !== 'ANULADO')

        // Envíos ya armados
        for (const envio of enviosVigentes) {
          externas.push({
            idUnica: `envio-${envio.id}`,
            s,
            detalle: detalleOk,
            envio,
            ensayos: Array.isArray(envio?.items) ? envio.items.map((i) => ({ id: i.itemId, name: i.testName, isCustom: false })) : [],
            tipo: 'ARMADO',
          })
        }

        // Ensayos externos pendientes de armar envío
        const yaEnviadosIds = new Set(enviosVigentes.flatMap((e) => (Array.isArray(e?.items) ? e.items.map((i) => i.itemId) : [])))
        const pendientesExternos = activos.filter((i) => i.assignedExecutionMode === 'EXTERNAL' && !yaEnviadosIds.has(i.id))
        if (pendientesExternos.length > 0) {
          const sinAsignar = activos.filter((i) => !i.assignedExecutionMode)
          externas.push({
            idUnica: `pendiente-${s.id}`,
            s,
            detalle: detalleOk,
            envio: null,
            ensayos: pendientesExternos,
            sinAsignar,
            tipo: 'PENDIENTE',
          })
        }

        // Fallback mientras se carga el detalle o si aún no tiene ensayos asignados a externo
        if (ensayosInternos.length === 0 && enviosVigentes.length === 0 && pendientesExternos.length === 0) {
          internas.push({
            s,
            detalle: detalleOk,
            ensayos: activos,
            ejecuciones: ejecucionesPorSolicitud[s.id],
          })
        }
      }

      const totalSolicitudes = internas.length + externas.length
      const lotKey = String(lote?.id ?? lote?.code ?? 'sin-lote')

      return {
        lotKey,
        lote,
        productoNombre,
        internas,
        externas,
        totalSolicitudes,
      }
    })
  }, [solicitudes, detallePorSolicitud, enviosPorSolicitud, ejecucionesPorSolicitud])

  const lotesFiltrados = useMemo(() => {
    if (filtroLote === 'todos') return lotesCalculados
    return lotesCalculados.filter((g) => String(g.lotKey) === String(filtroLote))
  }, [lotesCalculados, filtroLote])

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
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-5">
      {/* Encabezado de la sección */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-marron-cafe">En proceso</h2>
          <p className="text-xs text-marron-cafe/60">
            Agrupadas por lote de materia prima. Cada lote muestra sus análisis internos y externos.
          </p>
        </div>

        {/* Filtro por lote */}
        <div className="flex items-center gap-2">
          <FormSelect
            value={filtroLote}
            onChange={(e) => setFiltroLote(e.target.value)}
            className="w-48 text-xs font-semibold"
          >
            <option value="todos">Todos los lotes</option>
            {lotesCalculados.map((g) => (
              <option key={g.lotKey} value={String(g.lotKey)}>
                Lote {g.lote?.code ?? 'Sin código'}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>

      {errorAccion && <p className="text-sm font-medium text-rojo-pasankalla">{errorAccion}</p>}

      {lotesFiltrados.length === 0 ? (
        <EmptyState Icon={FlaskConical} titulo="No hay solicitudes para mostrar" />
      ) : (
        <div className="flex flex-col gap-5">
          {lotesFiltrados.map(({ lotKey, lote, productoNombre, internas, externas, totalSolicitudes }) => {
            const colapsado = lotesColapsados.has(lotKey)
            if (totalSolicitudes === 0) return null

            return (
              <div key={lotKey} className="flex flex-col gap-4 rounded-3xl border border-marron-tierra/10 bg-white p-5 shadow-sm">
                {/* Cabecera del Lote */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-marron-tierra/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
                      <Leaf className="size-4" strokeWidth={2.25} />
                    </div>
                    <span className="font-mono text-base font-bold text-marron-cafe">{lote?.code ?? '—'}</span>
                    <span className="text-marron-cafe/30">·</span>
                    <span className="text-base font-semibold text-marron-cafe">{productoNombre}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-marron-tierra/10 px-3.5 py-1 text-xs font-semibold text-marron-cafe/80">
                      {totalSolicitudes} {totalSolicitudes === 1 ? 'solicitud' : 'solicitudes'}
                    </span>
                    <button
                      type="button"
                      onClick={() => alternarLoteColapsado(lotKey)}
                      className="rounded-full p-1 text-marron-cafe/60 hover:bg-marron-tierra/10 hover:text-marron-cafe"
                      title={colapsado ? 'Expandir lote' : 'Colapsar lote'}
                    >
                      {colapsado ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
                    </button>
                  </div>
                </div>

                {!colapsado && (
                  <div className="flex flex-col gap-4">
                    {/* Bloque Laboratorio Interno */}
                    {internas.length > 0 && (
                      <div className="flex flex-col rounded-2xl bg-[#f4f7f2] p-4">
                        <div className="flex items-center justify-between pb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-verde-hoja/20 text-verde-bosque">
                              <FlaskConical className="size-4.5" strokeWidth={2} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-verde-bosque">Laboratorio interno</h4>
                              <p className="text-xs text-marron-cafe/60">Análisis realizados en el laboratorio de la planta.</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-verde-hoja/15 px-3 py-1 text-xs font-semibold text-verde-bosque">
                            {internas.length} {internas.length === 1 ? 'solicitud' : 'solicitudes'}
                          </span>
                        </div>

                        {/* Tabla Interna */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-marron-tierra/10 text-[11px] font-bold text-marron-cafe/50 uppercase tracking-wider">
                                <th className="py-2.5 px-3">N° Solicitud</th>
                                <th className="py-2.5 px-3">Tipo</th>
                                <th className="py-2.5 px-3">Estado</th>
                                <th className="py-2.5 px-3">Ensayos</th>
                                <th className="py-2.5 px-3 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-marron-tierra/10">
                              {internas.map(({ s, detalle, ensayos, ejecuciones }) => {
                                const abiertoEnsayos = ensayosDesplegados.has(`int-${s.id}`)
                                const listo = ejecuciones !== undefined && ejecuciones.length > 0

                                return (
                                  <Fragment key={s.id}>
                                    <tr className="transition-colors hover:bg-white/50">
                                      <td className="py-3 px-3 font-mono font-bold text-marron-cafe">{s.sample?.code ?? s.code ?? '—'}</td>
                                      <td className="py-3 px-3">
                                        <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
                                      </td>
                                      <td className="py-3 px-3">
                                        <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'alerta'}>
                                          {formatearEstadoSolicitud(s.status)}
                                        </Badge>
                                      </td>
                                      <td className="py-3 px-3">
                                        <button
                                          type="button"
                                          onClick={() => alternarEnsayosDesplegados(`int-${s.id}`)}
                                          className="flex items-center gap-1 font-semibold text-marron-cafe/70 hover:text-marron-cafe"
                                        >
                                          {abiertoEnsayos ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                          {ensayos.length} ensayo{ensayos.length === 1 ? '' : 's'}
                                        </button>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {puedeIniciarAnalisis && (
                                          listo ? (
                                            <button
                                              type="button"
                                              onClick={() => alClicarAnalizar(s.id)}
                                              className="inline-flex items-center gap-1.5 rounded-full border border-verde-bosque px-3.5 py-1 text-xs font-semibold text-verde-bosque hover:bg-verde-hoja/15 transition-colors"
                                            >
                                              <FlaskConical className="size-3.5" strokeWidth={2} />
                                              Analizar
                                            </button>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-marron-arcilla/15 px-3 py-1 text-xs font-medium text-marron-arcilla">
                                              Falta preparar muestra
                                            </span>
                                          )
                                        )}
                                      </td>
                                    </tr>

                                    {abiertoEnsayos && (
                                      <tr>
                                        <td colSpan={5} className="bg-white/60 px-4 py-2">
                                          <div className="flex flex-wrap gap-1.5">
                                            {ensayos.map((e) => (
                                              <span
                                                key={e.id}
                                                className="rounded-full bg-white px-2.5 py-0.5 text-xs text-marron-cafe/80 ring-1 ring-marron-tierra/10"
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
                    )}

                    {/* Bloque Laboratorio Externo */}
                    {externas.length > 0 && (
                      <div className="flex flex-col rounded-2xl bg-[#faf6f0] p-4">
                        <div className="flex items-center justify-between pb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-xl bg-marron-tierra/15 text-marron-cafe">
                              <Truck className="size-4.5" strokeWidth={2} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-marron-cafe">Laboratorio externo</h4>
                              <p className="text-xs text-marron-cafe/60">Análisis enviados a laboratorio externo con su circuito de autorización.</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-marron-tierra/15 px-3 py-1 text-xs font-semibold text-marron-cafe/80">
                            {externas.length} {externas.length === 1 ? 'solicitud' : 'solicitudes'}
                          </span>
                        </div>

                        {/* Tabla Externa */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-marron-tierra/10 text-[11px] font-bold text-marron-cafe/50 uppercase tracking-wider">
                                <th className="py-2.5 px-3">N° Solicitud</th>
                                <th className="py-2.5 px-3">Tipo</th>
                                <th className="py-2.5 px-3">Estado</th>
                                <th className="py-2.5 px-3">Estado de envío</th>
                                <th className="py-2.5 px-3">Ensayos</th>
                                <th className="py-2.5 px-3 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-marron-tierra/10">
                              {externas.map(({ idUnica, s, detalle, envio, ensayos, sinAsignar, tipo }) => {
                                const abiertoEnsayos = ensayosDesplegados.has(idUnica)

                                return (
                                  <Fragment key={idUnica}>
                                    <tr className="transition-colors hover:bg-white/50">
                                      <td className="py-3 px-3 font-mono font-bold text-marron-cafe">{s.sample?.code ?? s.code ?? '—'}</td>
                                      <td className="py-3 px-3">
                                        <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
                                      </td>
                                      <td className="py-3 px-3">
                                        <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'alerta'}>
                                          {formatearEstadoSolicitud(s.status)}
                                        </Badge>
                                      </td>
                                      <td className="py-3 px-3">
                                        {envio ? (
                                          <Badge tono={ESTADO_ENVIO[envio.status]?.tono ?? 'neutro'}>
                                            {ESTADO_ENVIO[envio.status]?.label ?? envio.status}
                                          </Badge>
                                        ) : (
                                          <span className="text-xs font-semibold text-marron-cafe/50">POR ARMAR</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3">
                                        <button
                                          type="button"
                                          onClick={() => alternarEnsayosDesplegados(idUnica)}
                                          className="flex items-center gap-1 font-semibold text-marron-cafe/70 hover:text-marron-cafe"
                                        >
                                          {abiertoEnsayos ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                          {ensayos.length} ensayo{ensayos.length === 1 ? '' : 's'}
                                        </button>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {puedeGestionarEnvios && (
                                          tipo === 'ARMADO' ? (
                                            <button
                                              type="button"
                                              onClick={() => setEnvioAbierto({ solicitud: detalle, ensayos: null, envio })}
                                              className="inline-flex items-center gap-1.5 rounded-full border border-marron-cafe/30 px-3.5 py-1 text-xs font-semibold text-marron-cafe hover:bg-marron-tierra/10 transition-colors"
                                            >
                                              <ShieldCheck className="size-3.5" strokeWidth={2} />
                                              Ver envío
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              disabled={sinAsignar && sinAsignar.length > 0}
                                              onClick={() => setEnvioAbierto({ solicitud: detalle, ensayos, envio: null })}
                                              className="inline-flex items-center gap-1.5 rounded-full border border-marron-cafe/30 px-3.5 py-1 text-xs font-semibold text-marron-cafe hover:bg-marron-tierra/10 disabled:opacity-50 transition-colors"
                                            >
                                              <Send className="size-3.5" strokeWidth={2} />
                                              Armar envío
                                            </button>
                                          )
                                        )}
                                      </td>
                                    </tr>

                                    {abiertoEnsayos && (
                                      <tr>
                                        <td colSpan={6} className="bg-white/60 px-4 py-2">
                                          <div className="flex flex-wrap gap-1.5">
                                            {ensayos.map((e) => (
                                              <span
                                                key={e.id}
                                                className="rounded-full bg-white px-2.5 py-0.5 text-xs text-marron-cafe/80 ring-1 ring-marron-tierra/10"
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
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
