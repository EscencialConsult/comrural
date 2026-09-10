import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import FormInput from '../FormInput.jsx'
import FormTextarea from '../FormTextarea.jsx'
import Button from '../Button.jsx'

let siguienteIdReq = 1
const filaRequerimientoVacia = () => ({ id: siguienteIdReq++, item: '', unidadMedida: '', cantidad: '' })

let siguienteIdEnt = 1
const filaEntregaVacia = () => ({ id: siguienteIdEnt++, item: '', unidadMedida: '', cantidad: '' })

const numero = (v) => (v === '' || v == null ? '' : Number(v))

// Requerimiento (P-ADM-03/R-27) + Nota de Entrega de Almacén (P-ADM-03/R-20)
// para Almacén General — sección 5.2 del relevamiento: "Materiales de
// escritorio los piden todas las areas" y "se distingue entre materiales
// de limpieza y escritorio", por eso el requerimiento no lleva OP/OE (a
// diferencia de Envases, esto no está ligado a una orden de producción).
// Autocontenido, sin compartir código con SeccionSalidaEnvases.jsx — mismo
// criterio del resto de los mockups de este relevamiento. Sin backend.
export default function SeccionSalidaAlmacenGeneral() {
  const [solicitante, setSolicitante] = useState('')
  const [area, setArea] = useState('')
  const [numeroRequerimiento, setNumeroRequerimiento] = useState('')
  const [fechaRequerimiento, setFechaRequerimiento] = useState('')
  const [filasRequerimiento, setFilasRequerimiento] = useState(() => [filaRequerimientoVacia()])

  const [fechaEntrega, setFechaEntrega] = useState('')
  const [numeroNotaEntrega, setNumeroNotaEntrega] = useState('')
  const [filasEntrega, setFilasEntrega] = useState(() => [filaEntregaVacia()])
  const [observaciones, setObservaciones] = useState('')

  const actualizarFilaRequerimiento = (id, campo) => (valor) =>
    setFilasRequerimiento((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFilaRequerimiento = () => setFilasRequerimiento((prev) => [...prev, filaRequerimientoVacia()])
  const quitarFilaRequerimiento = (id) =>
    setFilasRequerimiento((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const actualizarFilaEntrega = (id, campo) => (valor) =>
    setFilasEntrega((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFilaEntrega = () => setFilasEntrega((prev) => [...prev, filaEntregaVacia()])
  const quitarFilaEntrega = (id) => setFilasEntrega((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Salida de Almacén General" codigo="P-ADM-03/R-27 · P-ADM-03/R-20" version="01" />

      <MockupBanner />

      <SeccionFormulario numero={1} titulo="Requerimiento del área" nota="Cualquier área puede solicitar materiales de escritorio o limpieza.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormInput label="Solicitante" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} />
          <FormInput label="Área" value={area} onChange={(e) => setArea(e.target.value)} />
          <FormInput label="N°" value={numeroRequerimiento} onChange={(e) => setNumeroRequerimiento(e.target.value)} />
          <FormInput label="Fecha" type="date" value={fechaRequerimiento} onChange={(e) => setFechaRequerimiento(e.target.value)} />
        </div>

        <div className="flex flex-col gap-3">
          {filasRequerimiento.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <FormInput label="Ítem" value={f.item} onChange={(e) => actualizarFilaRequerimiento(f.id, 'item')(e.target.value)} placeholder="Resma de papel A4" />
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
          <Button variant="secondary" className="w-fit gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFilaRequerimiento}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar ítem
          </Button>
        </div>

        <FirmasResponsables
          responsables={[
            { rol: 'Solicitante', puesto: '' },
            { rol: 'Jefatura', puesto: 'Aprobación' },
          ]}
          claseGrilla="sm:grid-cols-2"
        />
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Nota de entrega de Almacén"
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFilaEntrega}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar ítem
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput label="Fecha" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
          <FormInput label="N° de nota" value={numeroNotaEntrega} onChange={(e) => setNumeroNotaEntrega(e.target.value)} />
        </div>

        <div className="flex flex-col gap-3">
          {filasEntrega.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <FormInput label="Ítem" value={f.item} onChange={(e) => actualizarFilaEntrega(f.id, 'item')(e.target.value)} placeholder="Resma de papel A4" />
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
              <button
                type="button"
                aria-label={`Quitar ítem ${i + 1}`}
                disabled={filasEntrega.length === 1}
                onClick={() => quitarFilaEntrega(f.id)}
                className="self-end rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30 sm:self-center"
              >
                <Trash2 className="size-4" strokeWidth={2} />
              </button>
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
