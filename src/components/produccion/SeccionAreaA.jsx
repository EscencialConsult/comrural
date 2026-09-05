import { useState } from 'react'
import { Layers, Scale, Gauge } from 'lucide-react'
import PillTabs from '../dashboard/PillTabs.jsx'
import SeccionLotesProduccion from './SeccionLotesProduccion.jsx'
import ControlVolumenA from './formularios/ControlVolumenA.jsx'
import IndicadoresProduccion from './IndicadoresProduccion.jsx'

// Subpestañas de Área A — "Lotes" es el punto de entrada (qué materia prima
// ya está lista para arrancar). "Nota de Entrega MP" se sacó (pedido
// explícito): el backend (production-area-a) no modela esa entidad como
// algo aparte, el intake (usedBags/usedKg) es parte de la misma fila que
// "Volumen A" — ver comrural_erp_backend/docs/production-area-a.md §1.
// "Temperatura" (antes su propia pestaña, ControlTemperaturaHumedad.jsx) se
// fusionó dentro de "Volumen A" — pedido explícito de unificar en una sola
// pestaña; el backend ya modelaba el cierre de turno (avgDryer1TempC/
// avgDryer2TempC) como una llamada aparte sobre la MISMA fila, así que la
// fusión no tocó nada del backend. "Consulta externa" (planilla de órdenes
// de compra de Logística) también se sacó — pedido explícito, no había
// módulo real de órdenes de compra detrás y no estaba planeado agregarlo.
const SUBPESTAÑAS_AREA_A = [
  { id: 'lotes', nombre: 'Lotes', Icon: Layers },
  { id: 'volumen-a', nombre: 'Volumen A', Icon: Scale },
  { id: 'indicadores', nombre: 'Indicadores', Icon: Gauge },
]

// Pestaña "Área A" de Producción (routeada, ver PanelProduccionAreaA.jsx) —
// recepción de materia prima y secado. Subpestañas locales (PillTabs) en
// vez del catálogo de tarjetas de antes: mismo patrón que SeccionPendientes.jsx
// (Laboratorio), donde las sub-vistas de una misma área conviven bajo una
// fila de pastillas propia en vez de "abrir"/"volver" a pantalla completa.
export default function SeccionAreaA() {
  const [subPestaña, setSubPestaña] = useState('lotes')
  // Lote elegido en "Lotes" con "Iniciar producción" — salta a "Volumen A"
  // (primer paso real contra el backend, crea la entrada) con ese lote ya
  // precargado. El cierre de turno (temperatura/humedad) vive ahora dentro
  // de la misma pestaña, más abajo en el historial.
  const [loteParaIniciar, setLoteParaIniciar] = useState(null)

  const alIniciarProduccion = (loteId) => {
    setLoteParaIniciar(loteId)
    setSubPestaña('volumen-a')
  }

  return (
    <div className="flex flex-col gap-4">
      <PillTabs pestañas={SUBPESTAÑAS_AREA_A} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'lotes' && <SeccionLotesProduccion onIniciarProduccion={alIniciarProduccion} />}
      {subPestaña === 'volumen-a' && <ControlVolumenA loteInicialId={loteParaIniciar} />}
      {subPestaña === 'indicadores' && <IndicadoresProduccion />}
    </div>
  )
}
