import { ListChecks } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionSolicitudes from '../components/laboratorio/SeccionSolicitudes.jsx'

// Hermana de PanelLaboratorio.jsx (ver ese archivo para el porqué del
// cambio de estructura) — antes era la pastilla local "solicitudes".
export default function PanelLaboratorioAnalisis() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('samples:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Laboratorio." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ListChecks className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Análisis</h1>
          <p className="text-sm text-marron-cafe/60">Solicitudes recibidas y su modalidad de procesamiento.</p>
        </div>
      </header>

      <SeccionSolicitudes />
    </main>
  )
}
