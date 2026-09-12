import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { productsService } from '../../../services/productsService'
import { listarTodo } from '../../../services/paginacion'
import { toast } from '../../../lib/toast'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import Button from '../../Button.jsx'
import Skeleton from '../../Skeleton.jsx'

// RP-19 — mismas presentaciones que Volumen B (ModalRegistrarSalidaAreaB.jsx). Se
// repite acá en vez de compartirse desde un módulo común: mismo criterio
// que el resto de los formularios mock de este relevamiento, cada uno es
// autocontenido hasta que haya un backend real que las sirva como catálogo.
const PRESENTACIONES = [
  { value: 'bigbag-1000', label: 'Big Bag 1.000 kg', kg: 1000 },
  { value: 'bigbag-1200', label: 'Big Bag 1.200 kg', kg: 1200 },
  { value: 'kraft-25', label: 'Papel kraft 25 kg', kg: 25 },
  { value: 'kraft-11.34', label: 'Papel kraft 11,34 kg', kg: 11.34 },
]

const TIPOS_MOVIMIENTO = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'salida', label: 'Salida' },
]

let siguienteId = 1
const filaVacia = () => ({ id: siguienteId++, fecha: '', tipo: 'ingreso', cantidad: '', destino: '' })

const numero = (v) => (v === '' || v == null ? '' : Number(v))
const num = (v) => Number(v) || 0
const pesoDe = (presentacion) => PRESENTACIONES.find((p) => p.value === presentacion)?.kg ?? 0

// Formulario 7 del relevamiento — Control de Producto en Almacén
// (P-PRO-01/R-21). El formulario real es un kardex de UN lote: datos
// generales del lote fijos una sola vez (Producto/Presentación/Lote MP/
// Peso neto) y una tabla de movimientos con fecha, un solo tipo por fila
// (ingreso o salida, nunca los dos) y saldo ACUMULADO fila a fila — antes
// esta pantalla tenía el lote/producto repetido por fila (como si cada
// una fuera de un lote distinto) y sin fecha ni saldo corriente, no
// coincidía con el papel real. Mockup puro (no hay production-area-b ni
// almacén de PT en el backend). RP-20: este almacén de producto terminado
// para exportación lo administra la propia Producción, no Almacén — por
// eso vive acá y no en el módulo de Almacén.
export default function ControlProductoAlmacen() {
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const [productoId, setProductoId] = useState('')
  const [presentacion, setPresentacion] = useState(PRESENTACIONES[0].value)
  const [loteMp, setLoteMp] = useState('')
  const [filas, setFilas] = useState(() => [filaVacia()])

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

  const pesoUnitario = pesoDe(presentacion)

  // Kardex real: saldo ACUMULADO fila a fila, en el orden en que se
  // cargaron los movimientos (no se reordena por fecha — el papel real
  // tampoco lo hace, aparecen fechas repetidas o fuera de orden).
  let saldoCorriente = 0
  const filasConCalculo = filas.map((f) => {
    const cantidad = num(f.cantidad)
    const kg = cantidad * pesoUnitario
    saldoCorriente += f.tipo === 'ingreso' ? cantidad : -cantidad
    return { ...f, kg, saldoCantidad: saldoCorriente, saldoKg: saldoCorriente * pesoUnitario }
  })

  const totalIngresoKg = filasConCalculo.filter((f) => f.tipo === 'ingreso').reduce((acc, f) => acc + f.kg, 0)
  const totalSalidaKg = filasConCalculo.filter((f) => f.tipo === 'salida').reduce((acc, f) => acc + f.kg, 0)

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Control de Producto en Almacén" codigo="P-PRO-01/R-21" version="01" />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Datos generales" nota="Un formulario por lote — el producto, la presentación y el lote de materia prima no cambian entre movimientos.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {!productos ? (
            <Skeleton className="h-16" />
          ) : (
            <FormSelect label="Producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
          )}
          <FormSelect label="Presentación" value={presentacion} onChange={(e) => setPresentacion(e.target.value)}>
            {PRESENTACIONES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </FormSelect>
          <FormInput label="Lote de materia prima" value={loteMp} onChange={(e) => setLoteMp(e.target.value)} placeholder="C-06116-MP" />
          <FormInput label="Peso neto (kg/unidad)" value={pesoUnitario} disabled />
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={2} titulo="Saldo del almacén">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/50">Ingresado</span>
            <span className="text-xl font-extrabold text-marron-cafe">{totalIngresoKg.toFixed(3)} kg</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/50">Despachado</span>
            <span className="text-xl font-extrabold text-marron-cafe">{totalSalidaKg.toFixed(3)} kg</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-verde-hoja/15 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-verde-bosque/70">Saldo disponible</span>
            <span className="text-xl font-extrabold text-verde-bosque">{(totalIngresoKg - totalSalidaKg).toFixed(3)} kg</span>
          </div>
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={3}
        titulo="Tabla de control de ingreso y salida"
        nota="Un movimiento por fila — el saldo se acumula fila a fila. Asignar un destino (lote de despacho) descuenta el saldo (RP-22); un saco no puede repartirse parcialmente entre lotes de despacho."
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar movimiento
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {filasConCalculo.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-xs font-bold text-crema-quinua">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar movimiento ${i + 1}`}
                  disabled={filas.length === 1}
                  onClick={() => quitarFila(f.id)}
                  className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormInput label="Fecha" type="date" value={f.fecha} onChange={(e) => actualizarFila(f.id, 'fecha')(e.target.value)} />
                <FormSelect label="Tipo" value={f.tipo} onChange={(e) => actualizarFila(f.id, 'tipo')(e.target.value)}>
                  {TIPOS_MOVIMIENTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </FormSelect>
                <FormInput
                  label="Cantidad"
                  type="number"
                  min="0"
                  value={f.cantidad}
                  onChange={(e) => actualizarFila(f.id, 'cantidad')(numero(e.target.value))}
                />
                <FormInput label="Peso (kg)" value={f.kg.toFixed(3)} disabled />
              </div>

              {f.tipo === 'salida' && (
                <FormInput
                  label="Destino (lote de despacho)"
                  value={f.destino}
                  onChange={(e) => actualizarFila(f.id, 'destino')(e.target.value)}
                  placeholder="COM-QB-3560726"
                />
              )}

              <div className="flex items-center gap-4 border-t border-marron-tierra/10 pt-3 text-sm">
                <span className="font-semibold text-marron-cafe/60">Saldo tras este movimiento:</span>
                <span className="font-bold text-marron-cafe">
                  {f.saldoCantidad} unidades · {f.saldoKg.toFixed(3)} kg
                </span>
              </div>
            </div>
          ))}
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
