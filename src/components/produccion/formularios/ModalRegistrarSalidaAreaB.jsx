import { useEffect, useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { productsService } from '../../../services/productsService'
import { lotsService } from '../../../services/lotsService'
import { productionAreaBService } from '../../../services/productionAreaBService'
import { listarTodo } from '../../../services/paginacion'
import { GRUPOS_DETALLE, filaVacia, sumar, numero } from './volumenBFilas.js'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Modal from '../../Modal.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import Button from '../../Button.jsx'
import Skeleton from '../../Skeleton.jsx'

// f.tipo ('N'/'R'/'E', nombres del papel P-PRO-01/R-25) -> inputType real de
// production_area_b_entries (ver docs/production-area-b.md §3). No incluye
// REPROCESO — no está en el papel de este formulario.
const TIPO_A_INPUT_TYPE = { N: 'NUEVA', R: 'RECUPERADA', E: 'SALDO_FINAL' }

// Tres firmas (relevamiento): el encargado llena en papel, el supervisor
// verifica físicamente y transcribe al sistema, y Jefe de Producción revisa
// recién al cierre del lote (no turno a turno).
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
// fijo por saco: ahí cada campo se carga a mano.
const KG_POR_SACO_LAVADO = 45

let siguienteIdResumen = 1
const filaResumenVacia = () => ({ id: siguienteIdResumen++, loteMp: '', envasadosKg: '', subproductosKg: '' })

// Registra una salida real de production_area_b_entries (POST
// /production-area-b/entries, ver comrural_erp_backend/docs/
// production-area-b.md §5) — este modal ES el formulario completo P-PRO-01/
// R-25 ("Volumen B"), no una versión resumida. Antes existían DOS caminos
// que creaban entradas por separado (este modal simplificado + la pestaña
// "Volumen B" con el formulario completo), lo que duplicaba la salida
// registrada para la misma corrida real. Ahora "Añadir salida" (Control de
// Existencias) es el único punto de entrada — la pestaña "Volumen B" y su
// listado "lotes con salidas / continuar" se eliminaron (ver
// SeccionAreaB.jsx).
//
// Sin mapeo backend para: `encargado`/`control`/`observaciones` (recordedBy/
// verifiedBy salen del actor autenticado, no de texto libre) ni para los
// "Sacos" de cada subproducto en "Detalle del proceso" (production_area_b_
// entries solo persiste el kg de cada uno) — esos campos quedan en la
// pantalla para que Producción los siga completando en papel/pantalla, pero
// no viajan al backend todavía. Tampoco hay mapeo para "Resumen por lote"
// (§3) ni "Normas certificadas" — quedan solo para seguimiento interno.
export default function ModalRegistrarSalidaAreaB({
  abierto,
  onCerrar,
  lote,
  turnos,
  saldoDisponibleKg,
  onCreada,
}) {
  const [productos, setProductos] = useState(null)
  const [datosLote, setDatosLote] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [presentacion, setPresentacion] = useState(PRESENTACIONES[0].value)
  const [normas, setNormas] = useState([])
  const [otraNorma, setOtraNorma] = useState('')
  const [filas, setFilas] = useState(() => [filaVacia(lote?.code ?? '')])
  const [resumen, setResumen] = useState(() => [filaResumenVacia()])
  const { enviando, ejecutar } = useSolicitud()

  useEffect(() => {
    if (!abierto) return
    setFilas([filaVacia(lote?.code ?? '')])
    setResumen([filaResumenVacia()])
    setPresentacion(PRESENTACIONES[0].value)
    setNormas([])
    setOtraNorma('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    let cancelado = false
    listarTodo(productsService.listar)
      .then((data) => !cancelado && setProductos(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [abierto])

  // Autocompleta código y producto del lote elegido. Solo lectura: si falla,
  // la cabecera sigue funcionando, simplemente sin el resumen del lote.
  useEffect(() => {
    if (!abierto || !lote?.id) {
      setDatosLote(null)
      return
    }
    let cancelado = false
    lotsService
      .obtener(lote.id)
      .then((data) => !cancelado && setDatosLote(data))
      .catch(() => !cancelado && setDatosLote(null))
    return () => {
      cancelado = true
    }
  }, [abierto, lote])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const pesoPresentacion = PRESENTACIONES.find((p) => p.value === presentacion)?.kg ?? 0

  const alternarNorma = (norma) =>
    setNormas((prev) => (prev.includes(norma) ? prev.filter((n) => n !== norma) : [...prev, norma]))

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  // Autocompletan el kg del par a partir del peso fijo (RP-12 para sacos
  // lavados, RP-19 para la presentación elegida en la cabecera) — el valor
  // calculado sigue siendo editable a mano después.
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

  const agregarFila = () => setFilas((prev) => [...prev, filaVacia(datosLote?.code ?? lote?.code ?? '')])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const actualizarResumen = (id, campo) => (valor) =>
    setResumen((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)))
  const agregarFilaResumen = () => setResumen((prev) => [...prev, filaResumenVacia()])
  const quitarFilaResumen = (id) => setResumen((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))

  const totalUsadosSacos = sumar(filas, 'usadosSacos')
  const totalUsadosKg = sumar(filas, 'usadosKg')
  const totalEnvasadosSacos = sumar(filas, 'envasadosSacos')
  const totalEnvasadosKg = sumar(filas, 'envasadosKg')

  // Cada fila con turno + tipo cargados es una entrada válida — el resto de
  // los campos numéricos por defecto van en 0 (CHECK >= 0 del backend, ver
  // docs/production-area-b.md §2), no bloquean el guardado si Producción
  // todavía no los completó.
  const filaValida = (f) => f.turnoId !== '' && f.tipo !== ''
  const puedeGuardar = lote?.id && filas.some(filaValida)

  const cerrar = () => {
    onCerrar()
  }

  const guardar = async () => {
    if (!puedeGuardar) return
    const filasValidas = filas.filter(filaValida)
    let creadas = null
    let ultimaCreada = null
    try {
      await ejecutar(async () => {
        creadas = 0
        for (const f of filasValidas) {
          ultimaCreada = await productionAreaBService.crear({
            lotId: lote.id,
            shiftId: f.turnoId,
            entryDate: f.fecha || new Date().toLocaleDateString('en-CA'),
            inputType: TIPO_A_INPUT_TYPE[f.tipo],
            usedBags: Number(f.usadosSacos) || 0,
            usedKg: Number(f.usadosKg) || 0,
            finalBags: Number(f.envasadosSacos) || 0,
            finalKg: Number(f.envasadosKg) || 0,
            secondKg: Number(f.q2daKg) || 0,
            thirdKg: Number(f.terceraKg) || 0,
            blackPointsKg: Number(f.pNegrosKg) || 0,
            rejectionKg: Number(f.rechazoKg) || 0,
            powderKg: Number(f.polvilloKg) || 0,
            recoverableKg: Number(f.recuperableKg) || 0,
            saldoQfTransferidoKg: Number(f.saldoQfKg) || 0,
          })
          creadas += 1
        }
      })
      toast.success(`${creadas} ${creadas === 1 ? 'entrada registrada' : 'entradas registradas'} en Área B.`)
      onCreada(ultimaCreada)
      cerrar()
    } catch (err) {
      toast.error(
        creadas > 0
          ? `Se guardaron ${creadas} de ${filasValidas.length} filas — ${err.message}`
          : (err.message ?? 'No se pudo guardar el registro.'),
      )
    }
  }

  return (
    <Modal abierto={abierto} titulo="Registrar salida — Área B" onCerrar={cerrar} maxWidth="max-w-4xl">
      <div className="flex flex-col gap-6">
        {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

        <SeccionFormulario numero={1} titulo="Datos generales">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput label="Lote MP" value={lote?.code ?? ''} disabled />
            <FormSelect label="Presentación" value={presentacion} onChange={(e) => setPresentacion(e.target.value)}>
              {PRESENTACIONES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </FormSelect>
            <FormInput
              label="Quinua lavada disponible"
              value={saldoDisponibleKg != null ? `${saldoDisponibleKg} kg` : 'Cargando…'}
              disabled
            />
          </div>

          {lote?.id && datosLote && (
            <dl className="grid gap-4 rounded-2xl bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <CampoLote etiqueta="Producto" valor={productoNombre(datosLote.productId)} />
              <CampoLote etiqueta="Código de lote" valor={datosLote.code} />
              <CampoLote etiqueta="Estado" valor={datosLote.currentStatus?.replace(/_/g, ' ')} />
            </dl>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm text-marron-cafe">Normas certificadas</span>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {NORMAS_DISPONIBLES.map((norma) => {
                const activa = normas.includes(norma)
                return (
                  <label
                    key={norma}
                    className={`relative flex cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      activa
                        ? 'bg-verde-hoja/15 text-verde-bosque ring-1 ring-verde-bosque/25'
                        : 'bg-white/70 text-marron-cafe/70 hover:bg-marron-tierra/5 hover:text-marron-cafe'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={activa}
                      onChange={() => alternarNorma(norma)}
                      className="sr-only"
                    />
                    {norma}
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
                        activa ? 'border-verde-bosque bg-verde-bosque text-crema-quinua' : 'border-marron-tierra/30 bg-white'
                      }`}
                    >
                      {activa && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </label>
                )
              })}
              <FormInput
                label=""
                placeholder="Otra norma…"
                value={otraNorma}
                onChange={(e) => setOtraNorma(e.target.value)}
              />
            </div>
          </div>
        </SeccionFormulario>

        <SeccionFormulario
          numero={2}
          titulo="Registro de producción"
          nota="Una fila por turno cerrado. Un lote puede ocupar varias filas hasta completarse. «Sacos utilizados» no debería superar el saldo disponible de quinua lavada."
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

        <SeccionFormulario numero={4} titulo="Firmas">
          <FirmasResponsables responsables={RESPONSABLES} />
        </SeccionFormulario>

        <div className="flex items-center justify-end gap-3 border-t border-marron-tierra/10 pt-4">
          <Button onClick={guardar} disabled={enviando || !puedeGuardar} className="px-5 py-2.5">
            <Plus className="mr-1.5 size-4" strokeWidth={2} />
            {enviando ? 'Guardando…' : 'Registrar salida'}
          </Button>
        </div>
      </div>
    </Modal>
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
