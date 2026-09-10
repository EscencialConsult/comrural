import { useState } from 'react'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'
import Button from '../Button.jsx'

// almacenes.md — prefijos confirmados por familia/subalmacén (P-13 de la
// narrativa: "el código se genera con el prefijo de la familia y un
// consecutivo").
const FAMILIAS = {
  'Materia Prima': [{ value: 'MP', label: 'Materia Prima (MP)' }],
  'Envases y Embalaje / Insumos de Proceso': [
    { value: 'ML', label: 'Mercado local (ML)' },
    { value: 'EXP', label: 'Exportación (EXP)' },
    { value: 'INS', label: 'Insumos de proceso (INS)' },
  ],
  'Producto Terminado': [
    { value: 'PTL', label: 'Local (PTL)' },
    { value: 'PTE', label: 'Exportación (PTE)' },
  ],
  'Almacén General': [
    { value: 'ESC', label: 'Escritorio (ESC)' },
    { value: 'LIM', label: 'Limpieza (LIM)' },
    { value: 'MNT', label: 'Mantenimiento (MNT)' },
    { value: 'IND', label: 'Indumentaria (IND)' },
    { value: 'EPP', label: "EPP's (EPP)" },
    { value: 'SOL', label: 'Solicitud de compras (SOL)' },
  ],
}

const ESTADOS_INICIALES = ['Activo', 'Inactivo']

// Consecutivo de ejemplo — el real lo asigna el backend al crear el ítem
// (autoincremental por prefijo); acá es solo para mostrar cómo se vería el
// código final.
const CONSECUTIVO_EJEMPLO = '00001'

// Alta y clasificación de nuevos ítems (P-13 de la narrativa, sección 3
// del relevamiento: "El sistema debe permitir crear nuevos items cuando
// llegue un producto nuevo"). Sin formulario en papel de referencia — los
// campos salen de la descripción del proceso. MOCKUP total, sin backend
// propio (el catálogo real hoy es productsService, específico de MP/PT).
export default function SeccionAltaItem() {
  const [descripcion, setDescripcion] = useState('')
  const [familia, setFamilia] = useState(Object.keys(FAMILIAS)[0])
  const [subalmacen, setSubalmacen] = useState(FAMILIAS[Object.keys(FAMILIAS)[0]][0].value)
  const [unidadMedida, setUnidadMedida] = useState('')
  const [requiereLote, setRequiereLote] = useState(true)
  const [controlVencimiento, setControlVencimiento] = useState(false)
  const [estadoInicial, setEstadoInicial] = useState(ESTADOS_INICIALES[0])
  const [notas, setNotas] = useState('')

  const cambiarFamilia = (f) => {
    setFamilia(f)
    setSubalmacen(FAMILIAS[f][0].value)
  }

  const guardar = () => {
    toast.info('Ítem creado (mockup).')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Alta de Nuevo Ítem" version="01" />

      <MockupBanner mensaje="Mockup — sin formulario en papel de referencia, campos derivados de la narrativa de procesos (P-13)." />

      <SeccionFormulario numero={1} titulo="Clasificación" nota="Se verifica primero que no exista ya un ítem equivalente, para evitar duplicados.">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Resma de papel A4" />
          <FormSelect label="Familia" value={familia} onChange={(e) => cambiarFamilia(e.target.value)}>
            {Object.keys(FAMILIAS).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormSelect label="Almacén / Subalmacén" value={subalmacen} onChange={(e) => setSubalmacen(e.target.value)}>
            {FAMILIAS[familia].map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </FormSelect>
          <FormInput label="Unidad de medida" value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)} placeholder="Piezas, kg, Pares…" />
          <FormSelect label="Estado inicial" value={estadoInicial} onChange={(e) => setEstadoInicial(e.target.value)}>
            {ESTADOS_INICIALES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </FormSelect>
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={2} titulo="Atributos de control">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm text-marron-cafe">
            <input type="checkbox" checked={requiereLote} onChange={(e) => setRequiereLote(e.target.checked)} className="size-4 accent-verde-bosque" />
            Requiere control de lote
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm text-marron-cafe">
            <input type="checkbox" checked={controlVencimiento} onChange={(e) => setControlVencimiento(e.target.checked)} className="size-4 accent-verde-bosque" />
            Requiere control de vencimiento
          </label>
        </div>
        <FormTextarea label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} hint="Opcional — equivalencias, kit al que pertenece, etc." />
      </SeccionFormulario>

      <SeccionFormulario numero={3} titulo="Código generado">
        <FormInput
          label="Código"
          value={`${subalmacen}${CONSECUTIVO_EJEMPLO}`}
          disabled
          hint="Prefijo de familia + consecutivo — el consecutivo real lo asigna el backend al guardar"
          className="max-w-xs font-mono"
        />
      </SeccionFormulario>

      <div className="flex justify-end">
        <Button onClick={guardar}>Guardar</Button>
      </div>
    </div>
  )
}
