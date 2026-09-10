import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { productsService } from '../../services/productsService'
import { listarTodo } from '../../services/paginacion'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'

const EMPAQUES = ['Bolsa', 'Botella', 'Caja', 'Big bag']

let siguienteId = 1
const filaVacia = () => ({ id: siguienteId++, productoId: '', producto: '', lote: '', empaque: EMPAQUES[0], cantidadTotal: '' })

const numero = (v) => (v === '' || v == null ? '' : Number(v))

// Formulario P-BPA-01/R-12 — Nota de Salida (de Producto Terminado a
// cliente). Mismo alcance que el ingreso: solo PTL, FIFO (RP-20 / sección
// 5.3 del relevamiento). MOCKUP total, sin backend propio todavía.
export default function SeccionSalidaProductoTerminado() {
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const [destino, setDestino] = useState('')
  const [fecha, setFecha] = useState('')
  const [numeroNota, setNumeroNota] = useState('')
  const [filas, setFilas] = useState(() => [filaVacia()])
  const [observaciones, setObservaciones] = useState('')

  const [entregadoNombre, setEntregadoNombre] = useState('')
  const [entregadoCi, setEntregadoCi] = useState('')
  const [recibidoNombre, setRecibidoNombre] = useState('')
  const [recibidoCi, setRecibidoCi] = useState('')

  useEffect(() => {
    let cancelado = false
    listarTodo(productsService.listar)
      .then((data) => !cancelado && setProductos(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Nota de Salida de Producto Terminado" codigo="P-BPA-01/R-12" version="01" />

      <MockupBanner />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Datos generales">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormInput label="Entrega" value="Almacén Comrural — PTL" disabled />
          <FormInput label="Destino / Cliente" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="COALSUD" />
          <FormInput label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <FormInput label="N° de nota" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} placeholder="136" />
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Detalle de productos"
        nota="Se prioriza el lote de vencimiento más próximo disponible (FIFO/FEFO)."
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar producto
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
                  aria-label={`Quitar producto ${i + 1}`}
                  disabled={filas.length === 1}
                  onClick={() => quitarFila(f.id)}
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
                    label="Producto"
                    value={f.productoId}
                    onChange={(e) => {
                      const id = e.target.value
                      actualizarFila(f.id, 'productoId')(id)
                      actualizarFila(f.id, 'producto')(productos.find((p) => p.id === id)?.name ?? '')
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
                <FormInput label="Lote" value={f.lote} onChange={(e) => actualizarFila(f.id, 'lote')(e.target.value)} placeholder="3135173" />
                <FormSelect label="Empaque" value={f.empaque} onChange={(e) => actualizarFila(f.id, 'empaque')(e.target.value)}>
                  {EMPAQUES.map((e2) => (
                    <option key={e2} value={e2}>
                      {e2}
                    </option>
                  ))}
                </FormSelect>
                <FormInput
                  label="Cantidad total"
                  type="number"
                  min="0"
                  value={f.cantidadTotal}
                  onChange={(e) => actualizarFila(f.id, 'cantidadTotal')(numero(e.target.value))}
                />
              </div>
            </div>
          ))}
        </div>

        <FormTextarea label="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </SeccionFormulario>

      <SeccionFormulario numero={3} titulo="Conformidad" nota="Nombre y cédula de identidad de ambas partes.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-3 rounded-2xl bg-white/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-verde-bosque">Entregado por</p>
            <FormInput label="Nombre" value={entregadoNombre} onChange={(e) => setEntregadoNombre(e.target.value)} />
            <FormInput label="C.I." value={entregadoCi} onChange={(e) => setEntregadoCi(e.target.value)} />
          </div>
          <div className="grid gap-3 rounded-2xl bg-white/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-verde-bosque">Recibido por</p>
            <FormInput label="Nombre" value={recibidoNombre} onChange={(e) => setRecibidoNombre(e.target.value)} />
            <FormInput label="C.I." value={recibidoCi} onChange={(e) => setRecibidoCi(e.target.value)} />
          </div>
        </div>
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
