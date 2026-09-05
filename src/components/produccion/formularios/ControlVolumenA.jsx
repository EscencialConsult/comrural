import { useEffect, useRef, useState } from 'react'
import { Plus, TriangleAlert } from 'lucide-react'
import { productsService } from '../../../services/productsService'
import { shiftsService } from '../../../services/shiftsService'
import { productionAreaAService } from '../../../services/productionAreaAService'
import { rawMaterialReceptionsService } from '../../../services/rawMaterialReceptionsService'
import { listarTodo } from '../../../services/paginacion'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Badge from '../../Badge.jsx'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import ComboboxLote from '../../formularios/ComboboxLote.jsx'
import Skeleton from '../../Skeleton.jsx'
import EmptyState from '../../EmptyState.jsx'

const RESPONSABLES = [
  { rol: 'Llena', puesto: 'Encargado de grupo' },
  { rol: 'Verifica', puesto: 'Supervisor de Producción' },
]

// Sección "Subproductos/Mermas" del papel (a-e) — nombres reales según RP-09,
// mismos que la versión mock anterior. `merma_kg` = suma de las 5 (SUG-01
// del backend, ver comrural_erp_backend/docs/production-area-a.md §3).
const COLUMNAS_MERMA = [
  { key: 'trillarKg', label: 'Para trillar' },
  { key: 'menudaKg', label: 'Menuda' },
  { key: 'pajaKg', label: 'Paja húmeda' },
  { key: 'piedraKg', label: 'Piedra' },
  { key: 'saponinaKg', label: 'Saponina' },
]

const FORM_VACIO = {
  lotId: '',
  shiftId: '',
  entryDate: new Date().toLocaleDateString('en-CA'),
  usedBags: null,
  usedKg: null,
  washedBags: null,
  washedKg: null,
  trillarKg: null,
  menudaKg: null,
  pajaKg: null,
  piedraKg: null,
  saponinaKg: null,
}

// Mismo filtro que SeccionLotesProduccion.jsx (pestaña "Lotes") — el punto
// de entrada a Área A pasó a ser LIBERADO (pedido explícito, ver esa
// pantalla). El buscador de la cabecera tenía que filtrar igual: si seguía
// en ACEPTADO_RECEPCION/LAVADO, nunca encontraba los lotes que "Lotes" ya
// entrega, porque esos ya no existen en ese estado para cuando llegan acá.
const ESTADOS_CANDIDATOS = ['LIBERADO']

// Regla exacta del relevamiento (I-PRO-03/R-01): Secador 1 no debe trabajar
// por debajo de 70°C — mismo umbral que dispara la notificación del backend
// al cerrar (ver ProductionAreaAEntriesService.close,
// DRYER_TEMP_ALERT_THRESHOLD_C). Acá es solo aviso visual del lado
// cliente, la alerta real la manda el servidor.
const SECADOR_1_MIN = 70

// Peso estándar de un saco de quinua lavada, para autocompletar "Sacos
// lavados (Kg)" a partir de "Sacos lavados (bolsas)" — pedido explícito, el
// valor calculado sigue siendo editable a mano después.
const KG_POR_SACO_LAVADO = 45

// Formulario 2 del relevamiento — registro real de Área A
// (production-area-a). A diferencia de la versión mock anterior (una tabla
// con muchas filas/turnos a la vez), el backend modela UNA fila por
// lote×turno×fecha operativa: acá se da de alta una entrada por vez, y
// abajo se lista el historial ya cargado de ese lote.
//
// Absorbe también el cierre de turno (I-PRO-03/R-01, antes
// ControlTemperaturaHumedad.jsx aparte) — pedido explícito de unificar en
// una sola pestaña "Volumen A". El backend ya modelaba esto como dos
// llamadas sobre la MISMA fila (POST crea, PATCH .../close cierra con
// avgDryer1TempC/avgDryer2TempC — ver productionAreaAService.js), así que
// unificar la pantalla no tocó nada del backend, solo juntó "Historial del
// lote" (antes de solo lectura) con el formulario de cierre por turno
// abierto.
function CampoLote({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</dt>
      <dd className="text-sm font-medium text-marron-cafe">{valor ?? '—'}</dd>
    </div>
  )
}

export default function ControlVolumenA({ loteInicialId }) {
  const [productos, setProductos] = useState(null)
  const [turnos, setTurnos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [form, setForm] = useState({ ...FORM_VACIO, lotId: loteInicialId ?? '' })
  const [historial, setHistorial] = useState(null)
  const [datosLote, setDatosLote] = useState(null)
  const { enviando, ejecutar } = useSolicitud()
  // Promedios de secado en edición por turno abierto (entryId -> {avg1, avg2})
  // — mismo criterio que ControlTemperaturaHumedad.jsx (ahora fusionado acá).
  const [promedios, setPromedios] = useState({})
  const [cerrandoId, setCerrandoId] = useState(null)

  // Refs de los campos obligatorios, en el mismo orden que `CAMPOS_OBLIGATORIOS`
  // — permiten scrollear al primero que falte al clickear "Registrar entrada"
  // en vez de solo deshabilitar el botón sin indicar qué falta.
  const camposRef = useRef({})
  const refCampo = (key) => (el) => {
    camposRef.current[key] = el
  }

  useEffect(() => {
    let cancelado = false
    Promise.all([listarTodo(productsService.listar), shiftsService.listar()])
      .then(([productos, turnosResp]) => {
        if (cancelado) return
        setProductos(productos)
        setTurnos(turnosResp)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!form.lotId) {
      setHistorial(null)
      return
    }
    let cancelado = false
    productionAreaAService
      .listarPorLote(form.lotId)
      .then((data) => !cancelado && setHistorial(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [form.lotId])

  // Autocompleta producto/sacos/pesos del lote elegido — vista consolidada
  // de raw-material-receptions (ver docs/raw-material-receptions.md), único
  // lugar que ya trae `storedPackageCount`/`acceptedNetWeightKg`/
  // `averageAcceptedNetWeightKg` calculados por el backend. Solo lectura:
  // si falla (p. ej. el usuario no tiene el permiso), la cabecera sigue
  // funcionando igual, simplemente sin el resumen del lote.
  useEffect(() => {
    if (!form.lotId) {
      setDatosLote(null)
      return
    }
    let cancelado = false
    rawMaterialReceptionsService
      .obtener(form.lotId)
      .then((data) => !cancelado && setDatosLote(data))
      .catch(() => !cancelado && setDatosLote(null))
    return () => {
      cancelado = true
    }
  }, [form.lotId])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const turnoNombre = (id) => turnos?.find((t) => t.id === id)?.name ?? '—'
  const entradasAbiertas = (historial ?? []).filter((h) => !h.closedAt)

  const actualizar = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  // Topes del lote (sacos/kg almacenados, ver resumen autocompletado arriba)
  // y del propio turno (lo lavado no puede superar lo utilizado). Si el
  // valor tipeado supera el tope, se corrige al tope automáticamente — no
  // se deja pasar el número inválido ni un instante.
  const maxBolsasLote = datosLote?.warehouseReceipt?.storedPackageCount ?? null
  const maxKgLote = datosLote?.warehouseReceipt?.acceptedNetWeightKg ?? null

  const actualizarConTope = (campo, tope) => (valorStr) => {
    if (valorStr === '') {
      setForm((f) => ({ ...f, [campo]: null }))
      return
    }
    const valor = Number(valorStr)
    setForm((f) => ({ ...f, [campo]: tope != null && valor > tope ? tope : valor }))
  }

  const enTope = (valor, tope) => valor != null && tope != null && valor >= tope
  const claseTope = (excedido) =>
    excedido ? 'border-rojo-pasankalla text-rojo-pasankalla focus-visible:border-rojo-pasankalla focus-visible:ring-rojo-pasankalla/20' : ''

  // "Sacos lavados (bolsas)" autocompleta "Sacos lavados (Kg)" (bolsas × 45)
  // — pedido explícito. Sigue siendo editable a mano: esto solo corre al
  // tipear bolsas, no al tipear kg.
  const actualizarSacosLavadosBolsas = (valorStr) => {
    if (valorStr === '') {
      setForm((f) => ({ ...f, washedBags: null }))
      return
    }
    const valor = Number(valorStr)
    const tope = form.usedBags
    const acotado = tope != null && valor > tope ? tope : valor
    setForm((f) => ({ ...f, washedBags: acotado, washedKg: Number((acotado * KG_POR_SACO_LAVADO).toFixed(3)) }))
  }

  const actualizarPromedio = (entryId, campo) => (valor) =>
    setPromedios((p) => ({ ...p, [entryId]: { ...p[entryId], [campo]: valor } }))

  const cerrarEntrada = async (entryId) => {
    const { avg1, avg2 } = promedios[entryId] ?? {}
    if (avg1 == null || avg2 == null) {
      toast.error('Ingresá el promedio de los dos secadores.')
      return
    }
    setCerrandoId(entryId)
    try {
      const actualizada = await ejecutar(() =>
        productionAreaAService.cerrar(entryId, { avgDryer1TempC: avg1, avgDryer2TempC: avg2 }),
      )
      toast.success('Turno cerrado.')
      setHistorial((prev) => prev.map((h) => (h.id === entryId ? actualizada : h)))
    } catch (err) {
      toast.error(err.message ?? 'No se pudo cerrar el turno.')
    } finally {
      setCerrandoId(null)
    }
  }

  const merma = COLUMNAS_MERMA.reduce((acc, { key }) => acc + (form[key] ?? 0), 0)
  const dif =
    form.washedKg != null && form.usedKg != null ? form.washedKg + merma - form.usedKg : null

  // Mismo orden en que aparecen en el formulario — define tanto qué es
  // obligatorio como a qué campo se scrollea primero si falta más de uno.
  const CAMPOS_OBLIGATORIOS = ['lotId', 'shiftId', 'entryDate', 'usedBags', 'usedKg', 'washedBags', 'washedKg', ...COLUMNAS_MERMA.map((c) => c.key)]

  const intentarRegistrar = () => {
    const faltante = CAMPOS_OBLIGATORIOS.find((key) => form[key] == null || form[key] === '')
    if (faltante) {
      const el = camposRef.current[faltante]
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.querySelector('input, select, [role="combobox"]')?.focus()
      return
    }
    registrar()
  }

  const registrar = async () => {
    try {
      const dto = {
        lotId: form.lotId,
        shiftId: form.shiftId,
        entryDate: form.entryDate,
        usedBags: form.usedBags,
        usedKg: form.usedKg,
        washedBags: form.washedBags,
        washedKg: form.washedKg,
        trillarKg: form.trillarKg,
        menudaKg: form.menudaKg,
        pajaKg: form.pajaKg,
        piedraKg: form.piedraKg,
        saponinaKg: form.saponinaKg,
      }
      const creada = await ejecutar(() => productionAreaAService.crear(dto))
      toast.success('Entrada de Volumen A registrada.')
      setHistorial((h) => [creada, ...(Array.isArray(h) ? h : [])])
      setForm({ ...FORM_VACIO, lotId: form.lotId })
    } catch (err) {
      toast.error(err.message ?? 'No se pudo guardar el registro.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario
        antetitulo="Registro"
        titulo="Control de Volumen de Producción — Área A"
        codigo="P-PRO-01/R-24"
        version="02"
      />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Cabecera">
        {!productos || !turnos ? (
          <Skeleton className="h-16" />
        ) : (
          <div ref={refCampo('lotId')}>
            <ComboboxLote
              label="Lote MP"
              value={form.lotId}
              onChange={actualizar('lotId')}
              estados={ESTADOS_CANDIDATOS}
              productoNombre={productoNombre}
            />
          </div>
        )}

        {form.lotId && datosLote?.warehouseReceipt && (
          <dl className="grid gap-4 rounded-2xl bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <CampoLote etiqueta="Producto" valor={datosLote.lot.productName} />
            <CampoLote etiqueta="Sacos del lote" valor={datosLote.warehouseReceipt.storedPackageCount} />
            <CampoLote
              etiqueta="Peso total del lote"
              valor={
                datosLote.warehouseReceipt.acceptedNetWeightKg != null
                  ? `${datosLote.warehouseReceipt.acceptedNetWeightKg} kg`
                  : null
              }
            />
            <CampoLote
              etiqueta="Peso promedio de saco"
              valor={
                datosLote.warehouseReceipt.averageAcceptedNetWeightKg != null
                  ? `${datosLote.warehouseReceipt.averageAcceptedNetWeightKg} kg`
                  : null
              }
            />
          </dl>
        )}
      </SeccionFormulario>

      <SeccionFormulario numero={2} titulo="Volumen del turno">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {!turnos ? (
            <Skeleton className="h-16" />
          ) : (
            <div ref={refCampo('shiftId')}>
              <FormSelect label="Turno" value={form.shiftId} onChange={(e) => actualizar('shiftId')(e.target.value)}>
                <option value="">Seleccionar…</option>
                {turnos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}

          <div ref={refCampo('entryDate')}>
            <FormInput
              label="Fecha operativa"
              type="date"
              value={form.entryDate}
              onChange={(e) => actualizar('entryDate')(e.target.value)}
            />
          </div>

          <div ref={refCampo('usedBags')}>
            <FormInput
              label="Bolsas utilizadas"
              type="number"
              min="0"
              max={maxBolsasLote ?? undefined}
              value={form.usedBags ?? ''}
              onChange={(e) => actualizarConTope('usedBags', maxBolsasLote)(e.target.value)}
              className={claseTope(enTope(form.usedBags, maxBolsasLote))}
              hint={maxBolsasLote != null ? `Máx. ${maxBolsasLote} sacos del lote` : undefined}
            />
          </div>
          <div ref={refCampo('usedKg')}>
            <FormInput
              label="Kg utilizados"
              type="number"
              min="0"
              step="0.001"
              max={maxKgLote ?? undefined}
              value={form.usedKg ?? ''}
              onChange={(e) => actualizarConTope('usedKg', maxKgLote)(e.target.value)}
              className={claseTope(enTope(form.usedKg, maxKgLote))}
              hint={maxKgLote != null ? `Máx. ${maxKgLote} kg del lote` : undefined}
            />
          </div>
          <div ref={refCampo('washedBags')}>
            <FormInput
              label="Sacos lavados (bolsas)"
              type="number"
              min="0"
              max={form.usedBags ?? undefined}
              value={form.washedBags ?? ''}
              onChange={(e) => actualizarSacosLavadosBolsas(e.target.value)}
              className={claseTope(enTope(form.washedBags, form.usedBags))}
              hint={form.usedBags != null ? `Máx. ${form.usedBags} (bolsas utilizadas)` : undefined}
            />
          </div>
          <div ref={refCampo('washedKg')}>
            <FormInput
              label="Sacos lavados (Kg)"
              type="number"
              min="0"
              step="0.001"
              value={form.washedKg ?? ''}
              onChange={(e) => actualizar('washedKg')(e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={3}
        titulo="Subproductos y merma"
        nota="DIF = Lavados + Merma − Utilizados (puede ser negativo — ganancia/pérdida de peso por humedad)."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLUMNAS_MERMA.map(({ key, label }) => (
            <div key={key} ref={refCampo(key)}>
              <FormInput
                label={label}
                type="number"
                min="0"
                step="0.001"
                value={form[key] ?? ''}
                onChange={(e) => actualizar(key)(e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-marron-cafe">
          <span>Merma total: {merma.toFixed(3)} kg</span>
          {dif != null && (
            <span className={`font-semibold ${dif < 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'}`}>
              DIF: {dif.toFixed(3)} kg
            </span>
          )}
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={4} titulo="Firmas">
        <FirmasResponsables responsables={RESPONSABLES} />
      </SeccionFormulario>

      <div className="flex justify-end">
        <Button onClick={intentarRegistrar} disabled={enviando}>
          <Plus className="mr-1.5 size-4" strokeWidth={2} />
          {enviando ? 'Guardando…' : 'Registrar entrada'}
        </Button>
      </div>

      <SeccionFormulario
        numero={5}
        titulo="Cierre de turno — Temperatura y Humedad"
        nota={`I-PRO-03/R-01 · Secador 1 no debe bajar de ${SECADOR_1_MIN}°C — bajo ese umbral el cierre dispara una alerta.`}
      >
        {!form.lotId ? (
          <p className="text-sm text-marron-cafe/50">Elegí un lote arriba para ver sus turnos abiertos.</p>
        ) : historial === null ? (
          <Skeleton className="h-24" />
        ) : entradasAbiertas.length === 0 ? (
          <EmptyState Icon={Plus} titulo="No hay turnos abiertos para este lote" />
        ) : (
          <div className="flex flex-col gap-3">
            {entradasAbiertas.map((e) => {
              const avg1 = promedios[e.id]?.avg1
              const secador1Bajo = avg1 != null && avg1 < SECADOR_1_MIN
              return (
                <div key={e.id} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white/70 p-4">
                  <div className="flex flex-col gap-1 text-xs text-marron-cafe/60">
                    <span className="font-semibold text-marron-cafe">{e.entryDate}</span>
                    <span>
                      Utilizados: {e.usedKg.toFixed(3)} kg · Lavados: {e.washedKg.toFixed(3)} kg
                    </span>
                  </div>
                  <FormInput
                    label="Secador 1 (°C, promedio)"
                    type="number"
                    step="0.01"
                    value={avg1 ?? ''}
                    onChange={(ev) => actualizarPromedio(e.id, 'avg1')(ev.target.value === '' ? null : Number(ev.target.value))}
                    className="w-40"
                  />
                  <FormInput
                    label="Secador 2 (°C, promedio)"
                    type="number"
                    step="0.01"
                    value={promedios[e.id]?.avg2 ?? ''}
                    onChange={(ev) => actualizarPromedio(e.id, 'avg2')(ev.target.value === '' ? null : Number(ev.target.value))}
                    className="w-40"
                  />
                  {secador1Bajo && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-rojo-pasankalla">
                      <TriangleAlert className="size-3.5" strokeWidth={2} />
                      Bajo {SECADOR_1_MIN}°C
                    </span>
                  )}
                  <Button
                    variant="secondary"
                    className="ml-auto px-4 py-2 text-xs"
                    disabled={enviando && cerrandoId === e.id}
                    onClick={() => cerrarEntrada(e.id)}
                  >
                    {enviando && cerrandoId === e.id ? 'Cerrando…' : 'Cerrar turno'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </SeccionFormulario>

      <SeccionFormulario numero={6} titulo="Historial del lote">
        {!form.lotId ? (
          <p className="text-sm text-marron-cafe/50">Elegí un lote arriba para ver sus entradas registradas.</p>
        ) : historial === null ? (
          <Skeleton className="h-24" />
        ) : historial.length === 0 ? (
          <EmptyState Icon={Plus} titulo="Todavía no hay entradas para este lote" />
        ) : (
          <>
            {/* Tarjetas en mobile — la tabla de abajo obliga a scrollear
                horizontal en pantallas angostas (min-w-[720px]). */}
            <div className="flex flex-col gap-2 md:hidden">
              {historial.map((h) => (
                <div key={h.id} className="flex flex-col gap-2 rounded-2xl bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-marron-cafe">{h.entryDate}</p>
                      <p className="text-xs text-marron-cafe/60">{turnoNombre(h.shiftId)}</p>
                    </div>
                    <Badge tono={h.closedAt ? 'positivo' : 'alerta'}>{h.closedAt ? 'Cerrada' : 'Abierta'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-marron-tierra/15 pt-2 text-xs">
                    <span className="text-marron-cafe/60">
                      Utilizados: <span className="font-semibold text-marron-cafe">{h.usedKg.toFixed(3)} kg</span>
                    </span>
                    <span className="text-marron-cafe/60">
                      Lavados: <span className="font-semibold text-marron-cafe">{h.washedKg.toFixed(3)} kg</span>
                    </span>
                    <span className="text-marron-cafe/60">
                      Merma: <span className="font-semibold text-marron-cafe">{h.mermaKg.toFixed(3)} kg</span>
                    </span>
                    <span className="text-marron-cafe/60">
                      DIF:{' '}
                      <span className={`font-semibold ${h.difKg < 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'}`}>
                        {h.difKg.toFixed(3)} kg
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl bg-white/70 md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Turno</th>
                  <th className="px-3 py-2.5">Utilizados (kg)</th>
                  <th className="px-3 py-2.5">Lavados (kg)</th>
                  <th className="px-3 py-2.5">Merma (kg)</th>
                  <th className="px-3 py-2.5">DIF (kg)</th>
                  <th className="px-3 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id} className="border-b border-marron-tierra/15 last:border-b-0">
                    <td className="px-3 py-2">{h.entryDate}</td>
                    <td className="px-3 py-2">{turnoNombre(h.shiftId)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.usedKg.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.washedKg.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.mermaKg.toFixed(3)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${h.difKg < 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'}`}>
                      {h.difKg.toFixed(3)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tono={h.closedAt ? 'positivo' : 'alerta'}>{h.closedAt ? 'Cerrada' : 'Abierta'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </SeccionFormulario>
    </div>
  )
}
