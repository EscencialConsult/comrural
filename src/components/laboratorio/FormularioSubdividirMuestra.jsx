import { useMemo, useState } from 'react'
import { Check, Scale, FlaskConical, ShieldCheck, CheckCircle2, Package } from 'lucide-react'
import { ORDEN_CATEGORIAS, CATEGORIA_LABEL, CATEGORIA_ICON, CATEGORIA_ESTILO } from '../../config/analisisCategorias'
import { LABORATORIO_INTERNO, LABORATORIOS_EXTERNOS, UNIDADES_SUBMUESTRA, claveDestino } from '../../config/laboratoriosDestino'
import { useSubdivisionMuestra } from '../../hooks/useSubdivisionMuestra'
import { toast } from '../../lib/toast'
import Button from '../Button.jsx'
import BotonVolver from '../BotonVolver.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import SelectorDeBase from '../formularios/SelectorDeBase.jsx'

const PASOS = [
  { id: 'ensayos', nombre: 'Ensayos' },
  { id: 'destino', nombre: 'Laboratorio' },
  { id: 'submuestras', nombre: 'Submuestras' },
]

// Stepper numerado del asistente — a diferencia de PillTabs.jsx (pensado
// para sub-navegación libre entre vistas equivalentes), acá los pasos son
// secuenciales y dependientes: no tiene sentido dejar saltar a un paso que
// todavía no se puede completar. Solo se puede volver a un paso YA
// completado (para corregir algo), nunca adelantarse.
function PasoIndicador({ pasoActual, onIrA }) {
  const indiceActual = PASOS.findIndex((p) => p.id === pasoActual)
  return (
    <div className="flex items-center">
      {PASOS.map((p, i) => {
        const completado = i < indiceActual
        const activo = i === indiceActual
        const habilitado = completado || activo
        return (
          <div key={p.id} className={`flex items-center ${i < PASOS.length - 1 ? 'flex-1' : ''}`}>
            <button
              type="button"
              disabled={!habilitado}
              onClick={() => habilitado && onIrA(p.id)}
              className="flex shrink-0 flex-col items-center gap-1.5 disabled:cursor-default"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200 ${
                  completado
                    ? 'bg-verde-lima text-marron-cafe'
                    : activo
                      ? 'bg-verde-hoja/15 text-verde-bosque ring-2 ring-verde-lima ring-offset-2 ring-offset-crema-quinua'
                      : 'bg-marron-tierra/10 text-marron-cafe/40'
                }`}
              >
                {completado ? <Check className="size-4" strokeWidth={2.5} /> : i + 1}
              </span>
              <span className={`text-[11px] font-medium whitespace-nowrap ${activo ? 'text-marron-cafe' : 'text-marron-cafe/40'}`}>
                {p.nombre}
              </span>
            </button>
            {i < PASOS.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 rounded-full transition-colors duration-300 ${completado ? 'bg-verde-lima' : 'bg-marron-tierra/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Asignación de laboratorio a la muestra ya recibida, en 3 pasos (pedido
// explícito): 1) qué ensayos se procesan ahora, 2) a qué laboratorio va
// cada uno, 3) cuánto peso/volumen se le manda a cada laboratorio. Se abre
// desde SeccionPendientes.jsx sobre una solicitud ya RECIBIDA — ver
// useSubdivisionMuestra.js para el porqué de ser 100% mock (y por qué cada
// paso se persiste solo, sin esperar a "Confirmar asignación").
export default function FormularioSubdividirMuestra({ solicitud, onVolver }) {
  const idsTotales = useMemo(() => solicitud.items.map((i) => i.id), [solicitud.items])
  const { seleccionados, asignaciones, paquetes, alternarSeleccion, reemplazarSeleccion, asignarLaboratorio, setPeso, guardar } =
    useSubdivisionMuestra(solicitud.id, idsTotales)
  const [paso, setPaso] = useState('ensayos')
  const todosMarcados = seleccionados.length === idsTotales.length && idsTotales.length > 0
  const alternarTodos = () => reemplazarSeleccion(todosMarcados ? [] : idsTotales)

  const porCategoria = useMemo(() => {
    const mapa = new Map()
    for (const item of solicitud.items) {
      if (!mapa.has(item.category)) mapa.set(item.category, [])
      mapa.get(item.category).push(item)
    }
    return ORDEN_CATEGORIAS.filter((c) => mapa.has(c)).map((c) => [c, mapa.get(c)])
  }, [solicitud.items])

  const itemsSeleccionados = useMemo(
    () => solicitud.items.filter((i) => seleccionados.includes(i.id)),
    [solicitud.items, seleccionados],
  )
  const nombreItem = (item) => (item.isCustom ? item.otherTestName : item.name)

  // Paso 2 — se marca una tanda de ensayos y se asigna con UN clic en la
  // pastilla del laboratorio destino (en vez de elegirlo en un select y
  // después tocar un botón "Asignar" aparte): la pastilla asigna al
  // instante, la marca se limpia sola y el laboratorio queda listo para la
  // siguiente tanda. Solo "Otro laboratorio" pide un paso extra (el
  // nombre), porque no viene del catálogo.
  const [marcados, setMarcados] = useState(new Set())
  const [pidiendoNombreOtro, setPidiendoNombreOtro] = useState(false)
  const [nombreOtro, setNombreOtro] = useState('')

  const alternarMarcado = (itemId) => {
    setMarcados((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(itemId)) siguiente.delete(itemId)
      else siguiente.add(itemId)
      return siguiente
    })
  }

  const asignarMarcadosA = (labId, nombre) => {
    if (marcados.size === 0) return
    asignarLaboratorio(Array.from(marcados), { labId, nombre })
    setMarcados(new Set())
    setPidiendoNombreOtro(false)
    setNombreOtro('')
  }

  const confirmarOtro = () => {
    if (nombreOtro.trim() === '') return
    asignarMarcadosA('OTRO', nombreOtro.trim())
  }

  const totalAsignados = itemsSeleccionados.filter((i) => asignaciones[i.id]).length
  const faltanAsignar = itemsSeleccionados.length - totalAsignados

  // Paso 3 — un paquete por cada destino distinto que resultó del paso 2
  // (ver claveDestino: agrupa por laboratorio del catálogo, o por nombre
  // propio si es 'OTRO').
  const paquetesPorDestino = useMemo(() => {
    const mapa = new Map()
    for (const item of itemsSeleccionados) {
      const asignacion = asignaciones[item.id]
      if (!asignacion) continue
      const clave = claveDestino(asignacion)
      if (!mapa.has(clave)) mapa.set(clave, { nombre: asignacion.nombre, esInterno: asignacion.labId === 'INTERNO', ensayos: [] })
      mapa.get(clave).ensayos.push(item)
    }
    return Array.from(mapa.entries())
  }, [itemsSeleccionados, asignaciones])

  const puedeConfirmar =
    paquetesPorDestino.length > 0 && paquetesPorDestino.every(([clave]) => Number(paquetes[clave]?.cantidad) > 0)

  const confirmar = () => {
    if (!puedeConfirmar) return
    guardar()
    toast.success('Laboratorio asignado.')
    onVolver()
  }

  const puedeAvanzarDeEnsayos = seleccionados.length > 0
  const puedeAvanzarDeDestino = itemsSeleccionados.length > 0 && faltanAsignar === 0

  const unidadMuestra = solicitud.sample.unit === 'OTRA' ? solicitud.sample.otherUnit : solicitud.sample.unit

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-marron-tierra/10 pb-4">
        <BotonVolver onClick={onVolver} ariaLabel="Volver a Pendientes" />
        <div className="flex min-w-0 flex-1 basis-[220px] items-center gap-3">
          <div className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque sm:flex">
            <Scale className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-marron-cafe sm:text-lg">Asignar laboratorio — {solicitud.sample.code}</h2>
            <p className="truncate text-xs text-marron-cafe/60">
              Muestra total: {solicitud.sample.quantity} {unidadMuestra}
              {' · '}Lote {solicitud.lot.code} · {solicitud.product.name}
            </p>
          </div>
        </div>
      </div>

      <PasoIndicador pasoActual={paso} onIrA={setPaso} />

      {paso === 'ensayos' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-marron-cafe/60">Marcá los ensayos que vas a procesar ahora.</p>
            <button
              type="button"
              onClick={alternarTodos}
              className="shrink-0 text-xs font-medium text-verde-bosque underline decoration-verde-bosque/40 underline-offset-2 transition-colors duration-150 hover:text-marron-cafe"
            >
              {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
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
                      const marcado = seleccionados.includes(item.id)
                      return (
                        <li key={item.id}>
                          <label
                            className={`flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition-colors duration-150 ${
                              marcado ? 'bg-verde-lima/15' : 'hover:bg-white/70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => alternarSeleccion(item.id)}
                              className="size-4 shrink-0 accent-verde-lima"
                            />
                            <span className="flex-1 text-sm text-marron-cafe">{nombreItem(item)}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" disabled={!puedeAvanzarDeEnsayos} onClick={() => setPaso('destino')}>
              Siguiente — Elegir laboratorio
            </Button>
            <span className="text-xs text-marron-cafe/50">
              {seleccionados.length > 0 ? `${seleccionados.length} ensayo${seleccionados.length === 1 ? '' : 's'} marcado${seleccionados.length === 1 ? '' : 's'}` : 'Marcá al menos uno para continuar'}
            </span>
          </div>
        </div>
      )}

      {paso === 'destino' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-marron-cafe/60">Marcá los ensayos que van al mismo laboratorio y asignalos juntos.</p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                faltanAsignar === 0 ? 'bg-verde-hoja/15 text-verde-bosque' : 'bg-marron-arcilla/15 text-marron-arcilla'
              }`}
            >
              {totalAsignados}/{itemsSeleccionados.length} asignados
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl bg-marron-tierra/5">
            <ul className="flex flex-col">
              {itemsSeleccionados.map((item) => {
                const asignacion = asignaciones[item.id]
                const marcado = marcados.has(item.id)
                return (
                  <li key={item.id} className="border-b border-marron-tierra/10 last:border-b-0">
                    <label
                      className={`flex cursor-pointer items-center gap-2 px-3.5 py-2.5 transition-colors duration-150 ${
                        marcado ? 'bg-verde-lima/15' : 'hover:bg-white/70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternarMarcado(item.id)}
                        className="size-4 shrink-0 accent-verde-lima"
                      />
                      <span className="flex-1 text-sm text-marron-cafe">{nombreItem(item)}</span>
                      {asignacion ? (
                        <span
                          className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            asignacion.labId === 'INTERNO' ? 'bg-verde-hoja/15 text-verde-bosque' : 'bg-oro-quinua/15 text-oro-quinua'
                          }`}
                        >
                          {asignacion.labId === 'INTERNO' ? (
                            <FlaskConical className="size-3" strokeWidth={2.5} />
                          ) : (
                            <ShieldCheck className="size-3" strokeWidth={2.5} />
                          )}
                          {asignacion.nombre}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] font-medium text-marron-cafe/35">Sin asignar</span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex flex-col gap-2.5 rounded-2xl bg-marron-tierra/5 p-4">
            <p className="text-xs font-medium text-marron-cafe/50">
              {marcados.size > 0
                ? `${marcados.size} ensayo${marcados.size === 1 ? '' : 's'} marcado${marcados.size === 1 ? '' : 's'} — tocá el laboratorio destino`
                : 'Marcá ensayos arriba y tocá el laboratorio destino para asignarlos'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={marcados.size === 0}
                onClick={() => asignarMarcadosA(LABORATORIO_INTERNO.id, LABORATORIO_INTERNO.nombre)}
                className="flex items-center gap-1.5 rounded-full border border-verde-bosque/30 px-3.5 py-1.5 text-xs font-medium text-verde-bosque transition-colors duration-150 hover:bg-verde-hoja/15 disabled:pointer-events-none disabled:opacity-40"
              >
                <FlaskConical className="size-3.5" strokeWidth={2} />
                {LABORATORIO_INTERNO.nombre}
              </button>
              <button
                type="button"
                disabled={marcados.size === 0}
                onClick={() => setPidiendoNombreOtro(true)}
                className="flex items-center gap-1.5 rounded-full border border-marron-tierra/20 px-3.5 py-1.5 text-xs font-medium text-marron-cafe/70 transition-colors duration-150 hover:bg-marron-tierra/10 disabled:pointer-events-none disabled:opacity-40"
              >
                <ShieldCheck className="size-3.5" strokeWidth={2} />
                Otro laboratorio…
              </button>
            </div>

            {/* Laboratorio externo va por buscador, no pastilla — a
                diferencia de Interno (un destino fijo), la lista de
                externos puede crecer, y con varios buscarlo tipeando es más
                rápido que reconocer una pastilla entre muchas (mismo
                criterio que SelectorDeBase.jsx en el resto del sistema). */}
            <SelectorDeBase
              label="O buscar laboratorio externo"
              valor={null}
              opciones={LABORATORIOS_EXTERNOS}
              onSeleccionar={(op) => asignarMarcadosA(op.id, op.nombre)}
              disabled={marcados.size === 0}
              placeholder="Buscar laboratorio…"
              className="max-w-xs"
            />

            {pidiendoNombreOtro && (
              <div className="flex flex-wrap items-end gap-2 pt-1">
                <FormInput
                  label="Nombre del laboratorio"
                  value={nombreOtro}
                  onChange={(e) => setNombreOtro(e.target.value)}
                  autoFocus
                  className="min-w-[220px]"
                />
                <Button type="button" variant="secondary" disabled={nombreOtro.trim() === ''} onClick={confirmarOtro}>
                  Asignar
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setPaso('ensayos')}>
              Atrás
            </Button>
            <Button type="button" disabled={!puedeAvanzarDeDestino} onClick={() => setPaso('submuestras')}>
              Siguiente — Peso de submuestras
            </Button>
          </div>
        </div>
      )}

      {paso === 'submuestras' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-marron-cafe/60">
            Un paquete por laboratorio destino — indicá cuánto peso o volumen le mandás a cada uno.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {paquetesPorDestino.map(([clave, { nombre, esInterno, ensayos }]) => (
              <div
                key={clave}
                className={`flex flex-col gap-3 rounded-2xl border-l-4 bg-marron-tierra/5 p-4 ${esInterno ? 'border-verde-bosque/40' : 'border-oro-quinua/50'}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${esInterno ? 'bg-verde-hoja/15 text-verde-bosque' : 'bg-oro-quinua/15 text-oro-quinua'}`}>
                    {esInterno ? <FlaskConical className="size-4.5" strokeWidth={1.75} /> : <ShieldCheck className="size-4.5" strokeWidth={1.75} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-marron-cafe">{nombre}</p>
                    <p className="text-xs text-marron-cafe/50">{ensayos.length} ensayo{ensayos.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ensayos.map((e) => (
                    <span key={e.id} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-marron-cafe/70">
                      {nombreItem(e)}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <FormInput
                    label="Cantidad de submuestra"
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="0"
                    value={paquetes[clave]?.cantidad ?? ''}
                    onChange={(e) => setPeso(clave, 'cantidad', e.target.value)}
                  />
                  <FormSelect
                    label="Unidad"
                    value={paquetes[clave]?.unidad ?? 'G'}
                    onChange={(e) => setPeso(clave, 'unidad', e.target.value)}
                  >
                    {UNIDADES_SUBMUESTRA.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </FormSelect>
                </div>
              </div>
            ))}
          </div>

          {paquetesPorDestino.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-marron-cafe/45">
              <Package className="size-3.5 shrink-0" strokeWidth={1.75} />
              Verificá que la suma de submuestras no supere la muestra total ({solicitud.sample.quantity} {unidadMuestra}).
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => setPaso('destino')}>
              Atrás
            </Button>
            <Button type="button" disabled={!puedeConfirmar} onClick={confirmar} className="gap-1.5">
              <CheckCircle2 className="size-4" strokeWidth={2} />
              Confirmar asignación
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
