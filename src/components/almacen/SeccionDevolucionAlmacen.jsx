import { useState } from 'react'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import PillTabs from '../dashboard/PillTabs.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'
import Button from '../Button.jsx'
import { ArrowUpFromLine, ArrowDownToLine } from 'lucide-react'

const TIPOS_DEVOLUCION = [
  { id: 'externa', nombre: 'Externa al proveedor', Icon: ArrowUpFromLine },
  { id: 'interna', nombre: 'Interna', Icon: ArrowDownToLine },
]

const RESULTADOS_EXTERNA = ['Pendiente de gestión', 'Devuelto al proveedor', 'Repuesto por el proveedor']
const ESTADOS_MATERIAL = ['Bueno', 'Requiere revisión', 'Deteriorado']
const DESTINOS_INTERNA = ['Reingreso al stock', 'Enviado a revisión', 'Baja']

// P-07 (devolución externa al proveedor) y P-08 (devolución interna /
// reingreso de sobrantes) de la narrativa — sección 4.4 del relevamiento.
// No hay un formulario en papel capturado para esto, solo la descripción
// del proceso: los campos salen de ahí, no de una nota escaneada como el
// resto de los formularios de Almacén. MOCKUP total, sin backend propio.
export default function SeccionDevolucionAlmacen() {
  const [tipo, setTipo] = useState('externa')

  // Externa
  const [numeroRecepcionOriginal, setNumeroRecepcionOriginal] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [itemExterna, setItemExterna] = useState('')
  const [loteExterna, setLoteExterna] = useState('')
  const [cantidadExterna, setCantidadExterna] = useState('')
  const [motivoExterna, setMotivoExterna] = useState('')
  const [resultadoExterna, setResultadoExterna] = useState(RESULTADOS_EXTERNA[0])

  // Interna
  const [areaDevuelve, setAreaDevuelve] = useState('')
  const [solicitanteInterna, setSolicitanteInterna] = useState('')
  const [ordenOrigen, setOrdenOrigen] = useState('')
  const [itemInterna, setItemInterna] = useState('')
  const [loteInterna, setLoteInterna] = useState('')
  const [cantidadInterna, setCantidadInterna] = useState('')
  const [estadoMaterial, setEstadoMaterial] = useState(ESTADOS_MATERIAL[0])
  const [destinoInterna, setDestinoInterna] = useState(DESTINOS_INTERNA[0])

  const [fecha, setFecha] = useState('')
  const [numeroNota, setNumeroNota] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Devolución de Almacén" version="01" />

      <MockupBanner mensaje="Mockup — sin formulario en papel de referencia, campos derivados de la narrativa de procesos (P-07/P-08)." />

      <PillTabs pestañas={TIPOS_DEVOLUCION} activa={tipo} onCambiar={setTipo} />

      <SeccionFormulario numero={1} titulo="Datos generales">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <FormInput label="N° de nota" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} />
        </div>
      </SeccionFormulario>

      {tipo === 'externa' ? (
        <SeccionFormulario numero={2} titulo="Devolución externa al proveedor" nota="El material queda bloqueado, separado del saldo disponible, hasta que Compras gestione la devolución o reposición.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput
              label="N° de recepción original"
              value={numeroRecepcionOriginal}
              onChange={(e) => setNumeroRecepcionOriginal(e.target.value)}
            />
            <FormInput label="Proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
            <FormInput label="Ítem" value={itemExterna} onChange={(e) => setItemExterna(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput label="Lote" value={loteExterna} onChange={(e) => setLoteExterna(e.target.value)} />
            <FormInput label="Cantidad observada" type="number" min="0" value={cantidadExterna} onChange={(e) => setCantidadExterna(e.target.value)} />
            <FormSelect label="Resultado" value={resultadoExterna} onChange={(e) => setResultadoExterna(e.target.value)}>
              {RESULTADOS_EXTERNA.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </FormSelect>
          </div>
          <FormTextarea label="Motivo del rechazo / diferencia" value={motivoExterna} onChange={(e) => setMotivoExterna(e.target.value)} />
        </SeccionFormulario>
      ) : (
        <SeccionFormulario numero={2} titulo="Devolución interna / reingreso de sobrantes" nota="El saldo no aumenta hasta confirmar la devolución física.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormInput label="Área que devuelve" value={areaDevuelve} onChange={(e) => setAreaDevuelve(e.target.value)} />
            <FormInput label="Solicitante" value={solicitanteInterna} onChange={(e) => setSolicitanteInterna(e.target.value)} />
            <FormInput label="OP/OE de origen" value={ordenOrigen} onChange={(e) => setOrdenOrigen(e.target.value)} placeholder="OE-166" />
            <FormInput label="Ítem" value={itemInterna} onChange={(e) => setItemInterna(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormInput label="Lote" value={loteInterna} onChange={(e) => setLoteInterna(e.target.value)} />
            <FormInput label="Cantidad devuelta" type="number" min="0" value={cantidadInterna} onChange={(e) => setCantidadInterna(e.target.value)} />
            <FormSelect label="Estado del material" value={estadoMaterial} onChange={(e) => setEstadoMaterial(e.target.value)}>
              {ESTADOS_MATERIAL.map((e2) => (
                <option key={e2} value={e2}>
                  {e2}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="Destino" value={destinoInterna} onChange={(e) => setDestinoInterna(e.target.value)}>
              {DESTINOS_INTERNA.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </FormSelect>
          </div>
        </SeccionFormulario>
      )}

      <SeccionFormulario numero={3} titulo="Observaciones">
        <FormTextarea label="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </SeccionFormulario>

      <SeccionFormulario numero={4} titulo="Firmas y conformidad">
        <FirmasResponsables
          responsables={[
            { rol: 'Entregado por', puesto: tipo === 'externa' ? 'Compras' : areaDevuelve || 'Área solicitante' },
            { rol: 'Recibido por', puesto: 'Asistente de Almacén' },
          ]}
          claseGrilla="sm:grid-cols-2"
        />
      </SeccionFormulario>

      <div className="flex justify-end">
        <Button onClick={guardar}>Guardar</Button>
      </div>
    </div>
  )
}
