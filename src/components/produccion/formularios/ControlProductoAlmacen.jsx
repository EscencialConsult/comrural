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

// RP-19 — mismas presentaciones que Volumen B (ControlVolumenB.jsx). Se
// repite acá en vez de compartirse desde un módulo común: mismo criterio
// que el resto de los formularios mock de este relevamiento, cada uno es
// autocontenido hasta que haya un backend real que las sirva como catálogo.
const PRESENTACIONES = [
  { value: 'bigbag-1000', label: 'Big Bag 1.000 kg', kg: 1000 },
  { value: 'bigbag-1200', label: 'Big Bag 1.200 kg', kg: 1200 },
  { value: 'kraft-25', label: 'Papel kraft 25 kg', kg: 25 },
  { value: 'kraft-11.34', label: 'Papel kraft 11,34 kg', kg: 11.34 },
]

let siguienteId = 1
const filaVacia = () => ({
  id: siguienteId++,
  loteMp: '',
  productoId: '',
  presentacion: PRESENTACIONES[0].value,
  ingresoCantidad: '',
  salidaCantidad: '',
  destino: '',
})

const numero = (v) => (v === '' || v == null ? '' : Number(v))
const num = (v) => Number(v) || 0
const pesoDe = (presentacion) => PRESENTACIONES.find((p) => p.value === presentacion)?.kg ?? 0

// Formulario 7 del relevamiento — Control de Producto en Almacén
// (P-PRO-01/R-21). Mockup puro (no hay production-area-b ni almacén de PT
// en el backend). RP-20: este almacén de producto terminado para
// exportación lo administra la propia Producción, no Almacén — por eso
// vive acá y no en el módulo de Almacén.
export default function ControlProductoAlmacen() {
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
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

  // Cantidad y kg se derivan de la presentación (RP-19), igual que
  // "Envasados (kg)" en Volumen B — la salida solo se descuenta si la fila
  // ya tiene un destino (RP-22: asignar lote de despacho baja la
  // existencia).
  const filasConCalculo = filas.map((f) => {
    const pesoUnitario = pesoDe(f.presentacion)
    const ingresoKg = num(f.ingresoCantidad) * pesoUnitario
    const salidaKg = f.destino ? num(f.salidaCantidad) * pesoUnitario : 0
    return { ...f, pesoUnitario, ingresoKg, salidaKg }
  })

  const totalIngresoKg = filasConCalculo.reduce((acc, f) => acc + f.ingresoKg, 0)
  const totalSalidaKg = filasConCalculo.reduce((acc, f) => acc + f.salidaKg, 0)
  const saldoKg = totalIngresoKg - totalSalidaKg

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Control de Producto en Almacén" codigo="P-PRO-01/R-21" version="01" />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Saldo del almacén">
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
            <span className="text-xl font-extrabold text-verde-bosque">{saldoKg.toFixed(3)} kg</span>
          </div>
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Movimientos"
        nota="Asignar un destino (lote de despacho) descuenta la cantidad del saldo del almacén (RP-22). Un saco no puede repartirse parcialmente entre lotes de despacho."
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar fila
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
                  label="Lote MP"
                  value={f.loteMp}
                  onChange={(e) => actualizarFila(f.id, 'loteMp')(e.target.value)}
                  placeholder="C-05016-MP"
                />
                {!productos ? (
                  <Skeleton className="h-16" />
                ) : (
                  <FormSelect label="Producto" value={f.productoId} onChange={(e) => actualizarFila(f.id, 'productoId')(e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </FormSelect>
                )}
                <FormSelect
                  label="Presentación"
                  value={f.presentacion}
                  onChange={(e) => actualizarFila(f.id, 'presentacion')(e.target.value)}
                >
                  {PRESENTACIONES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </FormSelect>
                <FormInput label="Peso neto (kg/unidad)" value={f.pesoUnitario} disabled />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormInput
                  label="Ingreso almacén (unidades)"
                  type="number"
                  min="0"
                  value={f.ingresoCantidad}
                  onChange={(e) => actualizarFila(f.id, 'ingresoCantidad')(numero(e.target.value))}
                />
                <FormInput label="Ingreso (kg)" value={f.ingresoKg.toFixed(3)} disabled />
                <FormInput
                  label="Salida almacén (unidades)"
                  type="number"
                  min="0"
                  value={f.salidaCantidad}
                  onChange={(e) => actualizarFila(f.id, 'salidaCantidad')(numero(e.target.value))}
                  hint={!f.destino ? 'Sin destino todavía no descuenta el saldo' : undefined}
                />
                <FormInput label="Salida (kg)" value={f.salidaKg.toFixed(3)} disabled />
              </div>

              <FormInput
                label="Destino (lote de despacho)"
                value={f.destino}
                onChange={(e) => actualizarFila(f.id, 'destino')(e.target.value)}
                placeholder="COM-QB-3560726"
              />
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
