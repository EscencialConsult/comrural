import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { shiftsService } from '../../../services/shiftsService'
import { productsService } from '../../../services/productsService'
import { lotsService } from '../../../services/lotsService'
import { packagingService } from '../../../services/packagingService'
import { productionAreaBService } from '../../../services/productionAreaBService'
import { listarTodo } from '../../../services/paginacion'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Modal from '../../Modal.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import ComboboxLote from '../../formularios/ComboboxLote.jsx'
import Button from '../../Button.jsx'
import Skeleton from '../../Skeleton.jsx'

// Mismo filtro que ModalEnvasados.jsx (listado) — cualquier lote que ya
// pueda tener consumo de Área B, de donde sale el material real que este
// envasado vincula (ver guardar()).
const ESTADOS_CANDIDATOS = ['LAVADO', 'LAVADO_COMPLETO', 'EN_AREA_B']

// RP-19 — mismo catálogo que ModalRegistrarSalidaAreaB.jsx y ControlProductoAlmacen.jsx.
const PRESENTACIONES = [
  { value: 'bigbag-1000', label: 'Big Bag 1.000 kg', kg: 1000 },
  { value: 'bigbag-1200', label: 'Big Bag 1.200 kg', kg: 1200 },
  { value: 'kraft-25', label: 'Papel kraft 25 kg', kg: 25 },
  { value: 'kraft-11.34', label: 'Papel kraft 11,34 kg', kg: 11.34 },
]

// Solo dos firmas acá (relevamiento 3, a diferencia de Volumen B que tiene
// tres): el envasador registra y el supervisor da el V.B. — Jefe de
// Producción no interviene turno a turno en el envasado.
const RESPONSABLES = [
  { rol: 'Envasador', puesto: 'Registra el envasado del turno' },
  { rol: 'Supervisor de producción', puesto: 'Da el V.B. y transcribe al sistema' },
]

const RECHAZOS_VACIO = {
  paja: '',
  puntosCuarzo: '',
  piedrasVolcanicas: '',
  hecesAveRaton: '',
  larvas: '',
  lanaVidrio: '',
  semillaSilvestre: '',
  otros: '',
}
const CAMPOS_RECHAZO = [
  { key: 'paja', label: 'Paja' },
  { key: 'puntosCuarzo', label: 'Puntos de cuarzo' },
  { key: 'piedrasVolcanicas', label: 'Piedras volcánicas' },
  { key: 'hecesAveRaton', label: 'Heces de ave/ratón' },
  { key: 'larvas', label: 'Larvas' },
  { key: 'lanaVidrio', label: 'Lana/vidrio' },
  { key: 'semillaSilvestre', label: 'Semilla silvestre' },
  { key: 'otros', label: 'Otros' },
]

const REPROCESO_VACIO = { sacos: '', bigBag: '', kraft: '', otros: '', etapaProceso: '' }
const CAMPOS_REPROCESO_NUM = [
  { key: 'sacos', label: 'Sacos' },
  { key: 'bigBag', label: 'Big Bag' },
  { key: 'kraft', label: 'Kraft' },
  { key: 'otros', label: 'Otros' },
]

let siguienteId = 1
const filaEnvaseVacia = () => ({
  id: siguienteId++,
  fecha: '',
  ingresos: '',
  envasadas: '',
  malConfeccion: '',
  fallaCosturadora: '',
  otros: '',
  saldo: '',
})
const filaEtiquetaVacia = () => ({
  id: siguienteId++,
  fecha: '',
  ingresos: '',
  etiquetadas: '',
  rotula: '',
  arrugado: '',
  otros: '',
  saldo: '',
})
const filaUnidadVacia = () => ({
  id: siguienteId++,
  turnoId: '',
  envasador: '',
  hora: '',
  etiquetaCorrecta: '',
  empaqueCorrecto: '',
  pesoUnidadKg: '',
  cantidadEnvasados: '',
})

const numero = (v) => (v === '' || v == null ? '' : Number(v))
const num = (v) => Number(v) || 0
const sumarCampos = (obj, campos) => campos.reduce((acc, { key }) => acc + num(obj[key]), 0)

// Modal "Registrar envasado" — formulario 5 del relevamiento (I-PRO-16/
// R-01), abierto desde el listado (ver ModalEnvasados.jsx, la subpestaña
// "Envasado" de Área B). "Guardar" hace el flujo completo real (ver
// comrural_erp_backend/docs/packaging.md): POST /packaging/entries, después
// reparte packagedKg entre las entradas NUEVA de Área B del lote elegido
// (POST .../sources, una por una, en orden — greedy, hasta cubrir el total
// o agotar entradas) y si quedó cubierto exacto, POST .../close. Si el
// lote no tiene suficiente material de Área B todavía, el envasado queda
// creado pero abierto — avisa cuánto falta vincular. Completarlo después
// (más material disponible) se hace desde el listado, con
// ModalCompletarEnvasado.jsx — este modal solo crea, no retoma uno abierto.
//
// Es un registro AGREGADO: packaging_entries solo persiste presentación/
// sacos/kg/etiquetas/rechazos TOTALES, no el desglose diario de "Control de
// envases"/"Control de etiqueta" (§2/§3) ni el detalle de rechazo por tipo
// de impureza o de reproceso por presentación (§5/§6) — esas secciones no
// tienen columna en el backend, quedan solo en pantalla para el
// seguimiento interno de Producción.
export default function ModalRegistrarEnvasado({ abierto, onCerrar, onCreado }) {
  const [turnos, setTurnos] = useState(null)
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [loteId, setLoteId] = useState('')
  const [datosLote, setDatosLote] = useState(null)
  const [loteEnvase, setLoteEnvase] = useState('')
  const [tipoEnvase, setTipoEnvase] = useState(PRESENTACIONES[0].value)
  const [filasEnvases, setFilasEnvases] = useState(() => [filaEnvaseVacia()])
  const [filasEtiquetas, setFilasEtiquetas] = useState(() => [filaEtiquetaVacia()])
  const [filasUnidades, setFilasUnidades] = useState(() => [filaUnidadVacia()])
  const [rechazos, setRechazos] = useState(RECHAZOS_VACIO)
  const [reproceso, setReproceso] = useState(REPROCESO_VACIO)
  const { enviando, ejecutar } = useSolicitud()

  useEffect(() => {
    if (!abierto) return
    setLoteId('')
    setLoteEnvase('')
    setTipoEnvase(PRESENTACIONES[0].value)
    setFilasEnvases([filaEnvaseVacia()])
    setFilasEtiquetas([filaEtiquetaVacia()])
    setFilasUnidades([filaUnidadVacia()])
    setRechazos(RECHAZOS_VACIO)
    setReproceso(REPROCESO_VACIO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
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
  }, [abierto])

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

  const actualizarEnvase = (id, campo) => (valor) =>
    setFilasEnvases((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarEnvase = () => setFilasEnvases((prev) => [...prev, filaEnvaseVacia()])
  const quitarEnvase = (id) => setFilasEnvases((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const actualizarEtiqueta = (id, campo) => (valor) =>
    setFilasEtiquetas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarEtiqueta = () => setFilasEtiquetas((prev) => [...prev, filaEtiquetaVacia()])
  const quitarEtiqueta = (id) => setFilasEtiquetas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const actualizarUnidad = (id, campo) => (valor) =>
    setFilasUnidades((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarUnidad = () => setFilasUnidades((prev) => [...prev, filaUnidadVacia()])
  const quitarUnidad = (id) => setFilasUnidades((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const totalRechazos = sumarCampos(rechazos, CAMPOS_RECHAZO)
  const totalReproceso = sumarCampos(reproceso, CAMPOS_REPROCESO_NUM)
  const unidadesProducidas = filasUnidades.reduce((acc, f) => acc + num(f.cantidadEnvasados), 0)
  const totalProducidoKg = filasUnidades.reduce((acc, f) => acc + num(f.cantidadEnvasados) * num(f.pesoUnidadKg), 0)
  const totalEtiquetaCorrecta = filasUnidades.reduce((acc, f) => acc + num(f.etiquetaCorrecta), 0)

  const presentacion = PRESENTACIONES.find((p) => p.value === tipoEnvase)
  const puedeGuardar = unidadesProducidas > 0

  const cerrarModal = () => onCerrar()

  const guardar = async () => {
    if (!puedeGuardar) return
    try {
      await ejecutar(async () => {
        const envasado = await packagingService.crear({
          presentationCode: presentacion.value,
          presentationLabel: presentacion.label,
          unitNetKg: presentacion.kg,
          packagingLotCodeSnapshot: loteEnvase.trim() || undefined,
          packageCount: unidadesProducidas,
          labelCount: totalEtiquetaCorrecta,
          rejectedDuringPackaging: totalRechazos,
        })

        if (!loteId) {
          toast.success('Envasado registrado — sin lote elegido, vinculá el material de Área B a mano.')
          return
        }

        const entradasAreaB = await productionAreaBService.listarPorLote(loteId)
        const nuevas = entradasAreaB.filter((e) => e.inputType === 'NUEVA')
        let restante = envasado.packagedKg
        for (const entrada of nuevas) {
          if (restante <= 0.001) break
          const aporte = Math.min(restante, entrada.finalKg)
          if (aporte <= 0) continue
          await packagingService.agregarFuente(envasado.id, { areaBEntryId: entrada.id, cantidadKg: Number(aporte.toFixed(3)) })
          restante -= aporte
        }

        if (restante <= 0.001) {
          await packagingService.cerrar(envasado.id)
          toast.success('Envasado registrado, vinculado a Área B y cerrado.')
        } else {
          toast.info(`Envasado registrado — faltan ${restante.toFixed(3)} kg por vincular a Área B para poder cerrarlo.`)
        }
      })
      onCreado()
      cerrarModal()
    } catch (err) {
      toast.error(err.message ?? 'No se pudo guardar el registro.')
    }
  }

  return (
    <Modal abierto={abierto} titulo="Registrar envasado" onCerrar={cerrarModal} maxWidth="max-w-4xl">
      <div className="flex flex-col gap-6">
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
            <FormInput
              label="Lote de envase"
              value={loteEnvase}
              onChange={(e) => setLoteEnvase(e.target.value)}
              placeholder="Asignado por Compras"
              hint="Independiente del lote MP — RP-18, no tiene relación con el producto ni el cliente."
            />
            <FormSelect label="Tipo de envase" value={tipoEnvase} onChange={(e) => setTipoEnvase(e.target.value)}>
              {PRESENTACIONES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </FormSelect>
          </div>

          {loteId && datosLote && (
            <dl className="grid gap-4 rounded-2xl bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Producto</dt>
                <dd className="text-sm font-medium text-marron-cafe">{productoNombre(datosLote.productId)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Código de lote</dt>
                <dd className="text-sm font-medium text-marron-cafe">{datosLote.code}</dd>
              </div>
            </dl>
          )}
        </SeccionFormulario>

        <SeccionFormulario
          numero={2}
          titulo="Control de envases"
          acciones={
            <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarEnvase}>
              <Plus className="size-3.5" strokeWidth={2} />
              Agregar fecha
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            {filasEnvases.map((f, i) => (
              <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <FormInput label="Fecha" type="date" value={f.fecha} onChange={(e) => actualizarEnvase(f.id, 'fecha')(e.target.value)} className="w-40" />
                  <button
                    type="button"
                    aria-label={`Quitar fila ${i + 1}`}
                    disabled={filasEnvases.length === 1}
                    onClick={() => quitarEnvase(f.id)}
                    className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 className="size-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <FormInput label="Ingresos" type="number" min="0" value={f.ingresos} onChange={(e) => actualizarEnvase(f.id, 'ingresos')(numero(e.target.value))} />
                  <FormInput label="Envasadas" type="number" min="0" value={f.envasadas} onChange={(e) => actualizarEnvase(f.id, 'envasadas')(numero(e.target.value))} />
                  <FormInput label="Mal confección" type="number" min="0" value={f.malConfeccion} onChange={(e) => actualizarEnvase(f.id, 'malConfeccion')(numero(e.target.value))} />
                  <FormInput label="Falla costuradora" type="number" min="0" value={f.fallaCosturadora} onChange={(e) => actualizarEnvase(f.id, 'fallaCosturadora')(numero(e.target.value))} />
                  <FormInput label="Otros" type="number" min="0" value={f.otros} onChange={(e) => actualizarEnvase(f.id, 'otros')(numero(e.target.value))} />
                  <FormInput label="Saldo" type="number" min="0" value={f.saldo} onChange={(e) => actualizarEnvase(f.id, 'saldo')(numero(e.target.value))} />
                </div>
              </div>
            ))}
          </div>
        </SeccionFormulario>

        <SeccionFormulario
          numero={3}
          titulo="Control de etiqueta"
          acciones={
            <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarEtiqueta}>
              <Plus className="size-3.5" strokeWidth={2} />
              Agregar fecha
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            {filasEtiquetas.map((f, i) => (
              <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <FormInput label="Fecha" type="date" value={f.fecha} onChange={(e) => actualizarEtiqueta(f.id, 'fecha')(e.target.value)} className="w-40" />
                  <button
                    type="button"
                    aria-label={`Quitar fila ${i + 1}`}
                    disabled={filasEtiquetas.length === 1}
                    onClick={() => quitarEtiqueta(f.id)}
                    className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 className="size-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <FormInput label="Ingresos" type="number" min="0" value={f.ingresos} onChange={(e) => actualizarEtiqueta(f.id, 'ingresos')(numero(e.target.value))} />
                  <FormInput label="Etiquetadas" type="number" min="0" value={f.etiquetadas} onChange={(e) => actualizarEtiqueta(f.id, 'etiquetadas')(numero(e.target.value))} />
                  <FormInput label="Rótula" type="number" min="0" value={f.rotula} onChange={(e) => actualizarEtiqueta(f.id, 'rotula')(numero(e.target.value))} />
                  <FormInput label="Arrugado" type="number" min="0" value={f.arrugado} onChange={(e) => actualizarEtiqueta(f.id, 'arrugado')(numero(e.target.value))} />
                  <FormInput label="Otros" type="number" min="0" value={f.otros} onChange={(e) => actualizarEtiqueta(f.id, 'otros')(numero(e.target.value))} />
                  <FormInput label="Saldo" type="number" min="0" value={f.saldo} onChange={(e) => actualizarEtiqueta(f.id, 'saldo')(numero(e.target.value))} />
                </div>
              </div>
            ))}
          </div>
        </SeccionFormulario>

        <SeccionFormulario
          numero={4}
          titulo="Unidades etiquetadas y envasadas"
          nota="Una fila por envasador y turno — el sector de envasado trabaja con un envasador por turno."
          acciones={
            <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarUnidad}>
              <Plus className="size-3.5" strokeWidth={2} />
              Agregar fila
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            {filasUnidades.map((f, i) => (
              <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-xs font-bold text-crema-quinua">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`Quitar fila ${i + 1}`}
                    disabled={filasUnidades.length === 1}
                    onClick={() => quitarUnidad(f.id)}
                    className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 className="size-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {!turnos ? (
                    <Skeleton className="h-16" />
                  ) : (
                    <FormSelect label="Turno" value={f.turnoId} onChange={(e) => actualizarUnidad(f.id, 'turnoId')(e.target.value)}>
                      <option value="">Seleccionar…</option>
                      {turnos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                  <FormInput label="Envasador" value={f.envasador} onChange={(e) => actualizarUnidad(f.id, 'envasador')(e.target.value)} />
                  <FormInput label="Hora" type="time" value={f.hora} onChange={(e) => actualizarUnidad(f.id, 'hora')(e.target.value)} />
                  <FormInput
                    label="Peso unidad (kg)"
                    type="number"
                    min="0"
                    step="0.001"
                    value={f.pesoUnidadKg}
                    onChange={(e) => actualizarUnidad(f.id, 'pesoUnidadKg')(numero(e.target.value))}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormInput
                    label="Etiqueta correcta (unidades)"
                    type="number"
                    min="0"
                    value={f.etiquetaCorrecta}
                    onChange={(e) => actualizarUnidad(f.id, 'etiquetaCorrecta')(numero(e.target.value))}
                  />
                  <FormInput
                    label="Empaque correcto (unidades)"
                    type="number"
                    min="0"
                    value={f.empaqueCorrecto}
                    onChange={(e) => actualizarUnidad(f.id, 'empaqueCorrecto')(numero(e.target.value))}
                  />
                  <FormInput
                    label="Cantidad envasados"
                    type="number"
                    min="0"
                    value={f.cantidadEnvasados}
                    onChange={(e) => actualizarUnidad(f.id, 'cantidadEnvasados')(numero(e.target.value))}
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl bg-verde-pistacho/25 px-4 py-3 text-sm font-bold text-marron-cafe">
              <span>PRODUCTO TERMINADO</span>
              <span className="font-normal">
                Unidades producidas: <span className="tabular-nums">{unidadesProducidas}</span>
              </span>
              <span className="font-normal">
                Total: <span className="tabular-nums">{totalProducidoKg.toFixed(3)} kg</span>
              </span>
            </div>
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={5} titulo="Rechazos por impurezas" nota={`Total: ${totalRechazos} unidades`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAMPOS_RECHAZO.map(({ key, label }) => (
              <FormInput
                key={key}
                label={label}
                type="number"
                min="0"
                value={rechazos[key]}
                onChange={(e) => setRechazos((prev) => ({ ...prev, [key]: numero(e.target.value) }))}
              />
            ))}
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={6} titulo="Reproceso" nota={`Total: ${totalReproceso} unidades`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CAMPOS_REPROCESO_NUM.map(({ key, label }) => (
              <FormInput
                key={key}
                label={label}
                type="number"
                min="0"
                value={reproceso[key]}
                onChange={(e) => setReproceso((prev) => ({ ...prev, [key]: numero(e.target.value) }))}
              />
            ))}
            <FormInput
              label="Etapa de proceso"
              value={reproceso.etapaProceso}
              onChange={(e) => setReproceso((prev) => ({ ...prev, etapaProceso: e.target.value }))}
            />
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={7} titulo="Firmas">
          <FirmasResponsables responsables={RESPONSABLES} claseGrilla="sm:grid-cols-2" />
        </SeccionFormulario>

        <div className="flex items-center justify-end gap-3 border-t border-marron-tierra/10 pt-4">
          <Button onClick={guardar} disabled={enviando || !puedeGuardar} className="px-5 py-2.5">
            <Plus className="mr-1.5 size-4" strokeWidth={2} />
            {enviando ? 'Guardando…' : 'Registrar envasado'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
