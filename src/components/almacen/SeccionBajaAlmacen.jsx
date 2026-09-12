import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'
import Button from '../Button.jsx'

// Sección 5.5 del relevamiento: "Tipos de baja: destruccion o venta
// (reciclado)".
const TIPOS_BAJA = ['Destrucción', 'Venta (reciclado)']

let siguienteId = 1
const filaVacia = () => ({ id: siguienteId++, item: '', loteAlmacen: '', ordenAsociada: '', unidadMedida: '', cantidad: '' })

const numero = (v) => (v === '' || v == null ? '' : Number(v))

// Formulario P-ADM-03/R-21 — Nota de Baja de Almacén (P-09 de la
// narrativa). A diferencia de Envases/PT/EPP, este proceso es transversal
// a cualquier almacén (materia prima rechazada, envases dañados, EPP
// retirado, etc.) — por eso va como ítem propio en el sidebar, no colgado
// de una categoría. MOCKUP total, sin backend propio todavía.
export default function SeccionBajaAlmacen() {
  const [tipoBaja, setTipoBaja] = useState(TIPOS_BAJA[0])
  const [fecha, setFecha] = useState('')
  const [numeroNota, setNumeroNota] = useState('')
  const [filas, setFilas] = useState(() => [filaVacia()])
  const [observaciones, setObservaciones] = useState('')

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Nota de Baja de Almacén" codigo="P-ADM-03/R-21" version="01" />

      <MockupBanner />

      <SeccionFormulario numero={1} titulo="Datos generales">
        <div className="grid gap-3 sm:grid-cols-3">
          <FormSelect label="Tipo de baja" value={tipoBaja} onChange={(e) => setTipoBaja(e.target.value)}>
            {TIPOS_BAJA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FormSelect>
          <FormInput label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <FormInput label="N° de nota" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} placeholder="B-0013" />
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Detalle de baja"
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar ítem
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {filas.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormInput label="Ítem" value={f.item} onChange={(e) => actualizarFila(f.id, 'item')(e.target.value)} placeholder="Big bag de 1000kg" />
                <FormInput
                  label="Lote de almacén"
                  value={f.loteAlmacen}
                  onChange={(e) => actualizarFila(f.id, 'loteAlmacen')(e.target.value)}
                  placeholder="030726-EEBB-06"
                />
                <FormInput
                  label="OP/OE asociado"
                  value={f.ordenAsociada}
                  onChange={(e) => actualizarFila(f.id, 'ordenAsociada')(e.target.value)}
                  placeholder="OE-131"
                />
                <FormInput
                  label="Unidad de medida"
                  value={f.unidadMedida}
                  onChange={(e) => actualizarFila(f.id, 'unidadMedida')(e.target.value)}
                  placeholder="Piezas"
                />
              </div>
              <FormInput
                label="Cantidad"
                type="number"
                min="0"
                className="sm:max-w-[7rem]"
                value={f.cantidad}
                onChange={(e) => actualizarFila(f.id, 'cantidad')(numero(e.target.value))}
              />
              <button
                type="button"
                aria-label={`Quitar ítem ${i + 1}`}
                disabled={filas.length === 1}
                onClick={() => quitarFila(f.id)}
                className="self-end rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30 sm:self-center"
              >
                <Trash2 className="size-4" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        <FormTextarea label="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </SeccionFormulario>

      <SeccionFormulario numero={3} titulo="Firmas y conformidad">
        <FirmasResponsables
          responsables={[
            { rol: 'Entregado por', puesto: 'Asistente de Almacén' },
            { rol: 'Autorizado por', puesto: 'Gerencia' },
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
