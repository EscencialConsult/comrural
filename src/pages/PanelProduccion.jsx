import { Factory } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import DashboardProduccion from '../components/produccion/DashboardProduccion.jsx'

// Producción — Inicio del área: solo dashboard/analytics, sin tabla ni
// acciones. Mismo criterio que Calidad/Almacén (ver PanelCalidad.jsx):
// "Área A" y "Área B" son pantallas propias con submenú en el sidebar (ver
// config/gruposMaestros.js) — las pastillas de arriba (GrupoTabs.jsx) saltan
// entre Producción/Área A/Área B sin volver al menú. Adentro de cada área
// viven sus propias subpestañas locales (PillTabs) con los formularios de
// esa área — ver PanelProduccionAreaA.jsx/PanelProduccionAreaB.jsx.
export default function PanelProduccion() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('produccion:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Producción." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Factory className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Producción</h1>
          <p className="text-sm text-marron-cafe/60">Estado de proceso por lote, turno e indicadores de rendimiento.</p>
        </div>
      </header>

      <DashboardProduccion />
    </main>
  )
}
