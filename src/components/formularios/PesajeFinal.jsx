import FormInput from '../FormInput.jsx'

// Sección "UNIDADES DE MEDIDA" del papel P-ADM-03/R-02: Peso Total Bruto y
// Peso Total Neto, cada uno en Kilogramos y en Quintales.
//
// El backend solo habla en kilogramos (`acceptedGrossWeightKg` /
// `acceptedNetWeightKg`) — los quintales son conversión de PRESENTACIÓN,
// nunca se mandan. La conversión (46 kg = 1 quintal) no es un número
// inventado: se verificó contra el propio papel real que mandó Milenka —
// 19319,60 kg ÷ 46 = 419,99 qq, 19279,85 kg ÷ 46 = 419,13 qq, exacto contra
// lo impreso en el formulario de ejemplo.
//
// Solo se puede pesar cuando Calidad ya resolvió (`canRegisterWeight`) o
// cuando el lote se rechazó por completo y no hay nada que pesar
// (`canCompleteWithoutWeight`) — igual que ya hacía FormularioCerrarRecepcion
// en PanelRecepcionLote.jsx. Una vez FINALIZADA, los pesos quedan fijos y de
// solo lectura.
const KG_POR_QUINTAL = 46

const aQuintales = (kg) => (kg != null && kg !== '' ? (Number(kg) / KG_POR_QUINTAL).toFixed(2) : null)

export default function PesajeFinal({ bruto, neto, onCambiarBruto, onCambiarNeto, soloLectura = false }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoPeso etiqueta="Peso total bruto" valor={bruto} onChange={onCambiarBruto} disabled={soloLectura} />
      <CampoPeso etiqueta="Peso total neto" valor={neto} onChange={onCambiarNeto} disabled={soloLectura} />
    </div>
  )
}

function CampoPeso({ etiqueta, valor, onChange, disabled }) {
  const qq = aQuintales(valor)
  return (
    <FormInput
      label={`${etiqueta} (kg)`}
      type="number"
      step="0.001"
      min="0"
      value={valor}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      hint={qq ? `${qq} quintales` : undefined}
    />
  )
}
