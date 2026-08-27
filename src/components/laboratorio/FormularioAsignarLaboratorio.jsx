import { useEffect, useMemo, useState } from 'react'
import { Scale, FlaskConical, ShieldCheck, CheckCircle2, Package, Info, Loader2 } from 'lucide-react'
import { ORDEN_CATEGORIAS, CATEGORIA_LABEL, CATEGORIA_ICON, CATEGORIA_ESTILO } from '../../config/analisisCategorias'
import { UNIDADES_SUBMUESTRA, aGramos } from '../../config/laboratoriosDestino'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { analysisExecutionsService } from '../../services/analysisExecutionsService'
import { toast } from '../../lib/toast'
import Button from '../Button.jsx'
import BotonVolver from '../BotonVolver.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'

// Asignación de laboratorio sobre una solicitud ya RECIBIDA, en 2 pasos:
//
//   1. Ensayos y modalidad — qué ensayos se procesan y si van a laboratorio
//      interno o externo. Se persiste con POST .../assign-modality.
//   2. Preparación — para lo INTERNO, cuánta muestra se prepara y apertura
//      del trabajo (POST .../executions).
//
// El laboratorio externo PUNTUAL (Mérieux, AGQ...) NO se elige acá: en el
// modelo real la modalidad es solo INTERNAL/EXTERNAL, y el proveedor
// concreto se decide al armar el envío — que es una entidad propia con su
// circuito de firmas GAC/GG. Eso vive en la pestaña "Solicitudes", en
// FormularioAutorizarEnvio.jsx.
export default function FormularioAsignarLaboratorio({
  solicitud: solicitudInicial,
  onVolver,
  onActualizada,
  // Ya se le asignó modalidad a todos los ensayos activos Y (si hay
  // internos) ya existe su ejecución: el backend congela la modalidad una
  // vez que el ensayo tiene ruta iniciada (ver
  // analysisRequestsService.asignarModalidad), así que en este caso el
  // formulario se abre solo para consulta, sin controles de edición.
  soloLectura = false,
  // Con qué paso abrir — 'preparacion' cuando ya se asignó modalidad a
  // todo pero se salió antes de cargar la cantidad de submuestra (ver
  // SeccionPendientes.jsx, caso "faltaPreparar").
  pasoInicial = 'modalidad',
}) {
  const [solicitud, setSolicitud] = useState(solicitudInicial)
  const [paso, setPaso] = useState(pasoInicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const itemsActivos = useMemo(() => solicitud.items.filter((i) => i.status !== 'REMOVED'), [solicitud.items])

  const porCategoria = useMemo(() => {
    const mapa = new Map()
    for (const item of itemsActivos) {
      if (!mapa.has(item.category)) mapa.set(item.category, [])
      mapa.get(item.category).push(item)
    }
    return ORDEN_CATEGORIAS.filter((c) => mapa.has(c)).map((c) => [c, mapa.get(c)])
  }, [itemsActivos])

  const nombreItem = (item) => (item.isCustom ? item.otherTestName : item.name)

  // Marca de trabajo (no persiste): qué ensayos están tildados AHORA para
  // asignarlos juntos. Arranca vacío — a pedido explícito, para forzar una
  // elección consciente en vez de asumir "todo lo que pidió Calidad".
  const [marcados, setMarcados] = useState(() => new Set())

  // Ensayos con la asignación en vuelo ahora mismo (mientras dura el POST
  // .../assign-modality) — solo para el feedback visual de "se está
  // asignando" en la lista y los botones.
  const [asignandoIds, setAsignandoIds] = useState(() => new Set())

  // Si la solicitud se recarga (después de asignar), se sacan de la marca
  // los ensayos que ya no existen.
  useEffect(() => {
    setMarcados((prev) => new Set(itemsActivos.filter((i) => prev.has(i.id)).map((i) => i.id)))
  }, [itemsActivos])

  const todosMarcados = marcados.size === itemsActivos.length && itemsActivos.length > 0
  const alternarTodos = () => setMarcados(todosMarcados ? new Set() : new Set(itemsActivos.map((i) => i.id)))

  const alternarMarcado = (itemId) => {
    setMarcados((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(itemId)) siguiente.delete(itemId)
      else siguiente.add(itemId)
      return siguiente
    })
  }

  // Un ensayo sin planilla interna en el catálogo (internalReportType null)
  // no puede procesarse internamente — no habría dónde volcar su resultado.
  // El backend lo rechaza con 409; acá se anticipa deshabilitando la opción.
  const marcadosSinPlantilla = useMemo(
    () => itemsActivos.filter((i) => marcados.has(i.id) && !i.internalReportType),
    [itemsActivos, marcados],
  )
  const puedeAsignarInterno = marcados.size > 0 && marcadosSinPlantilla.length === 0

  const asignar = async (executionMode) => {
    if (marcados.size === 0) return
    setError(null)
    setGuardando(true)
    const ids = Array.from(marcados)
    setAsignandoIds(new Set(ids))
    try {
      const assignments = ids.map((itemId) => ({ itemId, executionMode }))
      const actualizada = await analysisRequestsService.asignarModalidad(solicitud.id, assignments)
      setSolicitud(actualizada)
      onActualizada?.(actualizada)
      // Ya quedaron asignados — se desmarcan para dejar la selección lista
      // para el próximo grupo de ensayos.
      setMarcados(new Set())
      toast.success(
        `${assignments.length} ensayo${assignments.length === 1 ? '' : 's'} asignado${assignments.length === 1 ? '' : 's'} a laboratorio ${executionMode === 'INTERNAL' ? 'interno' : 'externo'}.`,
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
      setAsignandoIds(new Set())
    }
  }

  const totalAsignados = itemsActivos.filter((i) => i.assignedExecutionMode).length
  const internos = itemsActivos.filter((i) => i.assignedExecutionMode === 'INTERNAL')
  const externos = itemsActivos.filter((i) => i.assignedExecutionMode === 'EXTERNAL')
  const faltanAsignar = itemsActivos.length - totalAsignados

  // ---- Paso 2: preparación del trabajo interno --------------------------
  const [cantidadInterna, setCantidadInterna] = useState('')
  const [unidadInterna, setUnidadInterna] = useState('G')

  const unidadMuestra = solicitud.sample.unit === 'OTRA' ? solicitud.sample.otherUnit : solicitud.sample.unit
  const muestraTotalGramos = aGramos(solicitud.sample.quantity, solicitud.sample.unit)
  const internaGramos = aGramos(cantidadInterna, unidadInterna)
  const excedeMuestra = muestraTotalGramos !== null && internaGramos !== null && internaGramos > muestraTotalGramos

  const puedeAbrirTrabajo = internos.length > 0 && Number(cantidadInterna) > 0 && !excedeMuestra

  const abrirTrabajoInterno = async () => {
    if (!puedeAbrirTrabajo) return
    setError(null)
    setGuardando(true)
    try {
      await analysisExecutionsService.crear(solicitud.id, {
        itemIds: internos.map((i) => i.id),
        preparedQuantity: cantidadInterna,
        preparedUnit: unidadInterna,
      })
      toast.success('Trabajo interno abierto — ya podés cargar resultados desde Solicitudes.')
      const actualizada = await analysisRequestsService.obtener(solicitud.id)
      onActualizada?.(actualizada)
      onVolver()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-marron-tierra/10 pb-4">
        <BotonVolver onClick={onVolver} ariaLabel="Volver a Pendientes" />
        <div className="flex min-w-0 flex-1 basis-[220px] items-center gap-3">
          <div className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque sm:flex">
            <Scale className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-marron-cafe sm:text-lg">
              {soloLectura ? 'Revisar asignación' : 'Asignar laboratorio'} — {solicitud.sample.code}
            </h2>
            <p className="truncate text-xs text-marron-cafe/60">
              Muestra total: {solicitud.sample.quantity} {unidadMuestra}
              {' · '}Lote {solicitud.lot.code} · {solicitud.product.name}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      {soloLectura && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-marron-cafe/60">
            Todos los ensayos ya tienen su ruta iniciada — la asignación no puede editarse desde acá.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {porCategoria.map(([cat, items]) => {
              const Icono = CATEGORIA_ICON[cat]
              const estilo = CATEGORIA_ESTILO[cat]
              return (
                <div key={cat} className={`flex flex-col gap-2 rounded-2xl border-l-4 bg-marron-tierra/5 p-4 ${estilo.borde}`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${estilo.icono}`}>
                      <Icono className="size-3.5" strokeWidth={1.75} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wide text-marron-cafe/70">{CATEGORIA_LABEL[cat]}</p>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
                        <span className="flex-1 text-sm text-marron-cafe">{nombreItem(item)}</span>
                        {item.assignedExecutionMode === 'INTERNAL' && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-verde-hoja/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-verde-bosque">
                            <FlaskConical className="size-3" strokeWidth={2.5} />
                            Interno
                          </span>
                        )}
                        {item.assignedExecutionMode === 'EXTERNAL' && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-oro-quinua/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-oro-quinua">
                            <ShieldCheck className="size-3" strokeWidth={2.5} />
                            Externo
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!soloLectura && paso === 'modalidad' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-marron-cafe/60">Marcá los ensayos y elegí dónde se procesan.</p>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  faltanAsignar === 0 && itemsActivos.length > 0
                    ? 'bg-verde-hoja/15 text-verde-bosque'
                    : 'bg-marron-arcilla/15 text-marron-arcilla'
                }`}
              >
                {totalAsignados}/{itemsActivos.length} asignados
              </span>
              <button
                type="button"
                onClick={alternarTodos}
                className="text-xs font-medium text-verde-bosque underline decoration-verde-bosque/40 underline-offset-2 transition-colors duration-150 hover:text-marron-cafe"
              >
                {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {porCategoria.map(([cat, items]) => {
              const Icono = CATEGORIA_ICON[cat]
              const estilo = CATEGORIA_ESTILO[cat]
              return (
                <div key={cat} className={`flex flex-col gap-2 rounded-2xl border-l-4 bg-marron-tierra/5 p-4 ${estilo.borde}`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${estilo.icono}`}>
                      <Icono className="size-3.5" strokeWidth={1.75} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wide text-marron-cafe/70">{CATEGORIA_LABEL[cat]}</p>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {items.map((item) => {
                      const marcado = marcados.has(item.id)
                      const asignando = asignandoIds.has(item.id)
                      return (
                        <li key={item.id}>
                          <label
                            className={`flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition-colors duration-150 ${
                              asignando ? 'animate-pulse bg-verde-lima/25' : marcado ? 'bg-verde-lima/15' : 'hover:bg-white/70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={marcado}
                              disabled={asignando}
                              onChange={() => alternarMarcado(item.id)}
                              className="size-4 shrink-0 accent-verde-lima"
                            />
                            <span className="flex-1 text-sm text-marron-cafe">{nombreItem(item)}</span>
                            {asignando && (
                              <span className="flex shrink-0 items-center gap-1 rounded-full bg-verde-hoja/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-verde-bosque">
                                <Loader2 className="size-3 animate-spin" strokeWidth={2.5} />
                                Asignando…
                              </span>
                            )}
                            {!asignando && item.assignedExecutionMode === 'INTERNAL' && (
                              <span className="badge-in flex shrink-0 items-center gap-1 rounded-full bg-verde-hoja/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-verde-bosque">
                                <FlaskConical className="size-3" strokeWidth={2.5} />
                                Interno
                              </span>
                            )}
                            {!asignando && item.assignedExecutionMode === 'EXTERNAL' && (
                              <span className="badge-in flex shrink-0 items-center gap-1 rounded-full bg-oro-quinua/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-oro-quinua">
                                <ShieldCheck className="size-3" strokeWidth={2.5} />
                                Externo
                              </span>
                            )}
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-2.5 rounded-2xl bg-marron-tierra/5 p-4">
            <p className="text-xs font-medium text-marron-cafe/50">
              {marcados.size > 0
                ? `${marcados.size} ensayo${marcados.size === 1 ? '' : 's'} marcado${marcados.size === 1 ? '' : 's'} — elegí dónde se procesan`
                : 'Marcá ensayos arriba para poder asignarlos'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!puedeAsignarInterno || guardando}
                onClick={() => asignar('INTERNAL')}
                className="flex items-center gap-1.5 rounded-full border border-verde-bosque/30 px-3.5 py-1.5 text-xs font-medium text-verde-bosque transition-colors duration-150 hover:bg-verde-hoja/15 disabled:pointer-events-none disabled:opacity-40"
              >
                {guardando ? (
                  <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                ) : (
                  <FlaskConical className="size-3.5" strokeWidth={2} />
                )}
                {guardando ? 'Asignando…' : 'Laboratorio interno'}
              </button>
              <button
                type="button"
                disabled={marcados.size === 0 || guardando}
                onClick={() => asignar('EXTERNAL')}
                className="flex items-center gap-1.5 rounded-full border border-oro-quinua/40 px-3.5 py-1.5 text-xs font-medium text-oro-quinua transition-colors duration-150 hover:bg-oro-quinua/15 disabled:pointer-events-none disabled:opacity-40"
              >
                {guardando ? (
                  <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                ) : (
                  <ShieldCheck className="size-3.5" strokeWidth={2} />
                )}
                {guardando ? 'Asignando…' : 'Laboratorio externo'}
              </button>
            </div>

            {/* Por qué "interno" puede estar deshabilitado con ensayos
                marcados: el catálogo no le asignó ninguna planilla interna a
                esos ensayos, así que el laboratorio no tiene dónde volcar su
                resultado. */}
            {marcadosSinPlantilla.length > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-marron-arcilla">
                <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                <span>
                  {marcadosSinPlantilla.map(nombreItem).join(', ')} no tiene
                  {marcadosSinPlantilla.length === 1 ? '' : 'n'} planilla interna en el catálogo — solo puede
                  {marcadosSinPlantilla.length === 1 ? '' : 'n'} procesarse externamente.
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={internos.length === 0} onClick={() => setPaso('preparacion')}>
              Siguiente — Preparar muestra
            </Button>
            <span className="text-xs text-marron-cafe/50">
              {internos.length === 0
                ? 'Sin ensayos internos: los externos se despachan desde Solicitudes.'
                : `${internos.length} interno${internos.length === 1 ? '' : 's'} · ${externos.length} externo${externos.length === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>
      )}

      {!soloLectura && paso === 'preparacion' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-marron-cafe/60">
            Indicá cuánta muestra se prepara para el trabajo interno. Al confirmar se abre la ejecución de cada ensayo.
          </p>

          <div className="flex flex-col gap-3 rounded-2xl border-l-4 border-verde-bosque/40 bg-marron-tierra/5 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
                <FlaskConical className="size-4.5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-marron-cafe">Laboratorio interno</p>
                <p className="text-xs text-marron-cafe/50">
                  {internos.length} ensayo{internos.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {internos.map((e) => (
                <span key={e.id} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-marron-cafe/70">
                  {nombreItem(e)}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <FormInput
                label="Cantidad preparada"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="0"
                value={cantidadInterna}
                onChange={(e) => setCantidadInterna(e.target.value)}
              />
              <FormSelect label="Unidad" value={unidadInterna} onChange={(e) => setUnidadInterna(e.target.value)}>
                {UNIDADES_SUBMUESTRA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>

          {muestraTotalGramos !== null && internaGramos !== null && (
            <p className={`flex items-center gap-1.5 text-xs font-medium ${excedeMuestra ? 'text-rojo-pasankalla' : 'text-marron-cafe/45'}`}>
              <Package className="size-3.5 shrink-0" strokeWidth={1.75} />
              {excedeMuestra
                ? `Lo preparado (${internaGramos} g) supera la muestra total (${solicitud.sample.quantity} ${unidadMuestra}).`
                : `${internaGramos} g de ${solicitud.sample.quantity} ${unidadMuestra} disponibles.`}
            </p>
          )}

          {externos.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-xl bg-oro-quinua/10 px-3 py-2 text-xs text-marron-cafe/70">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-oro-quinua" strokeWidth={2} />
              <span>
                Los {externos.length} ensayo{externos.length === 1 ? '' : 's'} externo{externos.length === 1 ? '' : 's'} se
                despachan desde la pestaña <strong className="font-semibold">Solicitudes</strong>, donde se elige el
                laboratorio y se arma el envío con su circuito de firmas.
              </span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => setPaso('modalidad')}>
              Atrás
            </Button>
            <Button type="button" disabled={!puedeAbrirTrabajo || guardando} onClick={abrirTrabajoInterno} className="gap-1.5">
              <CheckCircle2 className="size-4" strokeWidth={2} />
              {guardando ? 'Abriendo…' : 'Abrir trabajo interno'}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
