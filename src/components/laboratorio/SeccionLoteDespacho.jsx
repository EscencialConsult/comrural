import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { productsService } from '../../services/productsService'
import { listarTodo } from '../../services/paginacion'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'
import Badge from '../Badge.jsx'
import Skeleton from '../Skeleton.jsx'

// RP-19 — mismo catálogo que Producción Área B.
const PRESENTACIONES = [
  { value: 'bigbag-1000', label: 'Big Bag 1.000 kg', kg: 1000 },
  { value: 'bigbag-1200', label: 'Big Bag 1.200 kg', kg: 1200 },
  { value: 'kraft-25', label: 'Papel kraft 25 kg', kg: 25 },
  { value: 'kraft-11.34', label: 'Papel kraft 11,34 kg', kg: 11.34 },
]

const RESULTADOS_LAB = ['Pendiente', 'Aprobado', 'Rechazado']

let siguienteId = 1
const filaLoteVacia = () => ({
  id: siguienteId++,
  loteMp: '',
  cantidadAportadaKg: '',
  resultadoLab: RESULTADOS_LAB[0],
})

const numero = (v) => (v === '' || v == null ? '' : Number(v))
const num = (v) => Number(v) || 0

// RP-21: el lote de despacho (ej. COM-QB-3560726) lo arma Laboratorio junto
// con Calidad, uniendo varios lotes de MP ya liberados hasta completar un
// pedido — no lo hace Producción, que solo llega hasta el Almacén de
// producto terminado (ver ControlProductoAlmacen.jsx). Nunca se compartió
// un formulario real de esto en las reuniones (solo un ejemplo verbal con
// un pedido de Ecoterra) — MOCKUP con MockupBanner visible.
export default function SeccionLoteDespacho() {
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [pedidoPo, setPedidoPo] = useState('')
  const [cliente, setCliente] = useState('')
  const [productoId, setProductoId] = useState('')
  const [presentacion, setPresentacion] = useState(PRESENTACIONES[0].value)
  const [cantidadPedidoKg, setCantidadPedidoKg] = useState('')
  const [loteDespacho, setLoteDespacho] = useState('')
  const [filas, setFilas] = useState(() => [filaLoteVacia()])

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

  const agregarFila = () => setFilas((prev) => [...prev, filaLoteVacia()])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const totalCompuestoKg = filas.reduce((acc, f) => acc + num(f.cantidadAportadaKg), 0)
  const faltanteKg = num(cantidadPedidoKg) - totalCompuestoKg
  const hayLoteNoAprobado = filas.some((f) => f.loteMp && f.resultadoLab !== 'Aprobado')

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <MockupBanner mensaje="Mockup — la asignación real del lote de despacho la coordina Laboratorio con Calidad, todavía sin backend propio." />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <div className="flex flex-col gap-4 rounded-3xl bg-verde-pistacho/25 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">Datos del pedido</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput label="PO / Pedido" value={pedidoPo} onChange={(e) => setPedidoPo(e.target.value)} placeholder="PO-2026-0143" />
          <FormInput label="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Ecoterra" />
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
          <FormInput
            label="Cantidad del pedido (kg)"
            type="number"
            min="0"
            step="0.001"
            value={cantidadPedidoKg}
            onChange={(e) => setCantidadPedidoKg(numero(e.target.value))}
          />
          <FormInput
            label="Lote de despacho"
            value={loteDespacho}
            onChange={(e) => setLoteDespacho(e.target.value)}
            placeholder="COM-QB-3560726"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">Lotes de MP que lo componen</h2>
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar lote
          </Button>
        </div>
        <p className="text-xs text-marron-cafe/60">
          Un pedido normalmente se completa uniendo varios lotes de MP ya liberados por Laboratorio y Calidad (los
          volúmenes de MP no son estándar).
        </p>

        <div className="flex flex-col gap-3">
          {filas.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4 sm:flex-row sm:items-end sm:gap-4">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <FormInput label="Lote MP" value={f.loteMp} onChange={(e) => actualizarFila(f.id, 'loteMp')(e.target.value)} placeholder="C-05016-MP" />
                <FormInput
                  label="Cantidad aportada (kg)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={f.cantidadAportadaKg}
                  onChange={(e) => actualizarFila(f.id, 'cantidadAportadaKg')(numero(e.target.value))}
                />
                <FormSelect label="Resultado laboratorio" value={f.resultadoLab} onChange={(e) => actualizarFila(f.id, 'resultadoLab')(e.target.value)}>
                  {RESULTADOS_LAB.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <button
                type="button"
                aria-label={`Quitar lote ${i + 1}`}
                disabled={filas.length === 1}
                onClick={() => quitarFila(f.id)}
                className="self-end rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30 sm:self-center"
              >
                <Trash2 className="size-4" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white/70 px-4 py-3 text-sm">
          <span className="font-bold text-marron-cafe">
            Compuesto: <span className="tabular-nums">{totalCompuestoKg.toFixed(3)} kg</span>
          </span>
          {cantidadPedidoKg !== '' && (
            <span className={`font-bold ${faltanteKg > 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'}`}>
              {faltanteKg > 0 ? `Falta: ${faltanteKg.toFixed(3)} kg` : 'Pedido completo'}
            </span>
          )}
          {hayLoteNoAprobado && <Badge tono="alerta">Hay lotes sin aprobar todavía</Badge>}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={guardar}>
          <Plus className="mr-1.5 size-4" strokeWidth={2} />
          Guardar
        </Button>
      </div>
    </div>
  )
}
