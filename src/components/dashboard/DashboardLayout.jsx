import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSitioBase } from '../../hooks/useSitioBase'
import { climaService } from '../../services/climaService'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'
import GrupoTabs from './GrupoTabs'

// Armazón único de sidebar + header para toda la zona autenticada
// (/panel y sus subpáginas). Antes cada página (Panel.jsx, PanelModulo.jsx)
// repetía este armazón a mano y terminaban divergiendo — ej. PanelModulo
// nunca pedía el clima, así que el header se veía distinto según la
// página. Con esto el formato queda realmente constante: se arma acá una
// sola vez (ver App.jsx, ruta layout) y cada página solo pone su propio
// contenido dentro de <Outlet />.
export default function DashboardLayout() {
  const { usuario } = useSitioBase()
  const [clima, setClima] = useState(null)
  const [climaError, setClimaError] = useState(false)
  // Drawer del sidebar en pantallas chicas — vive acá (no en
  // DashboardSidebar) porque tanto el sidebar como el botón que lo abre
  // (en DashboardHeader) lo necesitan.
  const [sidebarAbierto, setSidebarAbierto] = useState(false)
  const { pathname } = useLocation()

  // Al navegar a otro módulo se cierra solo — sin esto, el drawer se
  // quedaba abierto tapando la pantalla después de elegir un ítem del menú.
  useEffect(() => {
    setSidebarAbierto(false)
  }, [pathname])

  useEffect(() => {
    let cancelado = false
    climaService
      .getClimaActual()
      .then((data) => {
        if (!cancelado) setClima(data)
      })
      .catch((err) => {
        console.warn('Clima no disponible:', err.message)
        if (!cancelado) setClimaError(true)
      })
    return () => {
      cancelado = true
    }
  }, [])

  return (
    // h-svh (no min-h-svh) + overflow-hidden: fija todo el layout a la
    // altura del viewport para que el <aside> (h-svh, ver
    // DashboardSidebar.jsx) quede realmente estático. Con min-h-svh el
    // contenedor crecía con el contenido de la derecha y era la página
    // entera la que scrolleaba, arrastrando al sidebar con ella. min-h-0
    // en la columna derecha es necesario para que su overflow-y-auto
    // scrollee de verdad — sin eso, un hijo flex nunca se encoge por
    // debajo de la altura de su propio contenido, así que ignoraría el
    // overflow y volvería a estirar el contenedor padre.
    <div className="flex h-svh overflow-hidden bg-crema-quinua">
      <DashboardSidebar abierto={sidebarAbierto} onCerrar={() => setSidebarAbierto(false)} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto print:overflow-visible">
        <div className="print:hidden">
          <DashboardHeader
            clima={clima}
            climaError={climaError}
            usuario={usuario}
            onAbrirMenu={() => setSidebarAbierto(true)}
          />
          <GrupoTabs />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
