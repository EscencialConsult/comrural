import { useState } from 'react'
import { Layers, Gauge, Truck } from 'lucide-react'
import PillTabs from '../dashboard/PillTabs.jsx'
import SeccionLotesProduccion from './SeccionLotesProduccion.jsx'
import SeccionEntregasPendientes from './SeccionEntregasPendientes.jsx'
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
// "Volumen A" NO está acá a propósito — no es una pestaña de acceso libre.
// Ese formulario solo debe aparecer con un lote ya elegido desde "Lotes"
// ("Iniciar producción"/"Continuar producción"), que es el único lugar que
// valida la R-24 confirmada (ver SeccionLotesProduccion.jsx) antes de dejar
// pasar. Si "Volumen A" fuera una pestaña clicable con su propio buscador
// de lote (como era antes), ese buscador no tenía ningún filtro de R-24 —
// dejaba elegir cualquier lote LIBERADO/LAVADO y recién frenaba en el
// backend al registrar, después de llenar todo el formulario. El estado
// `subPestaña` puede seguir valiendo 'volumen-a' (ver alIniciarProduccion
// abajo), solo que no hay pastilla para llegar ahí por su cuenta.
// "Informes Calidad/Lab" se movió a Área B (SeccionAreaB.jsx) — el dato real
// que la respalda (quality_area_b_inspections) cuelga de una corrida de
// ENVASADO, que recién existe una vez que el lote llegó a Área B. Un lote
// que todavía está acá en Área A (LIBERADO/LAVADO) nunca puede tener esos
// controles, así que no tenía sentido ofrecerlo desde esta pestaña.
const SUBPESTAÑAS_AREA_A = [
  // Primera pestaña (pedido explícito) — "Recepción" y no "Entregas": acá
  // se confirman TODAS las entregas de Almacén pendientes (warehouse-
  // deliveries, real — ver docs/warehouse-deliveries.md), no solo R-24 de
  // lotes de materia prima, también R-20 de envases/insumos sin lote (ver
  // SeccionEntregasPendientes.jsx) — nombre y posición viejos ("Entregas",
  // después de "Lotes") sugerían que era solo un paso de MP. Hoy no es un
  // gate real sobre "Volumen A" (ver comentario de ese archivo).
  { id: 'entregas', nombre: 'Recepción', Icon: Truck },
  { id: 'lotes', nombre: 'Lotes', Icon: Layers },
  { id: 'indicadores', nombre: 'Indicadores', Icon: Gauge },
]

// Pestaña "Área A" de Producción (routeada, ver PanelProduccionAreaA.jsx) —
// recepción de materia prima y secado. Subpestañas locales (PillTabs) en
// vez del catálogo de tarjetas de antes: mismo patrón que SeccionPendientes.jsx
// (Laboratorio), donde las sub-vistas de una misma área conviven bajo una
// fila de pastillas propia en vez de "abrir"/"volver" a pantalla completa.
export default function SeccionAreaA() {
  const [subPestaña, setSubPestaña] = useState('entregas')
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
      {subPestaña === 'entregas' && <SeccionEntregasPendientes />}
      {subPestaña === 'volumen-a' && <ControlVolumenA loteInicialId={loteParaIniciar} />}
      {subPestaña === 'indicadores' && <IndicadoresProduccion />}
    </div>
  )
}
