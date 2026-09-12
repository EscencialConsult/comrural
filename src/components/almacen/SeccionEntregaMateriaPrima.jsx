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

// 1 QQ (quintal) = 45,359 kg — es la unidad en la que se factura al
// proveedor según el análisis funcional (sección 04). El peso neto en QQ es
// la base de pago, así que se deriva siempre del kg, nunca al revés.
const KG_POR_QUINTAL = 45.359

const TIPOS_SALIDA = ['Requerimiento', 'Ajuste', 'Devolución']

const RESPONSABLES = [
  { rol: 'Entregado por', puesto: 'Asistente de Almacén' },
  { rol: 'Recibido por', puesto: 'Supervisor de Producción' },
]

let siguienteId = 1
const filaVacia = () => ({
  id: siguienteId++,
  solicitante: '',
  fecha: '',
  numeroSalida: '',
  tipoSalida: TIPOS_SALIDA[0],
  loteMp: '',
  productoId: '',
  cantidadSacos: '',
  pesoPromedioKg: '',
  observaciones: '',
})

const numero = (v) => (v === '' || v == null ? '' : Number(v))
const num = (v) => Number(v) || 0

// Formulario P-ADM-03/R-24 — Nota de Entrega de Materia Prima. Es el
// registro que hoy hacen a mano entre Almacén y Producción antes de que un
// lote arranque el Área A: el supervisor de turno solicita el lote
// completo, Almacén lo entrega, y ambos cuentan sacos físicamente antes de
// empezar (sin control de diferencias — se entrega el lote completo). No
// existe todavía como pantalla en Almacén (solo "Recepción" está armada) ni
// tiene backend propio — MOCKUP total, con MockupBanner visible a
// diferencia de los formularios de Producción Área B.
export default function SeccionEntregaMateriaPrima() {
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

  const filasConCalculo = filas.map((f) => {
    const pesoNetoKg = num(f.cantidadSacos) * num(f.pesoPromedioKg)
    return { ...f, pesoNetoKg, pesoNetoQq: pesoNetoKg / KG_POR_QUINTAL }
  })

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Nota de Entrega de Materia Prima" codigo="P-ADM-03/R-24" version="01" />

      <MockupBanner />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario
        numero={1}
        titulo="Notas de entrega"
        nota="Se entrega el lote completo — sin control de diferencias pedido/entrega. Conteo físico de sacos entre Almacén y Producción antes de iniciar."
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar nota
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
                  aria-label={`Quitar nota ${i + 1}`}
                  disabled={filas.length === 1}
                  onClick={() => quitarFila(f.id)}
                  className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <FormInput
                  label="Solicitante"
                  value={f.solicitante}
                  onChange={(e) => actualizarFila(f.id, 'solicitante')(e.target.value)}
                  placeholder="Nombre del supervisor"
                />
                <FormInput label="Fecha" type="date" value={f.fecha} onChange={(e) => actualizarFila(f.id, 'fecha')(e.target.value)} />
                <FormInput
                  label="N° de salida"
                  value={f.numeroSalida}
                  onChange={(e) => actualizarFila(f.id, 'numeroSalida')(e.target.value)}
                  placeholder="86"
                />
                <FormSelect label="Tipo de salida" value={f.tipoSalida} onChange={(e) => actualizarFila(f.id, 'tipoSalida')(e.target.value)}>
                  {TIPOS_SALIDA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </FormSelect>
                <FormInput
                  label="Lote MP"
                  value={f.loteMp}
                  onChange={(e) => actualizarFila(f.id, 'loteMp')(e.target.value)}
                  placeholder="C-07416-MP"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <FormInput
                  label="Cantidad de sacos"
                  type="number"
                  min="0"
                  value={f.cantidadSacos}
                  onChange={(e) => actualizarFila(f.id, 'cantidadSacos')(numero(e.target.value))}
                />
                <FormInput
                  label="Peso promedio (kg/saco)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={f.pesoPromedioKg}
                  onChange={(e) => actualizarFila(f.id, 'pesoPromedioKg')(numero(e.target.value))}
                />
                <FormInput label="Peso neto (kg)" value={f.pesoNetoKg.toFixed(2)} disabled />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormInput label="Peso neto (QQ)" value={f.pesoNetoQq.toFixed(2)} disabled hint="Base de pago al proveedor — 1 QQ = 45,359 kg" />
                <FormTextarea
                  label="Observaciones"
                  rows={1}
                  value={f.observaciones}
                  onChange={(e) => actualizarFila(f.id, 'observaciones')(e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={2} titulo="Firmas">
        <FirmasResponsables responsables={RESPONSABLES} claseGrilla="sm:grid-cols-2" />
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
