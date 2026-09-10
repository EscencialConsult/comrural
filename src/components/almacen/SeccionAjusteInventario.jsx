import { useState } from 'react'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'
import Button from '../Button.jsx'

const ALMACENES = [
  'Materia Prima (MP)',
  'Envases y Embalaje — Mercado Local (ML)',
  'Envases y Embalaje — Exportación (EXP)',
  'Insumos de Proceso (INS)',
  'Producto Terminado Local (PTL)',
  'Almacén General',
]

const numero = (v) => (v === '' || v == null ? 0 : Number(v))

// P-12 de la narrativa — corrige una diferencia comprobada que no se
// resuelve con un documento operativo omitido (ver Devoluciones/Bajas para
// esos casos). Sin formulario en papel de referencia, campos derivados de
// la descripción del proceso. Requiere doble aprobación (Responsable de
// Almacén + Gerencia) — acá solo se muestran los dos recuadros de firma,
// sin lógica de flujo real. MOCKUP total, sin backend propio.
export default function SeccionAjusteInventario() {
  const [almacen, setAlmacen] = useState(ALMACENES[0])
  const [item, setItem] = useState('')
  const [lote, setLote] = useState('')
  const [saldoSistema, setSaldoSistema] = useState('')
  const [cantidadFisica, setCantidadFisica] = useState('')
  const [motivo, setMotivo] = useState('')
  const [documentoRespaldo, setDocumentoRespaldo] = useState('')
  const [fecha, setFecha] = useState('')

  const diferencia = numero(cantidadFisica) - numero(saldoSistema)

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Ajuste de Inventario" version="01" />

      <MockupBanner mensaje="Mockup — sin formulario en papel de referencia, campos derivados de la narrativa de procesos (P-12)." />

      <SeccionFormulario numero={1} titulo="Datos generales">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FormSelect label="Almacén" value={almacen} onChange={(e) => setAlmacen(e.target.value)}>
            {ALMACENES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </FormSelect>
          <FormInput label="Ítem" value={item} onChange={(e) => setItem(e.target.value)} />
          <FormInput label="Lote" value={lote} onChange={(e) => setLote(e.target.value)} hint="Cuando corresponda" />
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={2} titulo="Conteo y diferencia">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormInput
            label="Saldo del sistema"
            type="number"
            value={saldoSistema}
            onChange={(e) => setSaldoSistema(e.target.value)}
          />
          <FormInput
            label="Cantidad física"
            type="number"
            value={cantidadFisica}
            onChange={(e) => setCantidadFisica(e.target.value)}
          />
          <FormInput
            label="Diferencia"
            value={diferencia}
            disabled
            className={diferencia < 0 ? 'text-rojo-pasankalla!' : diferencia > 0 ? 'text-verde-bosque!' : ''}
            hint={diferencia < 0 ? 'Faltante' : diferencia > 0 ? 'Sobrante' : 'Sin diferencia'}
          />
          <FormInput label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <FormTextarea label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <FormInput
          label="Documentos de respaldo"
          value={documentoRespaldo}
          onChange={(e) => setDocumentoRespaldo(e.target.value)}
          hint="Referencia — ingresos, salidas o conteos que sustentan la corrección"
        />
      </SeccionFormulario>

      <SeccionFormulario numero={3} titulo="Doble aprobación" nota="El movimiento de ajuste solo se genera después de ambas aprobaciones.">
        <FirmasResponsables
          responsables={[
            { rol: 'Responsable de Almacén', puesto: 'Aprobación' },
            { rol: 'Gerencia', puesto: 'Aprobación' },
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
