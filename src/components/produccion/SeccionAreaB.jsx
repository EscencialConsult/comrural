import { useState } from 'react'
import { Boxes, Scale, PackageCheck, ListTree, Warehouse, Gauge } from 'lucide-react'
import PillTabs from '../dashboard/PillTabs.jsx'
import ControlExistenciasB from './formularios/ControlExistenciasB.jsx'
import ControlVolumenB from './formularios/ControlVolumenB.jsx'
import EnvasadoProductoTerminado from './formularios/EnvasadoProductoTerminado.jsx'
import KardexSubproductos from './formularios/KardexSubproductos.jsx'
import ControlProductoAlmacen from './formularios/ControlProductoAlmacen.jsx'
import IndicadoresProduccion from './IndicadoresProduccion.jsx'

const SUBPESTAÑAS_AREA_B = [
  { id: 'existencias-b', nombre: 'Existencias B', Icon: Boxes },
  { id: 'volumen-b', nombre: 'Volumen B', Icon: Scale },
  { id: 'envasado-pt', nombre: 'Envasado', Icon: PackageCheck },
  { id: 'kardex-subproductos', nombre: 'Kardex Subproductos', Icon: ListTree },
  { id: 'producto-almacen', nombre: 'Producto en Almacén', Icon: Warehouse },
  { id: 'indicadores', nombre: 'Indicadores', Icon: Gauge },
]

// Pestaña "Área B" de Producción (routeada, ver PanelProduccionAreaB.jsx) —
// desde la quinua ya lavada hasta el producto envasado en almacén. Mismo
// patrón de subpestañas que SeccionAreaA.jsx.
export default function SeccionAreaB() {
  const [subPestaña, setSubPestaña] = useState('existencias-b')

  return (
    <div className="flex flex-col gap-4">
      <PillTabs pestañas={SUBPESTAÑAS_AREA_B} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'existencias-b' && <ControlExistenciasB />}
      {subPestaña === 'volumen-b' && <ControlVolumenB />}
      {subPestaña === 'envasado-pt' && <EnvasadoProductoTerminado />}
      {subPestaña === 'kardex-subproductos' && <KardexSubproductos />}
      {subPestaña === 'producto-almacen' && <ControlProductoAlmacen />}
      {subPestaña === 'indicadores' && <IndicadoresProduccion area="B" />}
    </div>
  )
}
