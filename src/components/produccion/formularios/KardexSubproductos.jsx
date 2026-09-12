import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from '../../../lib/toast'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import Button from '../../Button.jsx'

// RP-16: los subproductos de Área B (más la menuda que ya sale de Área A)
// no se trazan por lote — van a mercado local, no a exportación. Por eso
// este kardex no tiene selector de lote, a diferencia de los demás
// formularios de Producción: es un libro de entradas/salidas por tipo de
// subproducto y turno, nada más.
const TIPOS_SUBPRODUCTO = [
  { value: 'segunda', label: 'Quinua segunda' },
  { value: 'tercera', label: 'Quinua tercera' },
  { value: 'puntosNegros', label: 'Puntos negros' },
  { value: 'rechazo', label: 'Rechazo' },
  { value: 'polvillo', label: 'Polvillo' },
  { value: 'menudaAreaA', label: 'Menuda (Área A)' },
]

let siguienteId = 1
const filaVacia = () => ({
  id: siguienteId++,
  fecha: '',
  tipo: TIPOS_SUBPRODUCTO[0].value,
  ingresoSacos: '',
  ingresoKg: '',
  salidaSacos: '',
  salidaKg: '',
  observaciones: '',
})

const numero = (v) => (v === '' || v == null ? '' : Number(v))
const num = (v) => Number(v) || 0

// Formulario 6 del relevamiento — Kardex de Subproductos Área B
// (P-PRO-01/R-19). Mockup puro: no hay production-area-b ni un módulo de
// subproductos en el backend todavía. Los supervisores ya lo llevan en una
// planilla digital propia (Excel) — este componente traduce esa misma
// estructura a pantalla.
export default function KardexSubproductos() {
  const [filas, setFilas] = useState(() => [filaVacia()])

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  // Saldo acumulado por tipo — se muestra como resumen aparte porque el
  // saldo real es el resultado de TODOS los movimientos históricos, no solo
  // los cargados en esta sesión de pantalla; acá solo se puede calcular
  // sobre lo que ya está tipeado.
  const saldosPorTipo = TIPOS_SUBPRODUCTO.map(({ value, label }) => {
    const deEsteTipo = filas.filter((f) => f.tipo === value)
    const ingresoKg = deEsteTipo.reduce((acc, f) => acc + num(f.ingresoKg), 0)
    const salidaKg = deEsteTipo.reduce((acc, f) => acc + num(f.salidaKg), 0)
    return { value, label, saldoKg: ingresoKg - salidaKg }
  })

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Kardex de Subproductos — Área B" codigo="P-PRO-01/R-19" version="01" />

      <SeccionFormulario numero={1} titulo="Saldo por subproducto">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {saldosPorTipo.map(({ value, label, saldoKg }) => (
            <div key={value} className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/50">{label}</span>
              <span className="text-xl font-extrabold text-marron-cafe">{saldoKg.toFixed(3)} kg</span>
            </div>
          ))}
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Movimientos"
        nota="Sin trazabilidad de lote (RP-16) — se reporta a Administración al cierre de cada turno para su venta a clientes locales."
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
                <FormSelect label="Subproducto" value={f.tipo} onChange={(e) => actualizarFila(f.id, 'tipo')(e.target.value)}>
                  {TIPOS_SUBPRODUCTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </FormSelect>
                <FormInput
                  label="Ingreso (sacos)"
                  type="number"
                  min="0"
                  value={f.ingresoSacos}
                  onChange={(e) => actualizarFila(f.id, 'ingresoSacos')(numero(e.target.value))}
                />
                <FormInput
                  label="Ingreso (kg)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={f.ingresoKg}
                  onChange={(e) => actualizarFila(f.id, 'ingresoKg')(numero(e.target.value))}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormInput
                  label="Salida (sacos)"
                  type="number"
                  min="0"
                  value={f.salidaSacos}
                  onChange={(e) => actualizarFila(f.id, 'salidaSacos')(numero(e.target.value))}
                />
                <FormInput
                  label="Salida (kg)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={f.salidaKg}
                  onChange={(e) => actualizarFila(f.id, 'salidaKg')(numero(e.target.value))}
                />
                <FormInput
                  label="Observaciones"
                  value={f.observaciones}
                  onChange={(e) => actualizarFila(f.id, 'observaciones')(e.target.value)}
                  className="sm:col-span-2"
                />
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
