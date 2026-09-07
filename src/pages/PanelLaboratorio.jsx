import { TestTubes } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionPendientes from '../components/laboratorio/SeccionPendientes.jsx'

// Laboratorio — módulo aparte de Calidad en el sidebar (pedido explícito).
// Cambio puramente visual (pedido explícito, ver gruposMaestros.js): antes
// esta pantalla tenía las 4 secciones como pastillas locales (PillTabs)
// DENTRO de sí misma. Ahora "Laboratorio" (el padre, esta pantalla) ES
// directamente "Recepción de muestras" — mismo criterio que PanelCompras.jsx
// (su padre es la gestión de lotes en sí, no un Inicio separado) — y las
// otras 3 secciones (Análisis, Actividad, Lote de Despacho) son hermanas
// con ruta propia, ver PanelLaboratorioAnalisis.jsx/Actividad/LoteDespacho.
export default function PanelLaboratorio() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('samples:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Laboratorio." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <TestTubes className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Recepción de muestras</h1>
          <p className="text-sm text-marron-cafe/60">Muestreo y solicitudes de análisis de materia prima.</p>
        </div>
      </header>

      <SeccionPendientes />
    </main>
  )
}
