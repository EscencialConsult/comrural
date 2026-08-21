import { useState } from 'react'
import { TestTubes, Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import SeccionMuestras from '../components/calidad/SeccionMuestras.jsx'

// Laboratorio — módulo aparte de Calidad en el sidebar (pedido explícito).
// La pestaña Muestras (SeccionMuestras.jsx) es la MISMA que también vive en
// PanelCalidad.jsx — un solo componente reutilizado, no una copia.
const PESTAÑAS_LABORATORIO = [
  { id: 'muestras', nombre: 'Muestras', Icon: TestTubes },
  { id: 'actividad', nombre: 'Actividad', Icon: Activity },
]

export default function PanelLaboratorio() {
  const { permisos } = useAuth()
  // samples:read es el permiso técnico real de este módulo (no calidad:read,
  // que solo gatea visibilidad de sidebar) — mismo criterio que la pestaña
  // "Lotes" de Compras se gatea con lots:read.
  const puedeVer = permisos.has('samples:read')

  const [pestaña, setPestaña] = useState('muestras')

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
          <h1 className="text-2xl font-extrabold text-marron-cafe">Laboratorio</h1>
          <p className="text-sm text-marron-cafe/60">Muestreo y solicitudes de análisis de materia prima.</p>
        </div>
      </header>

      <PillTabs pestañas={PESTAÑAS_LABORATORIO} activa={pestaña} onCambiar={setPestaña} />

      {pestaña === 'muestras' && <SeccionMuestras />}

      {pestaña === 'actividad' && (
        <p className="rounded-3xl bg-marron-tierra/5 px-4 py-10 text-center text-sm text-marron-cafe/50">
          Todavía no hay una bitácora de actividad de Laboratorio en el backend.
        </p>
      )}
    </main>
  )
}
