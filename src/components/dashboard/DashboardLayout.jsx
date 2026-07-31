import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useSitioBase } from '../../hooks/useSitioBase'
import { climaService } from '../../services/climaService'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'

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
    <div className="flex min-h-svh bg-crema-quinua">
      <DashboardSidebar />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <DashboardHeader clima={clima} climaError={climaError} usuario={usuario} />
        <Outlet />
      </div>
    </div>
  )
}
