import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { productsService } from '../../services/productsService'
import { listarTodo } from '../../services/paginacion'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'

let siguienteIdReq = 1
const filaRequerimientoVacia = () => ({ id: siguienteIdReq++, productoId: '', item: '', unidadMedida: '', cantidad: '' })

let siguienteIdEnt = 1
const filaEntregaVacia = () => ({ id: siguienteIdEnt++, productoId: '', item: '', loteAlmacen: '', unidadMedida: '', cantidad: '' })

const numero = (v) => (v === '' || v == null ? '' : Number(v))

// Sección 5.2 del relevamiento: "se maneja un formulario con dos pestañas —
// solicitante e ítems". Acá se resuelve como dos secciones numeradas de la
// misma pantalla en vez de pestañas reales, porque en la práctica son dos
// documentos correlativos (P-15 → P-04 de la narrativa): primero el
// requerimiento del área, después la nota de entrega que Almacén emite
// cuando lo despacha — no hace falta ocultar uno detrás del otro.
// Formularios P-ADM-03/R-27 (Requerimiento de Almacenes) y P-ADM-03/R-20
// (Nota de Entrega de Almacén). MOCKUP total, sin backend propio todavía.
export default function SeccionSalidaEnvases() {
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const [solicitante, setSolicitante] = useState('')
  const [area, setArea] = useState('')
  const [numeroRequerimiento, setNumeroRequerimiento] = useState('')
  const [fechaRequerimiento, setFechaRequerimiento] = useState('')
  const [ordenProduccion, setOrdenProduccion] = useState('')
  const [filasRequerimiento, setFilasRequerimiento] = useState(() => [filaRequerimientoVacia()])

  const [fechaEntrega, setFechaEntrega] = useState('')
  const [numeroNotaEntrega, setNumeroNotaEntrega] = useState('')
  const [filasEntrega, setFilasEntrega] = useState(() => [filaEntregaVacia()])
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    let cancelado = false
    listarTodo(productsService.listar)
      .then((data) => !cancelado && setProductos(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const actualizarFilaRequerimiento = (id, campo) => (valor) =>
    setFilasRequerimiento((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFilaRequerimiento = () => setFilasRequerimiento((prev) => [...prev, filaRequerimientoVacia()])
  const quitarFilaRequerimiento = (id) =>
    setFilasRequerimiento((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const actualizarFilaEntrega = (id, campo) => (valor) =>
    setFilasEntrega((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFilaEntrega = () => setFilasEntrega((prev) => [...prev, filaEntregaVacia()])
  const quitarFilaEntrega = (id) => setFilasEntrega((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const totalRequerimiento = filasRequerimiento.reduce((acc, f) => acc + (Number(f.cantidad) || 0), 0)

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Salida de Envases y Embalaje" codigo="P-ADM-03/R-27 · P-ADM-03/R-20" version="01" />

      <MockupBanner />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Requerimiento del área">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FormInput label="Solicitante" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} placeholder="Claudia Rojas" />
          <FormInput label="Área" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Área A-B" />
          <FormInput label="N°" value={numeroRequerimiento} onChange={(e) => setNumeroRequerimiento(e.target.value)} placeholder="204" />
          <FormInput label="Fecha" type="date" value={fechaRequerimiento} onChange={(e) => setFechaRequerimiento(e.target.value)} />
          <FormInput label="OE/OP" value={ordenProduccion} onChange={(e) => setOrdenProduccion(e.target.value)} placeholder="OE-166" />
        </div>

        <div className="flex flex-col gap-3">
          {filasRequerimiento.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                {!productos ? (
                  <Skeleton className="h-16" />
                ) : (
                  <FormSelect
                    label="Ítem"
                    value={f.productoId}
                    onChange={(e) => {
                      const id = e.target.value
                      actualizarFilaRequerimiento(f.id, 'productoId')(id)
                      actualizarFilaRequerimiento(f.id, 'item')(productos.find((p) => p.id === id)?.name ?? '')
                    }}
                  >
                    <option value="">Seleccionar…</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </FormSelect>
                )}
                <FormInput
                  label="Unidad de medida"
                  value={f.unidadMedida}
                  onChange={(e) => actualizarFilaRequerimiento(f.id, 'unidadMedida')(e.target.value)}
                  placeholder="Piezas"
                />
                <FormInput
                  label="Total"
                  type="number"
                  min="0"
                  value={f.cantidad}
                  onChange={(e) => actualizarFilaRequerimiento(f.id, 'cantidad')(numero(e.target.value))}
                />
              </div>
              <button
                type="button"
                aria-label={`Quitar ítem ${i + 1}`}
                disabled={filasRequerimiento.length === 1}
                onClick={() => quitarFilaRequerimiento(f.id)}
                className="self-end rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30 sm:self-center"
              >
                <Trash2 className="size-4" strokeWidth={2} />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFilaRequerimiento}>
              <Plus className="size-3.5" strokeWidth={2} />
              Agregar ítem
            </Button>
            <p className="text-sm font-bold text-marron-cafe">
              Total general: <span className="text-verde-bosque">{totalRequerimiento}</span>
            </p>
          </div>
        </div>

        <FirmasResponsables
          responsables={[
            { rol: 'Solicitante', puesto: '' },
            { rol: 'Supervisor de Producción', puesto: 'Aprobación' },
          ]}
          claseGrilla="sm:grid-cols-2"
        />
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Nota de entrega de Almacén"
        nota="Se emite cuando Almacén despacha el requerimiento aprobado — descuenta el lote de origen."
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFilaEntrega}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar ítem
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput label="Fecha" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
          <FormInput label="N° de nota" value={numeroNotaEntrega} onChange={(e) => setNumeroNotaEntrega(e.target.value)} placeholder="485" />
          <FormInput label="OP/OE" value={ordenProduccion} disabled hint="Mismo dato del requerimiento" />
        </div>

        <div className="flex flex-col gap-4">
          {filasEntrega.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-xs font-bold text-crema-quinua">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar ítem ${i + 1}`}
                  disabled={filasEntrega.length === 1}
                  onClick={() => quitarFilaEntrega(f.id)}
                  className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {!productos ? (
                  <Skeleton className="h-16" />
                ) : (
                  <FormSelect
                    label="Ítem"
                    value={f.productoId}
                    onChange={(e) => {
                      const id = e.target.value
                      actualizarFilaEntrega(f.id, 'productoId')(id)
                      actualizarFilaEntrega(f.id, 'item')(productos.find((p) => p.id === id)?.name ?? '')
                    }}
                  >
                    <option value="">Seleccionar…</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </FormSelect>
                )}
                <FormInput
                  label="Lote de almacén"
                  value={f.loteAlmacen}
                  onChange={(e) => actualizarFilaEntrega(f.id, 'loteAlmacen')(e.target.value)}
                  placeholder="270726-EEBB-07"
                />
                <FormInput
                  label="Unidad de medida"
                  value={f.unidadMedida}
                  onChange={(e) => actualizarFilaEntrega(f.id, 'unidadMedida')(e.target.value)}
                  placeholder="Piezas"
                />
                <FormInput
                  label="Cantidad"
                  type="number"
                  min="0"
                  value={f.cantidad}
                  onChange={(e) => actualizarFilaEntrega(f.id, 'cantidad')(numero(e.target.value))}
                />
              </div>
            </div>
          ))}
        </div>

        <FormTextarea label="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />

        <FirmasResponsables
          responsables={[
            { rol: 'Entregado por', puesto: 'Asistente de Almacén' },
            { rol: 'Recibido por', puesto: area || 'Área solicitante' },
          ]}
          claseGrilla="sm:grid-cols-2"
        />
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
