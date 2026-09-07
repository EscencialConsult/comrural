import { useState } from 'react'
import { Boxes, Scale } from 'lucide-react'
import PillTabs from '../dashboard/PillTabs.jsx'
import SeccionControlExistencias from './SeccionControlExistencias.jsx'
import ControlVolumenB from './formularios/ControlVolumenB.jsx'

// Subpestañas de Área B — mismo patrón que SeccionAreaA.jsx (pastillas
// locales, no rutas). "Volumen B" (P-PRO-01/R-25) es MOCKUP puro por ahora
// — ver ControlVolumenB.jsx — hasta que se defina el backend de Área B,
// igual que "Volumen A" es la contraparte real de Área A.
const SUBPESTAÑAS_AREA_B = [
  { id: 'control-existencias', nombre: 'Control de Existencias', Icon: Boxes },
  { id: 'volumen-b', nombre: 'Volumen B', Icon: Scale },
]

// Pestaña "Área B" de Producción (routeada, ver PanelProduccionAreaB.jsx) —
// hermana de "Área A" (config/gruposMaestros.js). Sus subpestañas viven acá
// adentro como pastillas locales, no como pestañas de nivel de menú
// (pedido explícito).
export default function SeccionAreaB() {
  const [subPestaña, setSubPestaña] = useState('control-existencias')

  return (
    <div className="flex flex-col gap-4">
      <PillTabs pestañas={SUBPESTAÑAS_AREA_B} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'control-existencias' && <SeccionControlExistencias />}
      {subPestaña === 'volumen-b' && <ControlVolumenB />}
    </div>
  )
}
