import { useState } from 'react'
import { Layers, Truck, Thermometer, Scale, Gauge, Package } from 'lucide-react'
import PillTabs from '../dashboard/PillTabs.jsx'
import SeccionLotesProduccion from './SeccionLotesProduccion.jsx'
import NotaEntregaMateriaPrima from './formularios/NotaEntregaMateriaPrima.jsx'
import ControlTemperaturaHumedad from './formularios/ControlTemperaturaHumedad.jsx'
import ControlVolumenA from './formularios/ControlVolumenA.jsx'
import IndicadoresProduccion from './IndicadoresProduccion.jsx'
import PlanillaOrdenesCompra from './formularios/PlanillaOrdenesCompra.jsx'

// Subpestañas de Área A — "Lotes" es el punto de entrada (qué materia prima
// ya está lista para arrancar). "Nota de Entrega MP" sigue siendo mockup: el
// backend (production-area-a) no modela esa entidad como algo aparte, el
// intake (usedBags/usedKg) es parte de la misma fila que "Volumen A" — ver
// comrural_erp_backend/docs/production-area-a.md §1. El resto SÍ es real:
// "Volumen A" da de alta la entrada del turno, "Temperatura y Humedad" la
// cierra con los promedios de secado (PATCH .../close).
const SUBPESTAÑAS_AREA_A = [
  { id: 'lotes', nombre: 'Lotes', Icon: Layers },
  { id: 'nota-entrega-mp', nombre: 'Nota de Entrega MP', Icon: Truck },
  { id: 'volumen-a', nombre: 'Volumen A', Icon: Scale },
  { id: 'temperatura-humedad', nombre: 'Temperatura y Humedad', Icon: Thermometer },
  { id: 'indicadores', nombre: 'Indicadores', Icon: Gauge },
  { id: 'consulta-externa', nombre: 'Consulta externa', Icon: Package },
]

// Pestaña "Área A" de Producción (routeada, ver PanelProduccionAreaA.jsx) —
// recepción de materia prima y secado. Subpestañas locales (PillTabs) en
// vez del catálogo de tarjetas de antes: mismo patrón que SeccionPendientes.jsx
// (Laboratorio), donde las sub-vistas de una misma área conviven bajo una
// fila de pastillas propia en vez de "abrir"/"volver" a pantalla completa.
export default function SeccionAreaA() {
  const [subPestaña, setSubPestaña] = useState('lotes')
  // Lote elegido en "Lotes" con "Iniciar producción" — salta a "Volumen A"
  // (primer paso real contra el backend) con ese lote ya precargado.
  const [loteParaIniciar, setLoteParaIniciar] = useState(null)

  const alIniciarProduccion = (loteId) => {
    setLoteParaIniciar(loteId)
    setSubPestaña('volumen-a')
  }

  return (
    <div className="flex flex-col gap-4">
      <PillTabs pestañas={SUBPESTAÑAS_AREA_A} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'lotes' && <SeccionLotesProduccion onIniciarProduccion={alIniciarProduccion} />}
      {subPestaña === 'nota-entrega-mp' && <NotaEntregaMateriaPrima />}
      {subPestaña === 'volumen-a' && <ControlVolumenA loteInicialId={loteParaIniciar} />}
      {subPestaña === 'temperatura-humedad' && <ControlTemperaturaHumedad />}
      {subPestaña === 'indicadores' && <IndicadoresProduccion area="A" />}
      {subPestaña === 'consulta-externa' && <PlanillaOrdenesCompra />}
    </div>
  )
}
