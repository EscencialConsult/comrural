import { useMemo, useState } from 'react'
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

  // Ensayos con la asignación en vuelo ahora mismo (mientras dura su POST
  // .../assign-modality) — para el spinner de esa fila puntual. Ya no hay
  // "marcar varios y elegir después": a pedido explícito, cada ensayo tiene
  // sus propios 2 botones (Interno/Externo) y se asigna al toque, uno por
  // uno — la selección múltiple anterior obligaba a un paso de más cuando
  // la mayoría de las veces se decide ensayo por ensayo de todos modos.
  const [asignandoIds, setAsignandoIds] = useState(() => new Set())

  // Un ensayo sin planilla interna en el catálogo (internalReportType null)
  // no puede procesarse internamente — no habría dónde volcar su resultado
  // (el backend lo rechaza con 409). Para esos, el botón "Interno" queda
  // deshabilitado y se avisa con una nota — "Externo" sigue exigiendo su
  // propio clic igual que cualquier otro ensayo, no se pre-marca como ya
  // elegido (pedido explícito, tras revisión: que no parezca ya asignado
  // sin haberlo tocado).
  const soloExterno = (item) => !item.internalReportType

  const asignarUno = async (item, executionMode) => {
    if (item.assignedExecutionMode === executionMode || asignandoIds.has(item.id)) return
    setError(null)
    setAsignandoIds((prev) => new Set(prev).add(item.id))
    try {
      const actualizada = await analysisRequestsService.asignarModalidad(solicitud.id, [{ itemId: item.id, executionMode }])
      setSolicitud(actualizada)
    } catch (err) {
      setError(err.message)
    } finally {
      setAsignandoIds((prev) => {
        const siguiente = new Set(prev)
        siguiente.delete(item.id)
        return siguiente
      })
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
            <p className="text-sm text-marron-cafe/60">Elegí, ensayo por ensayo, dónde se procesa.</p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${faltanAsignar === 0 && itemsActivos.length > 0
                  ? 'bg-verde-hoja/15 text-verde-bosque'
                  : 'bg-marron-arcilla/15 text-marron-arcilla'
                }`}
            >
              {totalAsignados}/{itemsActivos.length} asignados
            </span>
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
                  <ul className="flex flex-col gap-2">
                    {items.map((item) => {
                      const asignando = asignandoIds.has(item.id)
                      // Sin planilla interna en el catálogo: "Interno" queda
                      // deshabilitado (no hay dónde volcar el resultado), y
                      // se avisa con la nota de abajo — pero "Externo" NO se
                      // pre-resalta, sigue exigiendo su propio clic como
                      // cualquier otro ensayo (pedido explícito: que no
                      // parezca ya asignado sin haberlo tocado).
                      const forzadoExterno = soloExterno(item)
                      const activoInterno = item.assignedExecutionMode === 'INTERNAL'
                      const activoExterno = item.assignedExecutionMode === 'EXTERNAL'
                      return (
                        <li key={item.id} className="flex flex-col gap-1 rounded-xl bg-white/50 p-2">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="min-w-0 flex-1 text-sm text-marron-cafe">{nombreItem(item)}</span>
                            {asignando && <Loader2 className="size-3.5 shrink-0 animate-spin text-verde-bosque" strokeWidth={2.5} />}
                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                disabled={forzadoExterno || asignando}
                                onClick={() => asignarUno(item, 'INTERNAL')}
                                title={forzadoExterno ? 'Sin planilla interna en el catálogo — solo puede procesarse externamente.' : undefined}
                                className={`flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[10px] font-bold transition-colors duration-150 disabled:pointer-events-none ${activoInterno
                                    ? 'border-verde-bosque bg-verde-bosque text-white shadow-sm'
                                    : forzadoExterno
                                      ? 'border-dashed border-marron-tierra/15 text-marron-cafe/25'
                                      : 'border-verde-bosque/30 text-verde-bosque hover:bg-verde-hoja/15'
                                  }`}
                              >
                                <FlaskConical className="size-3" strokeWidth={2.25} />
                                Interno
                              </button>
                              <button
                                type="button"
                                disabled={asignando}
                                onClick={() => asignarUno(item, 'EXTERNAL')}
                                className={`flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[10px] font-bold transition-colors duration-150 disabled:pointer-events-none ${activoExterno
                                    ? 'border-oro-quinua bg-oro-quinua text-marron-cafe shadow-sm'
                                    : 'border-oro-quinua/40 text-oro-quinua hover:bg-oro-quinua/15'
                                  }`}
                              >
                                <ShieldCheck className="size-3" strokeWidth={2.25} />
                                Externo
                              </button>
                            </div>
                          </div>
                          {forzadoExterno && (
                            <p className="flex items-start gap-1 text-[11px] text-marron-arcilla">
                              <Info className="mt-0.5 size-3 shrink-0" strokeWidth={2} />
                              Sin planilla interna en el catálogo.
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
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
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-marron-tierra/10 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marron-tierra/10 text-marron-cafe/60">
                <Scale className="size-4.5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-marron-cafe">Peso de la muestra</p>
                <p className="text-xs text-marron-cafe/50">Cuánto se aparta para el trabajo interno.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <FormInput
                label="Cantidad preparada"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="0"
                value={cantidadInterna}
                onChange={(e) => setCantidadInterna(e.target.value)}
                className="min-w-[8rem] flex-1"
              />
              <FormSelect
                label="Unidad"
                value={unidadInterna}
                onChange={(e) => setUnidadInterna(e.target.value)}
                className="w-24 shrink-0"
              >
                {UNIDADES_SUBMUESTRA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </FormSelect>
            </div>

            {muestraTotalGramos !== null && (
              <div className="flex flex-col gap-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-marron-tierra/10">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${excedeMuestra ? 'bg-rojo-pasankalla' : 'bg-verde-bosque'}`}
                    style={{ width: `${Math.min(100, ((internaGramos ?? 0) / muestraTotalGramos) * 100)}%` }}
                  />
                </div>
                <p className={`flex items-center gap-1.5 text-xs font-medium ${excedeMuestra ? 'text-rojo-pasankalla' : 'text-marron-cafe/45'}`}>
                  <Package className="size-3.5 shrink-0" strokeWidth={1.75} />
                  {excedeMuestra
                    ? `Lo preparado (${internaGramos} g) supera la muestra total (${solicitud.sample.quantity} ${unidadMuestra}).`
                    : internaGramos !== null
                      ? `${internaGramos} g de ${solicitud.sample.quantity} ${unidadMuestra} disponibles.`
                      : `Muestra total disponible: ${solicitud.sample.quantity} ${unidadMuestra}.`}
                </p>
              </div>
            )}
          </div>

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
              {guardando ? 'Abriendo…' : 'Guardar para trabajo interno'}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
