import { useState } from 'react'
import { Briefcase, MapPin, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import SeccionTrazabilidad from '../components/gerencia/SeccionTrazabilidad.jsx'
import SeccionRecepcionCalidad from '../components/gerencia/SeccionRecepcionCalidad.jsx'

const PESTAÑAS_GERENCIA = [
  { id: 'trazabilidad', nombre: 'Trazabilidad', Icon: MapPin },
  { id: 'recepcion-calidad', nombre: 'Recepción y calidad', Icon: ShieldCheck },
]

// Pantalla "Gerencia" — antes solo trazabilidad de lotes (solo lectura,
// pedido explícito). "Recepción y calidad" se suma como pestaña nueva:
// mismo listado de lotes PM que tenía PanelCompras.jsx, con el botón "Ver
// recepción y calidad" movido acá para que la gestión (registrar
// peso/inspección/aprobación) se haga desde Gerencia en vez de Compras
// (pedido explícito). Ver SeccionTrazabilidad.jsx/SeccionRecepcionCalidad.jsx
// para el detalle de cada pestaña.
export default function PanelGerencia() {
  const { permisos } = useAuth()
  // gerencia:read es el gate real de esta pantalla (mismo permiso que
  // habilita el link "Gerencia" del sidebar, ver mock/data/modulos.json).
  const puedeVer = permisos.has('gerencia:read')

  const [pestaña, setPestaña] = useState('trazabilidad')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Gerencia." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Briefcase className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Gerencia</h1>
          <p className="text-sm text-marron-cafe/60">
            Trazabilidad de lotes y gestión de recepción/calidad, de punta a punta.
          </p>
        </div>
      </header>

      <PillTabs pestañas={PESTAÑAS_GERENCIA} activa={pestaña} onCambiar={setPestaña} />

      {pestaña === 'trazabilidad' && <SeccionTrazabilidad />}

      {pestaña === 'recepcion-calidad' && <SeccionRecepcionCalidad />}
    </main>
  )
}
