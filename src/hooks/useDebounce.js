import { useEffect, useState } from 'react'

// Devuelve `valor` recién `delayMs` después de que dejó de cambiar — para
// buscadores que le pegan al servidor en cada tipeo: sin esto, cada letra
// dispara un request nuevo (y una carrera entre respuestas fuera de orden).
// Uso típico:
//   const [busqueda, setBusqueda] = useState('')
//   const busquedaDebounced = useDebounce(busqueda, 400)
//   useEffect(() => { servicio.listar({ code: busquedaDebounced }) }, [busquedaDebounced])
export function useDebounce(valor, delayMs = 400) {
  const [debounced, setDebounced] = useState(valor)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), delayMs)
    return () => clearTimeout(timer)
  }, [valor, delayMs])

  return debounced
}
