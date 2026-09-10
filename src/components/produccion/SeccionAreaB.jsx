import { useState } from 'react'
import { Boxes, Scale, Gauge, Package, Recycle, Warehouse } from 'lucide-react'
import PillTabs from '../dashboard/PillTabs.jsx'
import SeccionControlExistencias from './SeccionControlExistencias.jsx'
import ControlVolumenB from './formularios/ControlVolumenB.jsx'
import { filaVacia } from './formularios/volumenBFilas.js'
import IndicadoresAreaB from './IndicadoresAreaB.jsx'
import EnvasadoProductoTerminado from './formularios/EnvasadoProductoTerminado.jsx'
import KardexSubproductos from './formularios/KardexSubproductos.jsx'
import ControlProductoAlmacen from './formularios/ControlProductoAlmacen.jsx'

// Subpestañas de Área B — mismo patrón que SeccionAreaA.jsx (pastillas
// locales, no rutas). Todas son MOCKUP puro por ahora (no hay
// production-area-b en el backend, ver comentario de ControlVolumenB.jsx).
// "Indicadores" es hermana de "Volumen B", no una pestaña más adentro de
// ese formulario — mismo criterio que Área A (Lotes/Volumen A/Indicadores).
const SUBPESTAÑAS_AREA_B = [
  { id: 'control-existencias', nombre: 'Control de Existencias', Icon: Boxes },
  { id: 'volumen-b', nombre: 'Volumen B', Icon: Scale },
  { id: 'indicadores', nombre: 'Indicadores', Icon: Gauge },
  { id: 'envasado', nombre: 'Envasado', Icon: Package },
  { id: 'subproductos', nombre: 'Subproductos', Icon: Recycle },
  { id: 'almacen-pt', nombre: 'Almacén PT', Icon: Warehouse },
]

// Pestaña "Área B" de Producción (routeada, ver PanelProduccionAreaB.jsx) —
// hermana de "Área A" (config/gruposMaestros.js). Sus subpestañas viven acá
// adentro como pastillas locales, no como pestañas de nivel de menú
// (pedido explícito).
export default function SeccionAreaB() {
  const [subPestaña, setSubPestaña] = useState('control-existencias')
  // Filas de Volumen B levantadas hasta acá (no viven en ControlVolumenB.jsx)
  // para que "Indicadores" pueda leer los mismos totales del turno sin
  // duplicar el registro — ver volumenBFilas.js.
  const [filasVolumenB, setFilasVolumenB] = useState(() => [filaVacia()])

  return (
    <div className="flex flex-col gap-4">
      <PillTabs pestañas={SUBPESTAÑAS_AREA_B} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'control-existencias' && <SeccionControlExistencias />}
      {subPestaña === 'volumen-b' && <ControlVolumenB filas={filasVolumenB} setFilas={setFilasVolumenB} />}
      {subPestaña === 'indicadores' && <IndicadoresAreaB filas={filasVolumenB} />}
      {subPestaña === 'envasado' && <EnvasadoProductoTerminado />}
      {subPestaña === 'subproductos' && <KardexSubproductos />}
      {subPestaña === 'almacen-pt' && <ControlProductoAlmacen />}
    </div>
  )
}
