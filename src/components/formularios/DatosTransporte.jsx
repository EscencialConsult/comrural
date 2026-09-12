import FormInput from '../FormInput.jsx'
import FirmasResponsables from './FirmasResponsables.jsx'

// Sección "DATOS DEL TRANSPORTE" del papel P-ADM-03/R-02: Vehículo, N. de
// Placa, Color de Vehículo, Conductor, N. de Licencia + la firma del
// conductor, en el mismo bloque — pedido explícito de Facundo: en el
// papel real el espacio de firma va pegado a la derecha de estos datos,
// no al final junto con el resto de responsables, "ya que si esto una vez
// se imprime la persona firma automáticamente desde acá". Reusa
// FirmasResponsables.jsx con un solo recuadro en vez de rearmar el mismo
// espacio punteado — mismo criterio que Control de Documentos con
// CampoObservacionPlegable.jsx: no replicar, reusar.
//
// Solo los 5 campos que pide negocio: Vehículo, N. de placa, Color de
// vehículo, Conductor, N. de licencia. Antes el backend exigía 4 campos más
// por objeto (`identityDocument`/`licenseCategory` del conductor,
// `brand`/`model` del vehículo) que el papel real no pide, y se rellenaban
// con 'N/A' al armar el DTO — se sacaron de driverSchema/vehicleSchema
// (warehouse-receipt.dto.ts), ya no existen ni acá ni del lado del backend.
//
// Por eso todo el bloque es opcional en conjunto (se puede dejar
// completamente vacío) pero, en cuanto se toca un campo visible, hay que
// completar los otros 4 — mismo criterio que ya usaba
// FormularioIniciarRecepcion.jsx.
export default function DatosTransporte({ conductor, vehiculo, onCambiarConductor, onCambiarVehiculo, soloLectura = false }) {
  const campos = [conductor.fullName, conductor.licenseNumber, vehiculo.plate, vehiculo.type, vehiculo.color]
  const completo = campos.every((v) => v.trim() !== '')
  const parcial = !completo && campos.some((v) => v.trim() !== '')

  return (
    <div className="flex flex-col gap-3">
      {parcial && (
        <p className="rounded-xl bg-marron-arcilla/12 px-3 py-2 text-xs font-semibold text-marron-arcilla">
          Si cargás un dato de transporte, hay que completar los 5 — el sistema no acepta un transporte a medio
          llenar. Completá el resto o borrá lo que tipeaste.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <FormInput label="Vehículo" value={vehiculo.type} disabled={soloLectura} onChange={(e) => onCambiarVehiculo('type', e.target.value)} />
        <FormInput label="N. de placa" value={vehiculo.plate} disabled={soloLectura} onChange={(e) => onCambiarVehiculo('plate', e.target.value)} />
        <FormInput label="Color de vehículo" value={vehiculo.color} disabled={soloLectura} onChange={(e) => onCambiarVehiculo('color', e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FormInput label="Conductor" value={conductor.fullName} disabled={soloLectura} onChange={(e) => onCambiarConductor('fullName', e.target.value)} />
        <FormInput
          label="N. de licencia"
          value={conductor.licenseNumber}
          disabled={soloLectura}
          onChange={(e) => onCambiarConductor('licenseNumber', e.target.value)}
        />
      </div>

      <FirmasResponsables
        responsables={[{ rol: 'Firma Conductor', usuario: null, puesto: 'Transporte', firmadoEn: null }]}
        claseGrilla="max-w-xs"
        mostrarNota={false}
      />
    </div>
  )
}
