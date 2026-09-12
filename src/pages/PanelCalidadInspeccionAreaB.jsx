import { FlaskConical } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionInspeccionAreaB from '../components/calidad/SeccionInspeccionAreaB.jsx'

// Sub-item nuevo de "Calidad" en el sidebar (config/gruposMaestros.js),
// mismo permiso que "Inspección" (lots:read) — ver SeccionInspeccionAreaB.jsx
// para el detalle de por qué es mockup.
export default function PanelCalidadInspeccionAreaB() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('lots:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Calidad." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <FlaskConical className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Inspección Área B</h1>
          <p className="text-sm text-marron-cafe/60">Verificación de pureza antes del envasado.</p>
        </div>
      </header>

      <SeccionInspeccionAreaB />
    </main>
  )
}
