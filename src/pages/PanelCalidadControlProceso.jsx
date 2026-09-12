import { ClipboardCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionControlProceso from '../components/calidad/SeccionControlProceso.jsx'

// Sub-item de "Calidad" en el sidebar (config/gruposMaestros.js), mismo
// mecanismo que "Muestras" (PanelCalidadMuestras.jsx) — permiso propio
// (control-proceso-a:read, agregado en 0035), no lots:read.
export default function PanelCalidadControlProceso() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('control-proceso-a:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Control de Proceso." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ClipboardCheck className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Control de Proceso</h1>
          <p className="text-sm text-marron-cafe/60">Control de calidad sobre el lavado de Área A.</p>
        </div>
      </header>

      <SeccionControlProceso />
    </main>
  )
}
