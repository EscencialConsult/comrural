import FormInput from '../FormInput.jsx'

// Sección "DATOS DEL TRANSPORTE" del papel P-ADM-03/R-02: Vehículo, N. de
// Placa, Color de Vehículo, Conductor, N. de Licencia + la firma del
// conductor (que acá se une al resto de responsables al pie del
// formulario — ver PanelIngresoMateriaPrima.jsx).
//
// El backend exige 4 campos más que el papel no muestra explícito
// (`identityDocument` y `licenseCategory` del conductor, `brand` y `model`
// del vehículo — confirmado leyendo driverSchema/vehicleSchema completos
// en warehouse-receipt.dto.ts) — se agregan igual porque `transportInfo`
// es todo-o-nada: si se manda, sus 9 campos son obligatorios, no hay forma
// de mandar solo los 5 que trae el papel.
//
// Por eso todo el bloque es opcional en conjunto (se puede dejar
// completamente vacío) pero, en cuanto se toca un campo, hay que completar
// los 9 — mismo criterio que ya usaba FormularioIniciarRecepcion.jsx.
export default function DatosTransporte({ conductor, vehiculo, onCambiarConductor, onCambiarVehiculo, soloLectura = false }) {
  const campos = [
    conductor.fullName,
    conductor.identityDocument,
    conductor.licenseNumber,
    conductor.licenseCategory,
    vehiculo.plate,
    vehiculo.type,
    vehiculo.brand,
    vehiculo.model,
    vehiculo.color,
  ]
  const completo = campos.every((v) => v.trim() !== '')
  const parcial = !completo && campos.some((v) => v.trim() !== '')

  return (
    <div className="flex flex-col gap-3">
      {parcial && (
        <p className="rounded-xl bg-marron-arcilla/12 px-3 py-2 text-xs font-semibold text-marron-arcilla">
          Si cargás un dato de transporte, hay que completar los 9 — el sistema no acepta un transporte a medio
          llenar. Completá el resto o borrá lo que tipeaste.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <FormInput label="Vehículo" value={vehiculo.type} disabled={soloLectura} onChange={(e) => onCambiarVehiculo('type', e.target.value)} />
        <FormInput label="N. de placa" value={vehiculo.plate} disabled={soloLectura} onChange={(e) => onCambiarVehiculo('plate', e.target.value)} />
        <FormInput label="Color de vehículo" value={vehiculo.color} disabled={soloLectura} onChange={(e) => onCambiarVehiculo('color', e.target.value)} />
        <FormInput label="Marca" value={vehiculo.brand} disabled={soloLectura} onChange={(e) => onCambiarVehiculo('brand', e.target.value)} />
        <FormInput label="Modelo" value={vehiculo.model} disabled={soloLectura} onChange={(e) => onCambiarVehiculo('model', e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FormInput label="Conductor" value={conductor.fullName} disabled={soloLectura} onChange={(e) => onCambiarConductor('fullName', e.target.value)} />
        <FormInput
          label="N. de licencia"
          value={conductor.licenseNumber}
          disabled={soloLectura}
          onChange={(e) => onCambiarConductor('licenseNumber', e.target.value)}
        />
        <FormInput
          label="Categoría de licencia"
          value={conductor.licenseCategory}
          disabled={soloLectura}
          onChange={(e) => onCambiarConductor('licenseCategory', e.target.value)}
        />
        <FormInput
          label="N. de documento"
          value={conductor.identityDocument}
          disabled={soloLectura}
          onChange={(e) => onCambiarConductor('identityDocument', e.target.value)}
          hint="No está en el papel, pero el sistema lo exige junto con el resto de datos del conductor."
        />
      </div>
    </div>
  )
}
