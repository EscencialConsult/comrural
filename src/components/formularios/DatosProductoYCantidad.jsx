import FormSelect from '../FormSelect.jsx'
import ContadorSacos from './ContadorSacos.jsx'

// Sección "DATOS DEL PRODUCTO" del papel P-ADM-03/R-02: Tipo de envase +
// N. de Bolsas. `receivedPackageCount` es el número que Calidad va a leer
// para saber cuántos sacos inspeccionar — mismo contador con flechas que
// usa el resto del sistema para cantidades de sacos (ver ContadorSacos.jsx).
export default function DatosProductoYCantidad({
  tipoEnvase,
  nBolsas,
  tiposEnvase,
  onCambiarTipoEnvase,
  onCambiarNBolsas,
  soloLectura = false,
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormSelect label="Tipo de envase" value={tipoEnvase} disabled={soloLectura} onChange={(e) => onCambiarTipoEnvase(e.target.value)}>
        {tiposEnvase.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </FormSelect>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-verde-bosque/85">N. de bolsas</span>
        <ContadorSacos valor={nBolsas} onChange={onCambiarNBolsas} disabled={soloLectura} etiquetaAccesible="N. de bolsas recibidas" />
      </div>
    </div>
  )
}
