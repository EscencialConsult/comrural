import { useEffect, useState } from 'react'
import { servicioService } from '../services/servicioService'
import { authService } from '../services/authService'

// Usuario (de la sesión real de authService) + versión de plataforma —
// los necesita el nav y el footer de TODAS las páginas, así que se
// centraliza acá en vez de repetir el mismo fetch en cada page.
export function useSitioBase() {
  const [usuario] = useState(() => authService.getSesionActual())
  const [plataforma, setPlataforma] = useState(null)

  useEffect(() => {
    let cancelado = false

    servicioService.getPlataforma().then((plataformaData) => {
      if (!cancelado) setPlataforma(plataformaData)
    })

    return () => {
      cancelado = true
    }
  }, [])

  return { usuario, plataforma }
}
