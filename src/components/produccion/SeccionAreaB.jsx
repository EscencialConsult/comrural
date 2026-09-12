import { useState } from 'react'
import { Boxes, Gauge, Package, Recycle, Warehouse, FileSearch } from 'lucide-react'
import PillTabs from '../dashboard/PillTabs.jsx'
import SeccionControlExistencias from './SeccionControlExistencias.jsx'
import IndicadoresAreaB from './IndicadoresAreaB.jsx'
import EnvasadoProductoTerminado from './formularios/EnvasadoProductoTerminado.jsx'
import KardexSubproductos from './formularios/KardexSubproductos.jsx'
import ControlProductoAlmacen from './formularios/ControlProductoAlmacen.jsx'
import InformesCalidadLaboratorio from './InformesCalidadLaboratorio.jsx'

// Subpestañas de Área B — mismo patrón que SeccionAreaA.jsx (pastillas
// locales, no rutas). "Control de Existencias" e "Indicadores" ya son
// reales (production-area-b en el backend, ver docs/production-area-b.md).
// "Volumen B" (P-PRO-01/R-25) ya NO es una subpestaña propia — el
// formulario completo vive en ModalRegistrarSalidaAreaB.jsx, que se abre
// desde "Añadir salida" en Control de Existencias. Antes existía además
// como pestaña con su propio listado "lotes con salidas / continuar", lo
// que dejaba dos caminos para registrar la misma salida real y duplicaba lo
// cargado — se eliminó esa pestaña.
// "Envasado" es real (packaging_entries, ver docs/packaging.md) — listado
// con botón "Registrar envasado" (ModalRegistrarEnvasado.jsx) y "Completar"
// para los que quedaron abiertos (ModalCompletarEnvasado.jsx), mismo
// patrón que Control de Existencias. "Subproductos"/"Almacén PT" siguen
// siendo MOCKUP puro: no tienen ninguna tabla propuesta todavía (ver
// Diseno_BD_Produccion_COMRURAL.md §13) — por eso NO se les aplicó el mismo
// patrón de listado+modal: sin backend real detrás, un listado ahí sería
// una lista de datos inventados con un botón que abre un formulario que
// tampoco persiste nada (su `guardar()` solo hace `toast.info(...)`), cero
// valor agregado sobre lo que ya hay.
// "Informes Calidad/Lab" se movió acá desde Área A (SeccionAreaA.jsx) — la
// tabla de Calidad (pureza/impurezas) sale de quality_area_b_inspections,
// que cuelga de una corrida de ENVASADO: no existe hasta que el lote llegó
// a Área B, así que un lote todavía en Área A nunca tiene nada que mostrar
// ahí. Punto 3 del relevamiento (secciones 2.21 y 3).
const SUBPESTAÑAS_AREA_B = [
  { id: 'control-existencias', nombre: 'Control de Existencias', Icon: Boxes },
  { id: 'indicadores', nombre: 'Indicadores', Icon: Gauge },
  { id: 'envasado', nombre: 'Envasado', Icon: Package },
  { id: 'subproductos', nombre: 'Subproductos', Icon: Recycle },
  { id: 'almacen-pt', nombre: 'Almacén PT', Icon: Warehouse },
  { id: 'informes', nombre: 'Informes Calidad/Lab', Icon: FileSearch },
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
      {subPestaña === 'indicadores' && <IndicadoresAreaB />}
      {subPestaña === 'envasado' && <EnvasadoProductoTerminado />}
      {subPestaña === 'subproductos' && <KardexSubproductos />}
      {subPestaña === 'almacen-pt' && <ControlProductoAlmacen />}
      {subPestaña === 'informes' && <InformesCalidadLaboratorio />}
    </div>
  )
}
