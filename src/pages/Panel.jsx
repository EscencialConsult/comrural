import { useEffect, useState } from 'react'
import { panelService } from '../services/panelService'
import HealthScoreCard from '../components/dashboard/HealthScoreCard'
import TotalAreaCard from '../components/dashboard/TotalAreaCard'
import CropsCard from '../components/dashboard/CropsCard'
import LoteDestacadoCard from '../components/dashboard/LoteDestacadoCard'
import SoilAnalysisCard from '../components/dashboard/SoilAnalysisCard'
import TasksCard from '../components/dashboard/TasksCard'
import GrowthChartCard from '../components/dashboard/GrowthChartCard'
import DistributionChartCard from '../components/dashboard/DistributionChartCard'

// Dashboard genérico — clon de la referencia visual que pasó Facundo,
// recoloreado 100% a paleta COMRURAL (ver decisión en proyecto.md) y con
// el nav real de 8 módulos en vez del nav genérico de la referencia. Es
// el MISMO dashboard para los 8 roles de prueba por ahora — lo único que
// va a variar por rol, más adelante, es qué ítems del sidebar están
// habilitados (ver DashboardSidebar.jsx), no este layout. El sidebar y
// el header viven en DashboardLayout.jsx (ruta padre, ver App.jsx) — acá
// solo va el contenido propio de /panel.
export default function Panel() {
  const [resumen, setResumen] = useState(null)

  useEffect(() => {
    let cancelado = false
    panelService.getResumen().then((data) => {
      if (!cancelado) setResumen(data)
    })
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <main className="flex-1 p-6">
      {!resumen ? (
        <p className="text-marron-cafe/60">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <HealthScoreCard salud={resumen.saludGeneral} />
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <TotalAreaCard areaTotal={resumen.areaTotal} />
                <CropsCard lotesPorVariedad={resumen.lotesPorVariedad} />
              </div>
              <LoteDestacadoCard lote={resumen.loteDestacado} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <SoilAnalysisCard analisisSuelo={resumen.analisisSuelo} />
            <TasksCard tareas={resumen.tareas} />
            <GrowthChartCard crecimiento={resumen.crecimiento} />
            <DistributionChartCard distribucion={resumen.distribucion} />
          </div>
        </div>
      )}
    </main>
  )
}
