import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { shiftsService } from '../../../services/shiftsService'
import { productsService } from '../../../services/productsService'
import { lotsService } from '../../../services/lotsService'
import { listarTodo } from '../../../services/paginacion'
import { toast } from '../../../lib/toast'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import ComboboxLote from '../../formularios/ComboboxLote.jsx'
import Button from '../../Button.jsx'
import Skeleton from '../../Skeleton.jsx'

// Mismo filtro que SeccionControlExistencias.jsx (Área B): lotes de materia
// prima que ya iniciaron el lavado en Área A. Es la única entrada real de
// lotes candidatos a este formulario — LotsService.startWashing es lo que
// los pone en este estado (ver comrural_erp_backend/docs/lots.md §3).
const ESTADOS_CANDIDATOS = ['LAVADO']

// Tres firmas, no dos (relevamiento): el encargado llena en papel, el
// supervisor verifica físicamente y transcribe al sistema, y Jefe de
// Producción revisa recién al cierre del lote (no turno a turno).
const RESPONSABLES = [
  { rol: 'Encargado de grupo', puesto: 'Registra en papel durante el turno' },
  { rol: 'Supervisor de producción', puesto: 'Verifica y transcribe al sistema' },
  { rol: 'Jefe de Producción', puesto: 'Revisa el cierre del lote' },
]

const NORMAS_DISPONIBLES = ['Regl. CE 834/07', 'NB - Ley 3525', 'LPO México', 'BIOSUISSE', 'NOP']

// RP-19: son las únicas presentaciones de producto terminado que arma Área
// B. El peso fijo por unidad es lo que permite autocompletar "Envasados
// (kg)" a partir de la cantidad de sacos/bolsas, igual que con el peso fijo
// de saco lavado (RP-12) más abajo.
const PRESENTACIONES = [
  { value: 'bigbag-1000', label: 'Big Bag 1.000 kg', kg: 1000 },
  { value: 'bigbag-1200', label: 'Big Bag 1.200 kg', kg: 1200 },
  { value: 'kraft-25', label: 'Papel kraft 25 kg', kg: 25 },
  { value: 'kraft-11.34', label: 'Papel kraft 11,34 kg', kg: 11.34 },
]

// RP-13. E ("quinua final") es saldo de un turno anterior que no llegó a
// completar una presentación — no es material nuevo entrando al área.
const TIPOS_PRODUCTO = [
  { value: '', label: '—' },
  { value: 'N', label: 'N — Lavado (nuevo)' },
  { value: 'R', label: 'R — Por recuperar' },
  { value: 'E', label: 'E — Quinua final (saldo turno anterior)' },
]

// RP-12: todos los sacos de quinua LAVADA (lo que entra al área, columna
// "Usados") pesan 45 kg — por eso ahí sí se autocompleta el peso a partir
// de la cantidad de sacos. Los subproductos (grupo de abajo) NO tienen peso
// fijo por saco (por eso el papel los anota como par "sacos / kg" en vez de
// un solo número): ahí cada campo se carga a mano.
const KG_POR_SACO_LAVADO = 45

// Grupo "Detalle del proceso" — subproductos generados en el turno, cada
// uno con su propio par sacos/kg (peso variable). RP-15: el formulario los
// llama "Merma" en el resumen pero NO son desecho, son subproductos con
// destino comercial (mercado local / alimento balanceado) — el sistema
// tiene que tratarlos como tales, no como pérdida.
const GRUPOS_DETALLE = [
  { key: 'q2da', label: 'Q. 2da (a)' },
  { key: 'pNegros', label: 'P. Negros (b)' },
  { key: 'rechazo', label: 'Rechazo (c)' },
  { key: 'polvillo', label: 'Polvillo (d)' },
  { key: 'saldoQf', label: 'Saldo Q.F.' },
  { key: 'x', label: 'x Kg' },
]

let siguienteId = 1
const filaVacia = (loteMp = '') => ({
  id: siguienteId++,
  fecha: '',
  turnoId: '',
  loteMp,
  tipo: '',
  usadosSacos: '',
  usadosKg: '',
  envasadosSacos: '',
  envasadosKg: '',
  encargado: '',
  control: '',
  observaciones: '',
  ...Object.fromEntries(GRUPOS_DETALLE.flatMap(({ key }) => [[`${key}Sacos`, ''], [`${key}Kg`, '']])),
})

const filaResumenVacia = () => ({ id: siguienteId++, loteMp: '', envasadosKg: '', subproductosKg: '' })

const sumar = (filas, campo) => filas.reduce((acc, f) => acc + (Number(f[campo]) || 0), 0)
const numero = (v) => (v === '' || v == null ? '' : Number(v))

// Formulario 3 del relevamiento — registro de Área B (P-PRO-01/R-25). No
// existe todavía un módulo production-area-b en el backend (a diferencia de
// production-area-a, que sí es real), así que "Guardar" sigue sin persistir
// — pero el lote y el producto SÍ son entidades reales (lots/products), así
// que se conectan a esos services en vez de tipearlos a mano: mismo filtro
// que SeccionControlExistencias.jsx (lotes en LAVADO) para no dejar elegir
// un lote que Área B todavía no puede tener.
export default function ControlVolumenB() {
  const [turnos, setTurnos] = useState(null)
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [loteId, setLoteId] = useState('')
  const [datosLote, setDatosLote] = useState(null)
  const [presentacion, setPresentacion] = useState(PRESENTACIONES[0].value)
  const [normas, setNormas] = useState([])
  const [otraNorma, setOtraNorma] = useState('')
  const [filas, setFilas] = useState(() => [filaVacia()])
  const [resumen, setResumen] = useState(() => [filaResumenVacia()])

  useEffect(() => {
    let cancelado = false
    Promise.all([shiftsService.listar(), listarTodo(productsService.listar)])
      .then(([turnosResp, productosResp]) => {
        if (cancelado) return
        setTurnos(turnosResp)
        setProductos(productosResp)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  // Autocompleta código y producto del lote elegido — mismo patrón que
  // ControlVolumenA.jsx. Solo lectura: si falla, la cabecera sigue
  // funcionando, simplemente sin el resumen del lote.
  useEffect(() => {
    if (!loteId) {
      setDatosLote(null)
      return
    }
    let cancelado = false
    lotsService
      .obtener(loteId)
      .then((data) => !cancelado && setDatosLote(data))
      .catch(() => !cancelado && setDatosLote(null))
    return () => {
      cancelado = true
    }
  }, [loteId])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const pesoPresentacion = PRESENTACIONES.find((p) => p.value === presentacion)?.kg ?? 0

  const alternarNorma = (norma) =>
    setNormas((prev) => (prev.includes(norma) ? prev.filter((n) => n !== norma) : [...prev, norma]))

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  // Autocompletan el kg del par a partir del peso fijo (RP-12 para sacos
  // lavados, RP-19 para la presentación elegida en la cabecera) — el valor
  // calculado sigue siendo editable a mano después, igual que en Volumen A.
  const actualizarUsadosSacos = (id) => (valorStr) => {
    const sacos = valorStr === '' ? '' : Number(valorStr)
    setFilas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, usadosSacos: sacos, usadosKg: sacos === '' ? '' : Number((sacos * KG_POR_SACO_LAVADO).toFixed(3)) } : f)),
    )
  }
  const actualizarEnvasadosSacos = (id) => (valorStr) => {
    const sacos = valorStr === '' ? '' : Number(valorStr)
    setFilas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, envasadosSacos: sacos, envasadosKg: sacos === '' ? '' : Number((sacos * pesoPresentacion).toFixed(3)) } : f)),
    )
  }

  const agregarFila = () => setFilas((prev) => [...prev, filaVacia(datosLote?.code ?? '')])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const actualizarResumen = (id, campo) => (valor) =>
    setResumen((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)))
  const agregarFilaResumen = () => setResumen((prev) => [...prev, filaResumenVacia()])
  const quitarFilaResumen = (id) => setResumen((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))

  const totalUsadosSacos = sumar(filas, 'usadosSacos')
  const totalUsadosKg = sumar(filas, 'usadosKg')
  const totalEnvasadosSacos = sumar(filas, 'envasadosSacos')
  const totalEnvasadosKg = sumar(filas, 'envasadosKg')
  const totalQ2daKg = sumar(filas, 'q2daKg')

  // Indicadores del punto 8 del relevamiento — solo los dos calculables con
  // las columnas que ya modela este formulario. "Quinua tercera" queda
  // afuera a propósito: su fórmula pide un total de "Q. 3ra kg" que no
  // corresponde a ninguna columna actual (en el ejemplo del papel aparecía
  // suelto en Observaciones, como texto libre) — falta definir de dónde
  // sale ese dato antes de calcularlo acá.
  const rendimientoAreaB = totalUsadosKg > 0 ? (totalEnvasadosKg / totalUsadosKg) * 100 : null
  const quinuaSegunda = totalUsadosKg > 0 ? (totalQ2daKg / totalUsadosKg) * 100 : null

  // No hay endpoint todavía (ver comentario de arriba del componente) — el
  // click no debe fallar en silencio ni parecer que guardó, así que por
  // ahora solo confirma con un toast neutro. Reemplazar por la llamada real
  // al service de producción de Área B en cuanto exista.
  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario
        antetitulo="Registro"
        titulo="Control de Volumen de Producción — Área B"
        codigo="P-PRO-01/R-25"
        version="02"
      />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Datos generales">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!productos ? (
            <Skeleton className="h-16" />
          ) : (
            <ComboboxLote
              label="Lote MP"
              value={loteId}
              onChange={setLoteId}
              estados={ESTADOS_CANDIDATOS}
              productoNombre={productoNombre}
            />
          )}
          <FormSelect label="Presentación" value={presentacion} onChange={(e) => setPresentacion(e.target.value)}>
            {PRESENTACIONES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </FormSelect>
        </div>

        {loteId && datosLote && (
          <dl className="grid gap-4 rounded-2xl bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <CampoLote etiqueta="Producto" valor={productoNombre(datosLote.productId)} />
            <CampoLote etiqueta="Código de lote" valor={datosLote.code} />
            <CampoLote etiqueta="Estado" valor={datosLote.currentStatus?.replace(/_/g, ' ')} />
          </dl>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm text-marron-cafe">Normas certificadas</span>
          <div className="flex flex-wrap items-end gap-2">
            {NORMAS_DISPONIBLES.map((norma) => {
              const activa = normas.includes(norma)
              return (
                <button
                  key={norma}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => alternarNorma(norma)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    activa
                      ? 'bg-verde-lima text-marron-cafe shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
                      : 'border border-marron-tierra/20 text-marron-cafe/60 hover:bg-marron-tierra/5'
                  }`}
                >
                  {norma}
                </button>
              )
            })}
            <FormInput
              label=""
              placeholder="Otra norma…"
              value={otraNorma}
              onChange={(e) => setOtraNorma(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Registro de producción"
        nota="Una fila por turno cerrado. Un lote puede ocupar varias filas hasta completarse. «Sacos utilizados» no debería superar el saldo disponible de quinua lavada en Control de Existencias (P-PRO-01/R-23)."
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar fila
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {filas.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-xs font-bold text-crema-quinua">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar fila ${i + 1}`}
                  disabled={filas.length === 1}
                  onClick={() => quitarFila(f.id)}
                  className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormInput
                  label="Fecha"
                  type="date"
                  value={f.fecha}
                  onChange={(e) => actualizarFila(f.id, 'fecha')(e.target.value)}
                />
                {!turnos ? (
                  <Skeleton className="h-16" />
                ) : (
                  <FormSelect label="Turno" value={f.turnoId} onChange={(e) => actualizarFila(f.id, 'turnoId')(e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {turnos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </FormSelect>
                )}
                <FormInput
                  label="Lote MP"
                  value={f.loteMp}
                  onChange={(e) => actualizarFila(f.id, 'loteMp')(e.target.value)}
                  placeholder="C-05016-MP"
                />
                <FormSelect label="Tipo" value={f.tipo} onChange={(e) => actualizarFila(f.id, 'tipo')(e.target.value)}>
                  {TIPOS_PRODUCTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormInput
                  label="Usados (sacos)"
                  type="number"
                  min="0"
                  value={f.usadosSacos}
                  onChange={(e) => actualizarUsadosSacos(f.id)(e.target.value)}
                />
                <FormInput
                  label="Usados (kg)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={f.usadosKg}
                  onChange={(e) => actualizarFila(f.id, 'usadosKg')(numero(e.target.value))}
                  hint={`${KG_POR_SACO_LAVADO} kg/saco`}
                />
                <FormInput
                  label="Envasados (sacos)"
                  type="number"
                  min="0"
                  value={f.envasadosSacos}
                  onChange={(e) => actualizarEnvasadosSacos(f.id)(e.target.value)}
                />
                <FormInput
                  label="Envasados (kg)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={f.envasadosKg}
                  onChange={(e) => actualizarFila(f.id, 'envasadosKg')(numero(e.target.value))}
                  hint={`${pesoPresentacion} kg/unidad`}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/50">
                  Detalle del proceso (subproductos)
                </span>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {GRUPOS_DETALLE.map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-2 rounded-xl bg-verde-pistacho/20 p-3">
                      <span className="text-xs font-semibold text-marron-cafe">{label}</span>
                      <div className="grid grid-cols-2 gap-2">
                        <FormInput
                          label="Sacos"
                          type="number"
                          min="0"
                          value={f[`${key}Sacos`]}
                          onChange={(e) => actualizarFila(f.id, `${key}Sacos`)(numero(e.target.value))}
                        />
                        <FormInput
                          label="Kg"
                          type="number"
                          min="0"
                          step="0.001"
                          value={f[`${key}Kg`]}
                          onChange={(e) => actualizarFila(f.id, `${key}Kg`)(numero(e.target.value))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <FormInput
                  label="Encargado"
                  value={f.encargado}
                  onChange={(e) => actualizarFila(f.id, 'encargado')(e.target.value)}
                />
                <FormInput
                  label="Control"
                  value={f.control}
                  onChange={(e) => actualizarFila(f.id, 'control')(e.target.value)}
                />
                <FormInput
                  label="Observaciones"
                  value={f.observaciones}
                  onChange={(e) => actualizarFila(f.id, 'observaciones')(e.target.value)}
                />
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl bg-verde-pistacho/25 px-4 py-3 text-sm font-bold text-marron-cafe">
            <span>TOTAL</span>
            <span className="font-normal">
              Usados: <span className="tabular-nums">{totalUsadosSacos} sacos / {totalUsadosKg.toFixed(3)} kg</span>
            </span>
            <span className="font-normal">
              Envasados: <span className="tabular-nums">{totalEnvasadosSacos} sacos / {totalEnvasadosKg.toFixed(3)} kg</span>
            </span>
          </div>
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={3}
        titulo="Indicadores del lote"
        nota="Punto 8 del relevamiento — «Quinua tercera» queda pendiente: su fórmula pide un total de Q. 3ra kg que hoy no corresponde a ninguna columna del formulario."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <IndicadorTile
            etiqueta="Rendimiento Área B"
            valor={rendimientoAreaB}
            meta="> 90%"
            cumple={rendimientoAreaB != null && rendimientoAreaB > 90}
          />
          <IndicadorTile
            etiqueta="Quinua segunda"
            valor={quinuaSegunda}
            meta="< 3%"
            cumple={quinuaSegunda != null && quinuaSegunda < 3}
          />
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={4}
        titulo="Resumen por lote"
        nota="RP-15: aunque el papel llama «Merma» a esta suma, en Área B no hay merma real — son subproductos comercializables (mercado local / alimento balanceado), no desecho."
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFilaResumen}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar lote
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {resumen.map((r, i) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4 sm:flex-row sm:items-end sm:gap-4">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <FormInput label="Lote MP" value={r.loteMp} onChange={(e) => actualizarResumen(r.id, 'loteMp')(e.target.value)} />
                <FormInput
                  label="Envasados (kg)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={r.envasadosKg}
                  onChange={(e) => actualizarResumen(r.id, 'envasadosKg')(e.target.value)}
                />
                <FormInput
                  label="Subproductos a+b+c+d (kg)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={r.subproductosKg}
                  onChange={(e) => actualizarResumen(r.id, 'subproductosKg')(e.target.value)}
                />
              </div>
              <button
                type="button"
                aria-label={`Quitar lote ${i + 1}`}
                disabled={resumen.length === 1}
                onClick={() => quitarFilaResumen(r.id)}
                className="self-end rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30 sm:self-center"
              >
                <Trash2 className="size-4" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={5} titulo="Firmas">
        <FirmasResponsables responsables={RESPONSABLES} />
      </SeccionFormulario>

      <div className="flex justify-end">
        <Button onClick={guardar}>
          <Plus className="mr-1.5 size-4" strokeWidth={2} />
          Guardar
        </Button>
      </div>
    </div>
  )
}

function CampoLote({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</dt>
      <dd className="text-sm font-medium text-marron-cafe">{valor ?? '—'}</dd>
    </div>
  )
}

function IndicadorTile({ etiqueta, valor, meta, cumple }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/50">{etiqueta}</span>
      <span className={`text-2xl font-extrabold ${valor == null ? 'text-marron-cafe/30' : cumple ? 'text-verde-bosque' : 'text-rojo-pasankalla'}`}>
        {valor == null ? '—' : `${valor.toFixed(2)}%`}
      </span>
      <span className="text-xs text-marron-cafe/50">Meta: {meta}</span>
    </div>
  )
}
