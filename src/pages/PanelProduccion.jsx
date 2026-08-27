import { useState } from 'react'
import { Factory, FileText, Gauge, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import DashboardProduccion from '../components/produccion/DashboardProduccion.jsx'
import IndicadoresProduccion from '../components/produccion/IndicadoresProduccion.jsx'
import FormulariosProduccion from '../components/produccion/FormulariosProduccion.jsx'

// Producción — esqueleto del módulo (dashboard ejecutivo + indicadores).
// Formularios por turno, kardex y visores de Calidad/Laboratorio quedan
// para las próximas iteraciones (cada uno con más fidelidad al papel real,
// ver el plan). Mismo patrón de una sola pantalla con pestañas locales que
// PanelLaboratorio.jsx — no hay sub-rutas todavía, así que no hace falta
// sumar un grupo en config/gruposMaestros.js.
const PESTAÑAS_PRODUCCION = [
  { id: 'dashboard', nombre: 'Dashboard', Icon: LayoutDashboard },
  { id: 'indicadores', nombre: 'Indicadores', Icon: Gauge },
  { id: 'formularios', nombre: 'Formularios', Icon: FileText },
]

export default function PanelProduccion() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('produccion:read')

  const [pestaña, setPestaña] = useState('dashboard')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Producción." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Factory className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Producción</h1>
          <p className="text-sm text-marron-cafe/60">Estado de proceso por lote, turno e indicadores de rendimiento.</p>
        </div>
      </header>

      <PillTabs pestañas={PESTAÑAS_PRODUCCION} activa={pestaña} onCambiar={setPestaña} />

      {pestaña === 'dashboard' && <DashboardProduccion />}

      {pestaña === 'indicadores' && <IndicadoresProduccion />}

      {pestaña === 'formularios' && <FormulariosProduccion />}
    </main>
  )
}
