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

// Sección 5.4 del relevamiento — tipos de salida tal como los nombró el
// área (no la lista genérica "inicial/reposición/cambio" de la narrativa).
const TIPOS_DOTACION = ['Dotación', 'Cambio de área', 'Cambio de EPP', 'Cambio de indumentaria', 'Nuevo ingreso']

let siguienteId = 1
const filaVacia = () => ({ id: siguienteId++, item: '', talla: '', unidadMedida: 'Piezas', cantidad: '' })

const numero = (v) => (v === '' || v == null ? '' : Number(v))

// Formulario I-SYSO-06/R-06 — Nota de Entrega de Indumentaria y EPP.
// Catálogo de EPP todavía no existe como service (no es un "producto" en
// el sentido de productsService), así que el ítem es texto libre — a
// diferencia de Envases/PT, acá no hay de dónde traer un select real.
// MOCKUP total, sin backend propio todavía.
export default function SeccionEntregaIndumentariaEpp() {
  const [nombrePersonal, setNombrePersonal] = useState('')
  const [area, setArea] = useState('')
  const [cargo, setCargo] = useState('')
  const [fecha, setFecha] = useState('')
  const [tipoDotacion, setTipoDotacion] = useState(TIPOS_DOTACION[0])
  const [numeroNota, setNumeroNota] = useState('')
  const [casilleroIndumentaria, setCasilleroIndumentaria] = useState('')
  const [casilleroZapatos, setCasilleroZapatos] = useState('')
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
      <CabeceraFormulario antetitulo="Registro" titulo="Nota de Entrega de Indumentaria y EPP" codigo="I-SYSO-06/R-06" version="01" />

      <MockupBanner />

      <SeccionFormulario numero={1} titulo="Datos generales">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormInput label="Nombre del personal" value={nombrePersonal} onChange={(e) => setNombrePersonal(e.target.value)} />
          <FormInput label="Área" value={area} onChange={(e) => setArea(e.target.value)} />
          <FormInput label="Cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          <FormInput label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormSelect label="Tipo de dotación" value={tipoDotacion} onChange={(e) => setTipoDotacion(e.target.value)}>
            {TIPOS_DOTACION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FormSelect>
          <FormInput label="N° de nota" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} placeholder="121" />
          <FormInput
            label="N° casillero — indumentaria"
            value={casilleroIndumentaria}
            onChange={(e) => setCasilleroIndumentaria(e.target.value)}
          />
          <FormInput label="N° casillero — zapatos" value={casilleroZapatos} onChange={(e) => setCasilleroZapatos(e.target.value)} />
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Detalle de entrega"
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
              <div className="grid flex-1 gap-3 sm:grid-cols-4">
                <FormInput label="Ítem" value={f.item} onChange={(e) => actualizarFila(f.id, 'item')(e.target.value)} placeholder="Bota de agua" />
                <FormInput label="Talla" value={f.talla} onChange={(e) => actualizarFila(f.id, 'talla')(e.target.value)} placeholder="39" />
                <FormInput
                  label="Unidad de medida"
                  value={f.unidadMedida}
                  onChange={(e) => actualizarFila(f.id, 'unidadMedida')(e.target.value)}
                />
                <FormInput
                  label="Cantidad"
                  type="number"
                  min="0"
                  value={f.cantidad}
                  onChange={(e) => actualizarFila(f.id, 'cantidad')(numero(e.target.value))}
                />
              </div>
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
            { rol: 'Recibido por', puesto: cargo || 'Trabajador' },
            { rol: 'Verificado por', puesto: 'Secretaría' },
          ]}
          claseGrilla="sm:grid-cols-3"
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
