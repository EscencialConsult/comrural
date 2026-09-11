import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionLiberacionEnvasado from '../components/calidad/SeccionLiberacionEnvasado.jsx'

// Sub-item nuevo de "Calidad" — liberación formal de Calidad sobre producto
// ya envasado (quality-area-b-inspections, real, ver
// comrural_erp_backend/docs/quality-area-b-inspections.md).
export default function PanelCalidadLiberacionEnvasado() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('quality-area-b-inspections:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Calidad." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ShieldCheck className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Liberación de Envasado</h1>
          <p className="text-sm text-marron-cafe/60">Control formal de Calidad sobre producto ya envasado.</p>
        </div>
      </header>

      <SeccionLiberacionEnvasado />
    </main>
  )
}
